import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';

export interface IngestTelemetryBatchResult {
  accepted: number;
  rejected: number;
  batchLatencyMs: number;
  hotTierBuffered: number;
  lakehouseOffset: number;
}

export interface LakehouseQueryResult {
  events: TelemetryEvent[];
  totalMatches: number;
  returnedCount: number;
  queryExecutionMs: number;
}
