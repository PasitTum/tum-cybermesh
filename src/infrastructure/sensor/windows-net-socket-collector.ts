/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Windows Socket Telemetry Collector
 * Collects active TCP/UDP sockets via Windows netstat and maps process information
 */

import { execSync } from 'node:child_process';
import { ISocketCollector } from '../../domain/sensor/ports/socket-collector.port.js';
import { SocketState, SocketTelemetryEntity } from '../../domain/sensor/entities/socket-telemetry.entity.js';

const WIN_STATE_MAP: Record<string, SocketState> = {
  LISTENING: 'LISTEN',
  ESTABLISHED: 'ESTABLISHED',
  SYN_SENT: 'SYN_SENT',
  SYN_RECEIVED: 'SYN_RECV',
  FIN_WAIT_1: 'FIN_WAIT1',
  FIN_WAIT_2: 'FIN_WAIT2',
  TIME_WAIT: 'TIME_WAIT',
  CLOSE_WAIT: 'CLOSE_WAIT',
  LAST_ACK: 'LAST_ACK',
  CLOSED: 'CLOSE',
  CLOSING: 'CLOSING',
};

export class WindowsNetSocketCollector implements ISocketCollector {
  private cachedProcessMap: Map<number, string> = new Map();
  private lastProcessRefreshMs = 0;

  public getPlatform(): 'linux' | 'win32' | 'darwin' | 'unsupported' {
    return 'win32';
  }

  public async isAvailable(): Promise<boolean> {
    return process.platform === 'win32';
  }

  /**
   * Refreshes PID to ProcessName mapping using Windows tasklist.
   */
  public refreshProcessMap(): Map<number, string> {
    const now = Date.now();
    if (this.cachedProcessMap.size > 0 && now - this.lastProcessRefreshMs < 10000) {
      return this.cachedProcessMap;
    }

    const map = new Map<number, string>();
    try {
      const output = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', timeout: 3000 });
      const lines = output.split('\r\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split('","').map((s) => s.replace(/^"|"$/g, ''));
        if (parts.length >= 2) {
          const image = parts[0] ?? 'unknown';
          const pid = parseInt(parts[1] ?? '0', 10);
          if (pid > 0) {
            map.set(pid, image);
          }
        }
      }
      this.cachedProcessMap = map;
      this.lastProcessRefreshMs = now;
    } catch {
      // Fallback if tasklist is restricted
    }
    return this.cachedProcessMap;
  }

  /**
   * Parses standard Windows netstat output.
   */
  public parseNetstatOutput(
    output: string,
    hostId: string,
    tenantId: string,
    processMap?: Map<number, string>
  ): SocketTelemetryEntity[] {
    const results: SocketTelemetryEntity[] = [];
    const lines = output.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith('TCP')) continue;

      const tokens = line.split(/\s+/);
      if (tokens.length < 5) continue;

      const protocol = 'TCP';
      const localStr = tokens[1] ?? '';
      const remoteStr = tokens[2] ?? '';
      const stateStr = (tokens[3] ?? '').toUpperCase();
      const pidStr = tokens[4] ?? '0';

      const localLastColon = localStr.lastIndexOf(':');
      const remoteLastColon = remoteStr.lastIndexOf(':');

      if (localLastColon === -1 || remoteLastColon === -1) continue;

      const localAddress = localStr.substring(0, localLastColon);
      const localPort = parseInt(localStr.substring(localLastColon + 1), 10) || 0;
      const remoteAddress = remoteStr.substring(0, remoteLastColon);
      const remotePort = parseInt(remoteStr.substring(remoteLastColon + 1), 10) || 0;

      const state: SocketState = WIN_STATE_MAP[stateStr] ?? 'UNKNOWN';
      const pid = parseInt(pidStr, 10) || 0;
      const processName = processMap?.get(pid) ?? (pid === 4 ? 'System' : pid === 0 ? 'Idle' : 'unknown');

      const connectionId = `${localAddress}:${localPort}-${remoteAddress}:${remotePort}-${pid}`;

      results.push(
        new SocketTelemetryEntity({
          connectionId,
          timestamp: new Date().toISOString(),
          protocol,
          localAddress,
          localPort,
          remoteAddress,
          remotePort,
          state,
          pid,
          processName,
          hostId,
          tenantId,
        })
      );
    }

    return results;
  }

  public async collectSockets(hostId: string, tenantId: string): Promise<SocketTelemetryEntity[]> {
    try {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8', timeout: 5000 });
      const processMap = this.refreshProcessMap();
      return this.parseNetstatOutput(output, hostId, tenantId, processMap);
    } catch {
      return [];
    }
  }
}
