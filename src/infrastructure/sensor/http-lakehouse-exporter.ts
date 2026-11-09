/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * HTTP Lakehouse Exporter
 * Transports socket telemetry events to the CyberMesh Telemetry Lakehouse
 */

import { ITelemetryExporter, TelemetryExportResult } from '../../domain/sensor/ports/telemetry-exporter.port.js';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';

export interface HttpLakehouseExporterOptions {
  readonly endpointUrl: string; // e.g. "http://localhost:7799/api/telemetry/ingest"
  readonly maxBufferSize?: number;
  readonly timeoutMs?: number;
  readonly authToken?: string;
}

export class HttpLakehouseExporter implements ITelemetryExporter {
  private readonly endpointUrl: string;
  private readonly maxBufferSize: number;
  private readonly timeoutMs: number;
  private readonly authToken?: string;

  private bufferQueue: TelemetryEvent[] = [];
  private totalExported = 0;
  private totalFailed = 0;

  constructor(options: HttpLakehouseExporterOptions) {
    this.endpointUrl = options.endpointUrl.replace(/\/$/, '');
    this.maxBufferSize = options.maxBufferSize ?? 10000;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.authToken = options.authToken;
  }

  public getBufferedCount(): number {
    return this.bufferQueue.length;
  }

  public getTotalExported(): number {
    return this.totalExported;
  }

  public getTotalFailed(): number {
    return this.totalFailed;
  }

  public async exportTelemetry(events: TelemetryEvent[]): Promise<TelemetryExportResult> {
    if (events.length === 0 && this.bufferQueue.length === 0) {
      return { success: true, exportedCount: 0, failedCount: 0, latencyMs: 0 };
    }

    // Add new events to buffer queue
    for (const ev of events) {
      if (this.bufferQueue.length < this.maxBufferSize) {
        this.bufferQueue.push(ev);
      }
    }

    const start = performance.now();
    const batchToSend = this.bufferQueue.slice(0, 500);

    const payload = {
      events: batchToSend.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        sourceHost: e.sourceHost,
        tenantId: e.tenantId,
        category: e.category,
        severity: e.severity,
        action: e.action,
        metadata: e.metadata,
      })),
    };

    const targetUrl = this.endpointUrl.endsWith('/api/telemetry/ingest')
      ? this.endpointUrl
      : `${this.endpointUrl}/api/telemetry/ingest`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        // Remove successfully sent items from buffer
        this.bufferQueue.splice(0, batchToSend.length);
        this.totalExported += batchToSend.length;
        const latencyMs = Math.round(performance.now() - start);

        return {
          success: true,
          exportedCount: batchToSend.length,
          failedCount: 0,
          latencyMs,
        };
      } else {
        const errorText = await response.text();
        this.totalFailed += batchToSend.length;
        return {
          success: false,
          exportedCount: 0,
          failedCount: batchToSend.length,
          latencyMs: Math.round(performance.now() - start),
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.totalFailed += batchToSend.length;
      return {
        success: false,
        exportedCount: 0,
        failedCount: batchToSend.length,
        latencyMs: Math.round(performance.now() - start),
        error: errorMsg,
      };
    }
  }

  public async flush(): Promise<void> {
    while (this.bufferQueue.length > 0) {
      const res = await this.exportTelemetry([]);
      if (!res.success) break;
    }
  }

  public async close(): Promise<void> {
    await this.flush();
  }
}
