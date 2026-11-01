import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';
import {
  ITelemetryLakehouseRepository,
  LakehousePartitionStats,
  TelemetryQueryFilter,
} from '../../domain/telemetry/repositories/telemetry-lakehouse.repository.js';
import { PartitionedRingBuffer } from './partitioned-ring-buffer.js';

export class InMemoryTelemetryLakehouse implements ITelemetryLakehouseRepository {
  private readonly hotTier: PartitionedRingBuffer<TelemetryEvent>;
  private readonly warmTier: Map<string, TelemetryEvent[]> = new Map(); // tenantId -> events
  private totalIngested: number = 0;

  constructor(hotTierCapacity: number = 100000) {
    this.hotTier = new PartitionedRingBuffer<TelemetryEvent>(hotTierCapacity);
  }

  public async append(event: TelemetryEvent): Promise<void> {
    this.hotTier.push(event);

    const partition = this.warmTier.get(event.tenantId) ?? [];
    partition.push(event);
    this.warmTier.set(event.tenantId, partition);

    this.totalIngested++;
  }

  public async appendBatch(events: TelemetryEvent[]): Promise<number> {
    for (const ev of events) {
      await this.append(ev);
    }
    return events.length;
  }

  public async query(filter: TelemetryQueryFilter): Promise<TelemetryEvent[]> {
    let dataset: TelemetryEvent[] = [];

    if (filter.tenantId && this.warmTier.has(filter.tenantId)) {
      dataset = [...(this.warmTier.get(filter.tenantId) ?? [])];
    } else {
      dataset = this.hotTier.toArray();
    }

    const filtered = dataset.filter((ev) => {
      if (filter.sourceHost && ev.sourceHost !== filter.sourceHost) return false;
      if (filter.severity && ev.severity !== filter.severity) return false;
      if (filter.category && ev.category !== filter.category) return false;
      if (filter.startTime && new Date(ev.timestamp).getTime() < new Date(filter.startTime).getTime()) return false;
      if (filter.endTime && new Date(ev.timestamp).getTime() > new Date(filter.endTime).getTime()) return false;
      return true;
    });

    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }

  public async getStats(tenantId?: string): Promise<LakehousePartitionStats> {
    const events = tenantId ? (this.warmTier.get(tenantId) ?? []) : this.hotTier.toArray();

    let criticalCount = 0;
    let highCount = 0;

    for (const ev of events) {
      if (ev.severity === 'CRITICAL') criticalCount++;
      else if (ev.severity === 'HIGH') highCount++;
    }

    return {
      tenantId: tenantId ?? 'all_tenants',
      totalEvents: this.totalIngested,
      criticalEvents: criticalCount,
      highEvents: highCount,
      hotTierSize: this.hotTier.size(),
      warmTierSize: events.length,
    };
  }

  public async purgeOlderThan(isoTimestamp: string): Promise<number> {
    const cutoff = new Date(isoTimestamp).getTime();
    let purged = 0;

    for (const [tenant, list] of this.warmTier.entries()) {
      const remaining = list.filter((ev) => {
        const keep = new Date(ev.timestamp).getTime() >= cutoff;
        if (!keep) purged++;
        return keep;
      });
      this.warmTier.set(tenant, remaining);
    }

    return purged;
  }
}
