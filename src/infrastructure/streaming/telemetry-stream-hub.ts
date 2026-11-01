import { ServerResponse } from 'node:http';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';
import { EventSeverity, isSeverityHigherOrEqual } from '../../domain/telemetry/value-objects/event-severity.vo.js';

export interface StreamSubscriber {
  id: string;
  response: ServerResponse;
  tenantFilter?: string;
  minSeverity?: EventSeverity;
  categoryFilter?: string;
}

export class TelemetryStreamHub {
  private subscribers: Map<string, StreamSubscriber> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    // Start 15s keep-alive heartbeat for SSE connections
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
    // Unref so it doesn't hold open test runs
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  public register(sub: StreamSubscriber): void {
    // Initialize SSE headers on the client response
    sub.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send connection established event
    sub.response.write(`event: connected\ndata: ${JSON.stringify({ subscriberId: sub.id, timestamp: new Date().toISOString() })}\n\n`);

    this.subscribers.set(sub.id, sub);

    // Auto-remove subscriber when client disconnects
    sub.response.on('close', () => {
      this.unregister(sub.id);
    });
  }

  public unregister(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  public broadcast(event: TelemetryEvent): number {
    let sentCount = 0;
    const payload = JSON.stringify(event.toJSON());

    for (const [id, sub] of this.subscribers.entries()) {
      if (sub.tenantFilter && sub.tenantFilter !== event.tenantId) {
        continue;
      }

      if (sub.minSeverity && !isSeverityHigherOrEqual(event.severity, sub.minSeverity)) {
        continue;
      }

      if (sub.categoryFilter && sub.categoryFilter !== event.category) {
        continue;
      }

      try {
        sub.response.write(`event: telemetry\ndata: ${payload}\n\n`);
        sentCount++;
      } catch (e) {
        this.unregister(id);
      }
    }

    return sentCount;
  }

  private broadcastHeartbeat(): void {
    const ping = `event: ping\ndata: ${Date.now()}\n\n`;
    for (const [id, sub] of this.subscribers.entries()) {
      try {
        sub.response.write(ping);
      } catch (e) {
        this.unregister(id);
      }
    }
  }

  public getActiveSubscriberCount(): number {
    return this.subscribers.size;
  }

  public dispose(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const sub of this.subscribers.values()) {
      try {
        sub.response.end();
      } catch {}
    }
    this.subscribers.clear();
  }
}
