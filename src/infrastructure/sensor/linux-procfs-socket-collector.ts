/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Linux eBPF / ProcFS Socket Telemetry Collector
 * Reads and translates /proc/net/tcp, /proc/net/tcp6, and maps socket inodes to PIDs
 */

import { existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { ISocketCollector } from '../../domain/sensor/ports/socket-collector.port.js';
import { SocketState, SocketTelemetryEntity } from '../../domain/sensor/entities/socket-telemetry.entity.js';

const TCP_STATE_MAP: Record<string, SocketState> = {
  '01': 'ESTABLISHED',
  '02': 'SYN_SENT',
  '03': 'SYN_RECV',
  '04': 'FIN_WAIT1',
  '05': 'FIN_WAIT2',
  '06': 'TIME_WAIT',
  '07': 'CLOSE',
  '08': 'CLOSE_WAIT',
  '09': 'LAST_ACK',
  '0A': 'LISTEN',
  '0B': 'CLOSING',
};

export class LinuxProcfsSocketCollector implements ISocketCollector {
  constructor(private readonly procFsRoot: string = '/proc') {}

  public getPlatform(): 'linux' | 'win32' | 'darwin' | 'unsupported' {
    return 'linux';
  }

  public async isAvailable(): Promise<boolean> {
    return existsSync(join(this.procFsRoot, 'net', 'tcp'));
  }

  /**
   * Translates little-endian hex representation to IPv4 address string.
   * e.g. "0100007F" -> "127.0.0.1"
   */
  public static parseHexIpv4(hex: string): string {
    if (!hex || hex.length !== 8) return '0.0.0.0';
    const b1 = parseInt(hex.substring(6, 8), 16);
    const b2 = parseInt(hex.substring(4, 6), 16);
    const b3 = parseInt(hex.substring(2, 4), 16);
    const b4 = parseInt(hex.substring(0, 2), 16);
    return `${b1}.${b2}.${b3}.${b4}`;
  }

  /**
   * Parses hex port to integer.
   * e.g. "0050" -> 80
   */
  public static parseHexPort(hex: string): number {
    return parseInt(hex, 16) || 0;
  }

  /**
   * Scans /proc to build a mapping from socket inode to PID and process name.
   */
  public buildInodeProcessMap(): Map<number, { pid: number; comm: string; cmdline?: string }> {
    const map = new Map<number, { pid: number; comm: string; cmdline?: string }>();
    if (!existsSync(this.procFsRoot)) return map;

    try {
      const entries = readdirSync(this.procFsRoot);
      for (const entry of entries) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = parseInt(entry, 10);
        const fdDir = join(this.procFsRoot, entry, 'fd');

        let comm = 'unknown';
        let cmdline: string | undefined;

        try {
          const commPath = join(this.procFsRoot, entry, 'comm');
          if (existsSync(commPath)) {
            comm = readFileSync(commPath, 'utf8').trim();
          }
          const cmdPath = join(this.procFsRoot, entry, 'cmdline');
          if (existsSync(cmdPath)) {
            cmdline = readFileSync(cmdPath, 'utf8').replace(/\0/g, ' ').trim();
          }
        } catch {
          // Process might have terminated
        }

        try {
          if (!existsSync(fdDir)) continue;
          const fds = readdirSync(fdDir);
          for (const fd of fds) {
            try {
              const link = readlinkSync(join(fdDir, fd));
              const match = link.match(/^socket:\[(\d+)\]$/);
              if (match && match[1]) {
                const inode = parseInt(match[1], 10);
                map.set(inode, { pid, comm, cmdline });
              }
            } catch {
              // Ephemeral fd
            }
          }
        } catch {
          // Inaccessible fd directory
        }
      }
    } catch {
      // Permission or FS access error
    }

    return map;
  }

  /**
   * Parses raw /proc/net/tcp content string into SocketTelemetryEntity records.
   */
  public parseProcNetTcpContent(
    content: string,
    hostId: string,
    tenantId: string,
    inodeMap?: Map<number, { pid: number; comm: string; cmdline?: string }>
  ): SocketTelemetryEntity[] {
    const results: SocketTelemetryEntity[] = [];
    const lines = content.split('\n');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const tokens = line.split(/\s+/);
      if (tokens.length < 10) continue;

      const localAddressToken = tokens[1] ?? '';
      const remAddressToken = tokens[2] ?? '';
      const stateHex = (tokens[3] ?? '07').toUpperCase();
      const inodeStr = tokens[9] ?? '0';

      const [localHexIp, localHexPort] = localAddressToken.split(':');
      const [remHexIp, remHexPort] = remAddressToken.split(':');

      if (!localHexIp || !localHexPort || !remHexIp || !remHexPort) continue;

      const localAddress = LinuxProcfsSocketCollector.parseHexIpv4(localHexIp);
      const localPort = LinuxProcfsSocketCollector.parseHexPort(localHexPort);
      const remoteAddress = LinuxProcfsSocketCollector.parseHexIpv4(remHexIp);
      const remotePort = LinuxProcfsSocketCollector.parseHexPort(remHexPort);
      const state: SocketState = TCP_STATE_MAP[stateHex] ?? 'UNKNOWN';
      const inode = parseInt(inodeStr, 10);

      const procInfo = inodeMap?.get(inode);
      const pid = procInfo?.pid ?? 0;
      const processName = procInfo?.comm ?? (pid === 0 ? 'kernel' : 'unknown');
      const commandLine = procInfo?.cmdline;

      const connectionId = `${localAddress}:${localPort}-${remoteAddress}:${remotePort}-${inode}`;

      results.push(
        new SocketTelemetryEntity({
          connectionId,
          timestamp: new Date().toISOString(),
          protocol: 'TCP',
          localAddress,
          localPort,
          remoteAddress,
          remotePort,
          state,
          pid,
          processName,
          commandLine,
          inode,
          hostId,
          tenantId,
        })
      );
    }

    return results;
  }

  public async collectSockets(hostId: string, tenantId: string): Promise<SocketTelemetryEntity[]> {
    const tcpPath = join(this.procFsRoot, 'net', 'tcp');
    if (!existsSync(tcpPath)) {
      return [];
    }

    const content = readFileSync(tcpPath, 'utf8');
    const inodeMap = this.buildInodeProcessMap();
    return this.parseProcNetTcpContent(content, hostId, tenantId, inodeMap);
  }
}
