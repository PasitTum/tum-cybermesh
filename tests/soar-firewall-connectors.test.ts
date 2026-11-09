import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FortinetFirewallConnector } from '../src/infrastructure/soar/connectors/fortinet-firewall.connector.js';
import { PaloAltoFirewallConnector } from '../src/infrastructure/soar/connectors/palo-alto-firewall.connector.js';
import { FirewallOrchestratorService } from '../src/infrastructure/soar/connectors/firewall-orchestrator.service.js';
import { InMemoryContainmentExecutor } from '../src/infrastructure/containment/in-memory-containment-executor.js';

describe('SOAR Multi-Vendor Firewall Connectors (Fortinet & Palo Alto)', () => {
  it('FortinetFirewallConnector: creates address object, adds to group, and tests health', async () => {
    const recordedRequests: Array<{ url: string; method: string; headers: Record<string, string>; body?: unknown }> = [];

    const mockFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      recordedRequests.push({
        url: urlStr,
        method: init?.method ?? 'GET',
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });

      if (urlStr.includes('/api/v2/monitor/system/status')) {
        return new Response(JSON.stringify({ version: 'v7.4.2', hostname: 'FGT-HQ-Core' }), { status: 200 });
      }

      return new Response(JSON.stringify({ status: 'success', http_status: 200 }), { status: 200 });
    }) as typeof fetch;

    const fortinet = new FortinetFirewallConnector({
      name: 'FortiGate-Core-01',
      baseUrl: 'https://fortigate.tum.internal:8443',
      apiToken: 'tum_sec_fgt_token_xyz',
      addressGroup: 'TUM_ACTIVE_BLOCK',
      customFetch: mockFetch,
    });

    assert.equal(fortinet.getVendor(), 'FORTINET');
    assert.equal(fortinet.getName(), 'FortiGate-Core-01');

    // Test Health
    const health = await fortinet.testConnection();
    assert.equal(health.healthy, true);
    assert.equal(health.vendor, 'FORTINET');
    assert.equal(health.version, 'v7.4.2');

    // Test Block IP
    const blockRes = await fortinet.blockIp({
      ip: '198.51.100.89',
      reason: 'Reverse shell detected from C2',
      incidentId: 'INC-2026-001',
      timeoutSeconds: 3600,
    });

    assert.equal(blockRes.success, true);
    assert.equal(blockRes.vendor, 'FORTINET');
    assert.equal(blockRes.targetIp, '198.51.100.89');
    assert.equal(blockRes.actionTaken, 'ADDED_TO_GROUP');

    // Verify requests were made
    assert.ok(recordedRequests.some((r) => r.url.includes('/cmdb/firewall/address') && r.method === 'POST'));
    assert.ok(recordedRequests.some((r) => r.url.includes('/cmdb/firewall/addrgrp/TUM_ACTIVE_BLOCK/member') && r.method === 'POST'));
    assert.ok(recordedRequests.some((r) => r.url.includes('/monitor/firewall/banned/add') && r.method === 'POST'));

    // Test Unblock IP
    const unblockRes = await fortinet.unblockIp('198.51.100.89');
    assert.equal(unblockRes.success, true);
    assert.equal(unblockRes.actionTaken, 'REMOVED_FROM_BLOCKLIST');
  });

  it('PaloAltoFirewallConnector: registers IP to Dynamic Address Group via XML User-ID API', async () => {
    const recordedPanRequests: Array<{ url: string; method: string; headers: Record<string, string>; body?: string }> = [];

    const mockPanFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      recordedPanRequests.push({
        url: urlStr,
        method: init?.method ?? 'GET',
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body as string,
      });

      if (init?.body && String(init.body).includes('show')) {
        return new Response('<response status="success"><result><system><sw-version>10.2.4</sw-version><hostname>PA-Perimeter-01</hostname></system></result></response>', { status: 200 });
      }

      return new Response('<response status="success"><result><msg>User-ID update succeeded</msg></result></response>', { status: 200 });
    }) as typeof fetch;

    const paloAlto = new PaloAltoFirewallConnector({
      name: 'PA-Perimeter-Edge',
      baseUrl: 'https://paloalto.tum.internal',
      apiKey: 'LUFRPT14YWJjZGVmZw==',
      dagTag: 'TUM-SOAR-BLOCK',
      customFetch: mockPanFetch,
    });

    assert.equal(paloAlto.getVendor(), 'PALO_ALTO');

    // Test Health
    const health = await paloAlto.testConnection();
    assert.equal(health.healthy, true);
    assert.equal(health.version, 'PAN-OS 10.2.4');
    assert.equal(health.hostname, 'PA-Perimeter-01');

    // Test Block IP
    const blockRes = await paloAlto.blockIp({
      ip: '203.0.113.50',
      reason: 'SQL injection scan flood',
      timeoutSeconds: 7200,
    });

    assert.equal(blockRes.success, true);
    assert.equal(blockRes.vendor, 'PALO_ALTO');
    assert.equal(blockRes.actionTaken, 'DAG_REGISTERED');

    // Verify XML payload contains register tag
    const postReq = recordedPanRequests.find((r) => r.body?.includes('user-id'));
    assert.ok(postReq);
    assert.equal(postReq.headers['X-PAN-KEY'], 'LUFRPT14YWJjZGVmZw==');
    assert.ok(postReq.body?.includes('203.0.113.50'));
    assert.ok(postReq.body?.includes('TUM-SOAR-BLOCK'));

    // Test Unblock IP
    const unblockRes = await paloAlto.unblockIp('203.0.113.50');
    assert.equal(unblockRes.success, true);
    assert.equal(unblockRes.actionTaken, 'REMOVED_FROM_BLOCKLIST');
  });

  it('FirewallOrchestratorService: blocks IP concurrently across Fortinet and Palo Alto fleet', async () => {
    const mockSuccessFetch = (async () => {
      return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    }) as typeof fetch;

    const mockPanFetch = (async () => {
      return new Response('<response status="success"><result></result></response>', { status: 200 });
    }) as typeof fetch;

    const fortinet = new FortinetFirewallConnector({
      name: 'FGT-Core',
      baseUrl: 'https://fgt.internal',
      apiToken: 'tok1',
      customFetch: mockSuccessFetch,
    });

    const paloAlto = new PaloAltoFirewallConnector({
      name: 'PA-Edge',
      baseUrl: 'https://pa.internal',
      apiKey: 'key1',
      customFetch: mockPanFetch,
    });

    const orchestrator = new FirewallOrchestratorService([fortinet, paloAlto]);
    assert.equal(orchestrator.getConnectors().length, 2);

    const summary = await orchestrator.blockIpAcrossFleet({
      ip: '198.51.100.99',
      reason: 'Critical C2 detected by Autonomous Tier-2 Analyst',
      incidentId: 'INC-AUTO-999',
    });

    assert.equal(summary.overallSuccess, true);
    assert.equal(summary.totalConnectors, 2);
    assert.equal(summary.successfulBlocks, 2);
    assert.equal(summary.failedBlocks, 0);
    assert.equal(summary.withinSla, true);

    // Test integration with InMemoryContainmentExecutor
    const executor = new InMemoryContainmentExecutor(orchestrator);
    const dropSuccess = await executor.injectFirewallDrop('198.51.100.99');
    assert.equal(dropSuccess, true);
    assert.ok(executor.firewallDropRules.has('198.51.100.99'));
  });
});
