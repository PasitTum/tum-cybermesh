import { TelemetryEvent } from '../entities/telemetry-event.entity.js';
import { EventSeverity } from '../value-objects/event-severity.vo.js';
import { EventCategory } from '../value-objects/event-category.vo.js';

export interface TelemetryQueryFilter {
  tenantId?: string;
  sourceHost?: string;
  severity?: EventSeverity;
  category?: EventCategory;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface LakehousePartitionStats {
  tenantId: string;
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  hotTierSize: number;
  warmTierSize: number;
}

export interface ITelemetryLakehouseRepository {
  append(event: TelemetryEvent): Promise<void>;
  appendBatch(events: TelemetryEvent[]): Promise<number>;
  query(filter: TelemetryQueryFilter): Promise<TelemetryEvent[]>;
  getStats(tenantId?: string): Promise<LakehousePartitionStats>;
  purgeOlderThan(isoTimestamp: string): Promise<number>;
}
