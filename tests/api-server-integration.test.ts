import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';

import { createCyberMeshServer } from '../src/presentation/web/server.js';

describe('HTTP REST & Web HUD Integration Server', () => {
  let server: any;
  let baseUrl: string;

  before(async () => {
    const cyberMesh = createCyberMeshServer();
    server = cyberMesh.server;
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /api/health should return 200 HEALTHY', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'HEALTHY');
    assert.equal(data.platform, 'TUM Sovereign CyberMesh');
  });

  it('POST /api/telemetry/ingest and GET /api/telemetry/query should store and retrieve events', async () => {
    const ingestRes = await fetch(`${baseUrl}/api/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            id: 'http-ev-01',
            timestamp: new Date().toISOString(),
            sourceHost: 'web-srv-1',
            tenantId: 'tum-corp',
            category: 'KERNEL_SYSCALL',
            severity: 'INFORMATIONAL',
            action: 'SYS_EXECVE',
            metadata: { pid: 310 },
          },
        ],
      }),
    });

    assert.equal(ingestRes.status, 200);
    const ingestData = await ingestRes.json();
    assert.equal(ingestData.accepted, 1);

    const queryRes = await fetch(`${baseUrl}/api/telemetry/query?limit=5`);
    assert.equal(queryRes.status, 200);
    const queryData = await queryRes.json();
    assert.ok(queryData.returnedCount >= 1);
  });

  it('POST /api/soc/triage should trigger autonomous containment', async () => {
    const triageRes = await fetch(`${baseUrl}/api/soc/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: {
          id: 'http-threat-01',
          timestamp: new Date().toISOString(),
          sourceHost: 'isolated-node',
          tenantId: 'tum-corp',
          category: 'SOCKET_CONNECT',
          severity: 'CRITICAL',
          action: 'REVERSE_SHELL: /dev/tcp/10.0.0.1/4444',
          metadata: { pid: 9001, sourceIp: '198.51.100.2' },
        },
      }),
    });

    assert.equal(triageRes.status, 200);
    const data = await triageRes.json();
    assert.equal(data.tier1Decision.verdict, 'MALICIOUS_CONTAINMENT_REQUIRED');
    assert.equal(data.containmentExecuted, true);
    assert.ok(data.containmentActions.length > 0);
  });

  it('PQC sign and verify endpoints should work end-to-end', async () => {
    const signRes = await fetch(`${baseUrl}/api/pqc/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: 'CONFIDENTIAL_DEFENSE_DIRECTIVE_2026',
        algorithm: 'ML-DSA-65',
        tenantId: 'tum-sovereign',
      }),
    });

    assert.equal(signRes.status, 200);
    const envelope = await signRes.json();
    assert.ok(envelope.pqcSignatureHex);

    const verifyRes = await fetch(`${baseUrl}/api/pqc/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: 'CONFIDENTIAL_DEFENSE_DIRECTIVE_2026',
        pqcEnvelopeJson: JSON.stringify(envelope),
      }),
    });

    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.valid, true);
  });

  it('GET /api/pqc/scan should return fleet agility status', async () => {
    const res = await fetch(`${baseUrl}/api/pqc/scan`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalAssetsScanned > 0);
  });

  it('POST /api/honeytoken/generate should return decoy credential', async () => {
    const res = await fetch(`${baseUrl}/api/honeytoken/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenType: 'SOVEREIGN_JWT_TOKEN',
        decoyIdentifier: 'db-trap',
        targetDeploymentLocation: '/etc/tum/db.secret',
        tenantId: 'tum-corp',
      }),
    });

    assert.equal(res.status, 200);
    const token = await res.json();
    assert.equal(token.tokenType, 'SOVEREIGN_JWT_TOKEN');
    assert.ok(token.secretPayload);
  });

  it('GET / should serve Web HUD HTML', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('TUM SOVEREIGN CYBERMESH'));
    assert.ok(html.includes('topologyCanvas'));
  });
});
