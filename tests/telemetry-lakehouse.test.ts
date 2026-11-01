import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PartitionedRingBuffer } from '../src/infrastructure/lakehouse/partitioned-ring-buffer.js';
import { InMemoryTelemetryLakehouse } from '../src/infrastructure/lakehouse/in-memory-telemetry-lakehouse.js';
import { TelemetryEvent } from '../src/domain/telemetry/entities/telemetry-event.entity.js';
import { ProcessTree } from '../src/domain/telemetry/entities/process-tree.entity.js';
import { IngestTelemetryBatchUseCase } from '../src/application/telemetry/use-cases/ingest-telemetry-batch.use-case.js';
import { QueryTelemetryLakehouseUseCase } from '../src/application/telemetry/use-cases/query-telemetry-lakehouse.use-case.js';

describe('PartitionedRingBuffer & Lakehouse Storage', () => {
  it('should maintain FIFO capacity and handle ring buffer overwrites correctly', () => {
    const ring = new PartitionedRingBuffer<number>(3);
    assert.equal(ring.size(), 0);

    assert.equal(ring.push(1), false);
    assert.equal(ring.push(2), false);
    assert.equal(ring.push(3), false);
    assert.equal(ring.size(), 3);
    assert.deepEqual(ring.toArray(), [1, 2, 3]);

    // Overwrite oldest item 1
    const overwritten = ring.push(4);
    assert.equal(overwritten, true);
    assert.equal(ring.size(), 3);
    assert.deepEqual(ring.toArray(), [2, 3, 4]);

    ring.clear();
    assert.equal(ring.size(), 0);
  });

  it('should construct ProcessTree and resolve ancestry and descendants', () => {
    const tree = new ProcessTree([
      { pid: 1, ppid: 0, name: 'systemd', commandLine: '/sbin/init', startTime: '2026-11-01T00:00:00Z', user: 'root' },
      { pid: 100, ppid: 1, name: 'containerd', commandLine: 'containerd', startTime: '2026-11-01T00:01:00Z', user: 'root' },
      { pid: 500, ppid: 100, name: 'app-service', commandLine: 'node server.js', startTime: '2026-11-01T00:02:00Z', user: 'app' },
      { pid: 900, ppid: 500, name: 'sh', commandLine: '/bin/sh', startTime: '2026-11-01T00:03:00Z', user: 'app' },
    ]);

    const ancestry = tree.getAncestry(900);
    assert.equal(ancestry.length, 4);
    assert.equal(ancestry[0].pid, 900);
    assert.equal(ancestry[1].pid, 500);
    assert.equal(ancestry[2].pid, 100);
    assert.equal(ancestry[3].pid, 1);

    const descendants = tree.getDescendants(100);
    assert.equal(descendants.length, 2);
    assert.equal(descendants[0].pid, 500);
    assert.equal(descendants[1].pid, 900);
  });

  it('should ingest and query telemetry events through Clean Architecture use cases', async () => {
    const lakehouse = new InMemoryTelemetryLakehouse(1000);
    const ingestUseCase = new IngestTelemetryBatchUseCase(lakehouse);
    const queryUseCase = new QueryTelemetryLakehouseUseCase(lakehouse);

    const events = [
      {
        id: 'ev-01',
        timestamp: '2026-11-01T12:00:00.000Z',
        sourceHost: 'node-alpha.tum.internal',
        tenantId: 'tenant-finance',
        category: 'KERNEL_SYSCALL' as const,
        severity: 'INFORMATIONAL' as const,
        action: 'SYS_OPEN',
        metadata: { path: '/etc/hosts' },
      },
      {
        id: 'ev-02',
        timestamp: '2026-11-01T12:01:00.000Z',
        sourceHost: 'node-alpha.tum.internal',
        tenantId: 'tenant-finance',
        category: 'SOCKET_CONNECT' as const,
        severity: 'HIGH' as const,
        action: 'SOCKET_CONNECT_FOREIGN',
        metadata: { destinationIp: '203.0.113.5' },
      },
    ];

    const ingestResult = await ingestUseCase.execute({ events });
    assert.equal(ingestResult.accepted, 2);
    assert.equal(ingestResult.rejected, 0);

    const queryResult = await queryUseCase.execute({
      tenantId: 'tenant-finance',
      severity: 'HIGH',
      limit: 10,
      offset: 0,
    });

    assert.equal(queryResult.returnedCount, 1);
    assert.equal(queryResult.events[0].id, 'ev-02');
    assert.equal(queryResult.events[0].isHighRisk(), true);

    const stats = await lakehouse.getStats('tenant-finance');
    assert.equal(stats.highEvents, 1);
    assert.equal(stats.totalEvents, 2);
  });
});
