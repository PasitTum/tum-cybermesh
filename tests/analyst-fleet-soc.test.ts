import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AutonomousTriageUseCase } from '../src/application/analyst/use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../src/application/analyst/use-cases/autonomous-containment.use-case.js';
import { InMemoryContainmentExecutor } from '../src/infrastructure/containment/in-memory-containment-executor.js';
import { SocAnalystFleetService } from '../src/application/analyst/services/soc-analyst-fleet.service.js';
import { TelemetryEvent } from '../src/domain/telemetry/entities/telemetry-event.entity.js';

describe('Autonomous SOC Analyst Fleet (Tier-1 & Tier-2)', () => {
  it('Tier-1 should suppress benign events and flag malicious reverse shells', () => {
    const triage = new AutonomousTriageUseCase();

    const benignEvent = new TelemetryEvent({
      id: 'ev-benign',
      timestamp: '2026-11-01T12:00:00.000Z',
      sourceHost: 'web-srv-01',
      tenantId: 'tum-main',
      category: 'PROCESS_EXECUTION',
      severity: 'INFORMATIONAL',
      action: 'PROCESS_START',
      metadata: { processName: 'node' },
    });

    const d1 = triage.execute(benignEvent, 'inc-test-1');
    assert.equal(d1.verdict, 'BENIGN');
    assert.equal(d1.containmentActions.length, 0);

    const maliciousEvent = new TelemetryEvent({
      id: 'ev-shell',
      timestamp: '2026-11-01T12:05:00.000Z',
      sourceHost: 'k8s-worker-02',
      tenantId: 'tum-main',
      category: 'SOCKET_CONNECT',
      severity: 'CRITICAL',
      action: 'REVERSE_SHELL: /dev/tcp/198.51.100.22/4444',
      metadata: { processName: 'bash', pid: 7781, destinationIp: '198.51.100.22' },
    });

    const d2 = triage.execute(maliciousEvent, 'inc-test-2');
    assert.equal(d2.verdict, 'MALICIOUS_CONTAINMENT_REQUIRED');
    assert.equal(d2.mitreMapping?.techniqueId, 'T1059.004');
  });

  it('Tier-2 should execute autonomous containment within 30-second SLA (DoD requirement)', async () => {
    const executor = new InMemoryContainmentExecutor();
    const fleet = new SocAnalystFleetService(
      new AutonomousTriageUseCase(),
      new AutonomousContainmentUseCase(executor)
    );

    const threatEvent = new TelemetryEvent({
      id: 'ev-threat-01',
      timestamp: '2026-11-01T12:10:00.000Z',
      sourceHost: 'prod-database-host',
      tenantId: 'tum-sovereign',
      category: 'AUTHENTICATION',
      severity: 'CRITICAL',
      action: 'HONEYTOKEN_ACCESS_DETECTED',
      metadata: {
        pid: 4120,
        sourceIp: '203.0.113.99',
        tokenId: 'canary_jwt_vault_admin',
      },
    });

    const res = await fleet.processEvent({ event: threatEvent });

    assert.equal(res.containmentExecuted, true);
    assert.equal(res.incident.status, 'CONTAINED');
    assert.ok(res.incident.getContainmentDurationMs() !== null);
    // SLA must be < 30,000ms (DoD criterion)
    assert.ok((res.incident.getContainmentDurationMs() ?? 0) < 30000);

    // Verify actions were dispatched to infrastructure ports
    assert.ok(executor.killedProcesses.has(4120));
    assert.ok(executor.isolatedSockets.has('203.0.113.99'));
    assert.ok(executor.firewallDropRules.has('203.0.113.99'));
    assert.ok(executor.quarantinedHosts.has('prod-database-host'));
    assert.ok(executor.revokedHoneytokens.has('canary_jwt_vault_admin'));
  });
});
