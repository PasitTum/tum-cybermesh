import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BuildThreatLineageUseCase } from '../src/application/hunting/use-cases/build-threat-lineage.use-case.js';
import { HuntAnomalousLineageUseCase } from '../src/application/hunting/use-cases/hunt-anomalous-lineage.use-case.js';
import { TelemetryEvent } from '../src/domain/telemetry/entities/telemetry-event.entity.js';

describe('Threat Lineage DAG & Anomalous Lineage Hunting', () => {
  it('BuildThreatLineageUseCase should map parent-child processes and socket connections', () => {
    const builder = new BuildThreatLineageUseCase();

    const events = [
      new TelemetryEvent({
        id: 'ev-init',
        timestamp: '2026-11-01T12:00:00Z',
        sourceHost: 'k8s-pod-1',
        tenantId: 'tum-corp',
        category: 'PROCESS_EXECUTION',
        severity: 'INFORMATIONAL',
        action: 'EXEC',
        metadata: { pid: 1, ppid: 0, processName: 'systemd' },
      }),
      new TelemetryEvent({
        id: 'ev-web',
        timestamp: '2026-11-01T12:01:00Z',
        sourceHost: 'k8s-pod-1',
        tenantId: 'tum-corp',
        category: 'PROCESS_EXECUTION',
        severity: 'INFORMATIONAL',
        action: 'EXEC',
        metadata: { pid: 50, ppid: 1, processName: 'nginx' },
      }),
      new TelemetryEvent({
        id: 'ev-shell',
        timestamp: '2026-11-01T12:02:00Z',
        sourceHost: 'k8s-pod-1',
        tenantId: 'tum-corp',
        category: 'PROCESS_EXECUTION',
        severity: 'HIGH',
        action: 'EXEC',
        metadata: { pid: 500, ppid: 50, processName: 'bash' },
      }),
      new TelemetryEvent({
        id: 'ev-sock',
        timestamp: '2026-11-01T12:03:00Z',
        sourceHost: 'k8s-pod-1',
        tenantId: 'tum-corp',
        category: 'SOCKET_CONNECT',
        severity: 'CRITICAL',
        action: 'CONNECT',
        metadata: { pid: 500, destinationIp: '198.51.100.99' },
      }),
    ];

    const graph = builder.execute(events);
    assert.ok(graph.getAllNodes().length >= 4);
    assert.ok(graph.getAllEdges().length >= 3);

    // Test DAG root cause resolution
    const roots = graph.findRootCause('sock-198.51.100.99');
    assert.ok(roots.some((r) => r.id === 'proc-1' || r.id === 'proc-50'));

    // Test DAG blast radius
    const blast = graph.findBlastRadius('proc-50');
    assert.ok(blast.some((b) => b.id === 'proc-500'));
    assert.ok(blast.some((b) => b.id === 'sock-198.51.100.99'));
  });

  it('HuntAnomalousLineageUseCase should detect dual-use Living-off-the-Land network execution', () => {
    const builder = new BuildThreatLineageUseCase();
    const hunter = new HuntAnomalousLineageUseCase();

    const events = [
      new TelemetryEvent({
        id: 'ev-nc',
        timestamp: '2026-11-01T12:05:00Z',
        sourceHost: 'worker-node-4',
        tenantId: 'tum-corp',
        category: 'PROCESS_EXECUTION',
        severity: 'CRITICAL',
        action: 'SPAWN',
        metadata: { pid: 8810, ppid: 100, processName: 'nc' },
      }),
      new TelemetryEvent({
        id: 'ev-nc-sock',
        timestamp: '2026-11-01T12:06:00Z',
        sourceHost: 'worker-node-4',
        tenantId: 'tum-corp',
        category: 'SOCKET_CONNECT',
        severity: 'CRITICAL',
        action: 'CONNECT',
        metadata: { pid: 8810, destinationIp: '203.0.113.88' },
      }),
    ];

    const graph = builder.execute(events);
    const findings = hunter.execute(graph);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'LIVING_OFF_THE_LAND');
    assert.equal(findings[0].severity, 'HIGH');
    assert.ok(findings[0].summary.includes('nc established external socket'));
  });
});
