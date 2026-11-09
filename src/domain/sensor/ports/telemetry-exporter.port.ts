/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Domain Port: ITelemetryExporter
 */

import { TelemetryEvent } from '../../telemetry/entities/telemetry-event.entity.js';

export interface TelemetryExportResult {
  readonly success: boolean;
  readonly exportedCount: number;
  readonly failedCount: number;
  readonly latencyMs: number;
  readonly error?: string;
}

export interface ITelemetryExporter {
  exportTelemetry(events: TelemetryEvent[]): Promise<TelemetryExportResult>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
