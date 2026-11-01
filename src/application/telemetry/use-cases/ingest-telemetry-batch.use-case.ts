import { IngestTelemetryBatchInput, IngestTelemetryBatchSchema } from '../contracts/telemetry.schema.js';
import { IngestTelemetryBatchResult } from '../dtos/ingest-telemetry.dto.js';
import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';
import { ITelemetryLakehouseRepository } from '../../../domain/telemetry/repositories/telemetry-lakehouse.repository.js';

export class IngestTelemetryBatchUseCase {
  constructor(private readonly lakehouseRepo: ITelemetryLakehouseRepository) {}

  public async execute(rawInput: IngestTelemetryBatchInput): Promise<IngestTelemetryBatchResult> {
    const startTime = performance.now();
    const validated = IngestTelemetryBatchSchema.parse(rawInput);

    const domainEvents: TelemetryEvent[] = validated.events.map((dto) => {
      return new TelemetryEvent({
        id: dto.id,
        timestamp: dto.timestamp,
        sourceHost: dto.sourceHost,
        tenantId: dto.tenantId,
        category: dto.category,
        severity: dto.severity,
        action: dto.action,
        metadata: dto.metadata,
      });
    });

    const acceptedCount = await this.lakehouseRepo.appendBatch(domainEvents);
    const stats = await this.lakehouseRepo.getStats();
    const latency = performance.now() - startTime;

    return {
      accepted: acceptedCount,
      rejected: domainEvents.length - acceptedCount,
      batchLatencyMs: Math.round(latency * 100) / 100,
      hotTierBuffered: stats.hotTierSize,
      lakehouseOffset: stats.totalEvents,
    };
  }
}
