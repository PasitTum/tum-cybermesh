import { TelemetryQueryInput, TelemetryQuerySchema } from '../contracts/telemetry.schema.js';
import { LakehouseQueryResult } from '../dtos/ingest-telemetry.dto.js';
import { ITelemetryLakehouseRepository } from '../../../domain/telemetry/repositories/telemetry-lakehouse.repository.js';

export class QueryTelemetryLakehouseUseCase {
  constructor(private readonly lakehouseRepo: ITelemetryLakehouseRepository) {}

  public async execute(rawInput: TelemetryQueryInput): Promise<LakehouseQueryResult> {
    const startTime = performance.now();
    const validated = TelemetryQuerySchema.parse(rawInput);

    const events = await this.lakehouseRepo.query(validated);
    const duration = performance.now() - startTime;

    return {
      events,
      totalMatches: events.length,
      returnedCount: events.length,
      queryExecutionMs: Math.round(duration * 100) / 100,
    };
  }
}
