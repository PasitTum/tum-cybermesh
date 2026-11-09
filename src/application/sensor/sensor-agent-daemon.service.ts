/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Application Service: SensorAgentDaemonService
 */

import { hostname } from 'node:os';
import { ISocketCollector } from '../../domain/sensor/ports/socket-collector.port.js';
import { ITelemetryExporter } from '../../domain/sensor/ports/telemetry-exporter.port.js';
import { SocketTelemetryEntity } from '../../domain/sensor/entities/socket-telemetry.entity.js';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';

export interface SensorAgentConfig {
  readonly hostId?: string;
  readonly tenantId?: string;
  readonly pollIntervalMs?: number;
  readonly heartbeatIntervalMs?: number;
  readonly exportAllSnapshots?: boolean; // if false, only export new/changed/suspicious sockets
}

export interface SensorAgentMetrics {
  readonly uptimeSeconds: number;
  readonly cyclesRun: number;
  readonly totalSocketsSampled: number;
  readonly totalEventsExported: number;
  readonly totalSuspiciousDetected: number;
  readonly isRunning: boolean;
}

export class SensorAgentDaemonService {
  private readonly hostId: string;
  private readonly tenantId: string;
  private readonly pollIntervalMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly exportAllSnapshots: boolean;

  private activeSockets: Map<string, SocketTelemetryEntity> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private cyclesRun: number = 0;
  private totalSocketsSampled: number = 0;
  private totalEventsExported: number = 0;
  private totalSuspiciousDetected: number = 0;
  private isRunning: boolean = false;

  constructor(
    private readonly collector: ISocketCollector,
    private readonly exporter: ITelemetryExporter,
    config?: SensorAgentConfig
  ) {
    this.hostId = config?.hostId ?? hostname();
    this.tenantId = config?.tenantId ?? 'tum-sovereign-tenant';
    this.pollIntervalMs = config?.pollIntervalMs ?? 5000;
    this.heartbeatIntervalMs = config?.heartbeatIntervalMs ?? 30000;
    this.exportAllSnapshots = config?.exportAllSnapshots ?? false;
  }

  public getMetrics(): SensorAgentMetrics {
    const uptimeSeconds = this.isRunning ? Math.round((Date.now() - this.startTime) / 1000) : 0;
    return {
      uptimeSeconds,
      cyclesRun: this.cyclesRun,
      totalSocketsSampled: this.totalSocketsSampled,
      totalEventsExported: this.totalEventsExported,
      totalSuspiciousDetected: this.totalSuspiciousDetected,
      isRunning: this.isRunning,
    };
  }

  /**
   * Executes a single collection and differential comparison pass.
   */
  public async collectAndDispatch(): Promise<{
    sampled: SocketTelemetryEntity[];
    eventsDispatched: TelemetryEvent[];
    suspiciousCount: number;
  }> {
    this.cyclesRun++;
    const currentSockets = await this.collector.collectSockets(this.hostId, this.tenantId);
    this.totalSocketsSampled += currentSockets.length;

    const eventsToExport: TelemetryEvent[] = [];
    const currentMap = new Map<string, SocketTelemetryEntity>();
    let suspiciousCount = 0;

    for (const socket of currentSockets) {
      currentMap.set(socket.connectionId, socket);
      const previous = this.activeSockets.get(socket.connectionId);
      const isSuspicious = socket.isSuspicious().suspicious;

      if (isSuspicious) {
        suspiciousCount++;
        this.totalSuspiciousDetected++;
      }

      // Export if:
      // 1. exportAllSnapshots is enabled
      // 2. Connection is newly appeared
      // 3. State changed (e.g. SYN_SENT -> ESTABLISHED)
      // 4. It is suspicious
      if (this.exportAllSnapshots || !previous || previous.state !== socket.state || isSuspicious) {
        eventsToExport.push(socket.toTelemetryEvent());
      }
    }

    // Check closed connections
    for (const [id, oldSocket] of this.activeSockets.entries()) {
      if (!currentMap.has(id)) {
        eventsToExport.push(
          new TelemetryEvent({
            id: `sock-closed-${id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            sourceHost: this.hostId,
            tenantId: this.tenantId,
            category: 'SOCKET_CONNECT',
            severity: 'INFORMATIONAL',
            action: `SOCKET_CLOSED: ${oldSocket.protocol} ${oldSocket.localAddress}:${oldSocket.localPort} -> ${oldSocket.remoteAddress}:${oldSocket.remotePort}`,
            metadata: {
              connectionId: id,
              closedAt: new Date().toISOString(),
              pid: oldSocket.pid,
              processName: oldSocket.processName,
            },
          })
        );
      }
    }

    this.activeSockets = currentMap;

    if (eventsToExport.length > 0) {
      const exportRes = await this.exporter.exportTelemetry(eventsToExport);
      this.totalEventsExported += exportRes.exportedCount;
    }

    return {
      sampled: currentSockets,
      eventsDispatched: eventsToExport,
      suspiciousCount,
    };
  }

  /**
   * Emits an agent health heartbeat to the Lakehouse.
   */
  public async emitHeartbeat(): Promise<void> {
    const metrics = this.getMetrics();
    const heartbeatEvent = new TelemetryEvent({
      id: `agent-hb-${this.hostId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sourceHost: this.hostId,
      tenantId: this.tenantId,
      category: 'KERNEL_SYSCALL',
      severity: 'INFORMATIONAL',
      action: 'SENSOR_AGENT_HEARTBEAT',
      metadata: {
        platform: this.collector.getPlatform(),
        uptimeSeconds: metrics.uptimeSeconds,
        cyclesRun: metrics.cyclesRun,
        activeSockets: this.activeSockets.size,
        totalEventsExported: metrics.totalEventsExported,
        totalSuspiciousDetected: metrics.totalSuspiciousDetected,
      },
    });

    await this.exporter.exportTelemetry([heartbeatEvent]);
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    // Initial collection immediately
    await this.collectAndDispatch();
    await this.emitHeartbeat();

    this.timer = setInterval(async () => {
      try {
        await this.collectAndDispatch();
      } catch (err) {
        console.error('[SENSOR-AGENT] Error during collection cycle:', err);
      }
    }, this.pollIntervalMs);

    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.emitHeartbeat();
      } catch (err) {
        console.error('[SENSOR-AGENT] Error during heartbeat:', err);
      }
    }, this.heartbeatIntervalMs);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    await this.exporter.flush();
    await this.exporter.close();
  }
}
