/**
 * TUM Sovereign CyberMesh — Standalone Sensor Agent
 * Domain Entity: SocketTelemetryEntity
 * Clean Architecture (Zero External Dependencies)
 */

import { TelemetryEvent } from '../../telemetry/entities/telemetry-event.entity.js';
import { EventCategory } from '../../telemetry/value-objects/event-category.vo.js';
import { EventSeverity } from '../../telemetry/value-objects/event-severity.vo.js';

export type SocketProtocol = 'TCP' | 'UDP';

export type SocketState =
  | 'LISTEN'
  | 'ESTABLISHED'
  | 'SYN_SENT'
  | 'SYN_RECV'
  | 'FIN_WAIT1'
  | 'FIN_WAIT2'
  | 'TIME_WAIT'
  | 'CLOSE'
  | 'CLOSE_WAIT'
  | 'LAST_ACK'
  | 'CLOSING'
  | 'UNKNOWN';

export interface SocketTelemetryProps {
  readonly connectionId: string;
  readonly timestamp: string;
  readonly protocol: SocketProtocol;
  readonly localAddress: string;
  readonly localPort: number;
  readonly remoteAddress: string;
  readonly remotePort: number;
  readonly state: SocketState;
  readonly pid: number;
  readonly processName: string;
  readonly processPath?: string;
  readonly commandLine?: string;
  readonly inode?: number;
  readonly hostId: string;
  readonly tenantId: string;
}

export class SocketTelemetryEntity {
  public readonly connectionId: string;
  public readonly timestamp: string;
  public readonly protocol: SocketProtocol;
  public readonly localAddress: string;
  public readonly localPort: number;
  public readonly remoteAddress: string;
  public readonly remotePort: number;
  public readonly state: SocketState;
  public readonly pid: number;
  public readonly processName: string;
  public readonly processPath?: string;
  public readonly commandLine?: string;
  public readonly inode?: number;
  public readonly hostId: string;
  public readonly tenantId: string;

  constructor(props: SocketTelemetryProps) {
    this.connectionId = props.connectionId;
    this.timestamp = props.timestamp;
    this.protocol = props.protocol;
    this.localAddress = props.localAddress;
    this.localPort = props.localPort;
    this.remoteAddress = props.remoteAddress;
    this.remotePort = props.remotePort;
    this.state = props.state;
    this.pid = props.pid;
    this.processName = props.processName;
    this.processPath = props.processPath;
    this.commandLine = props.commandLine;
    this.inode = props.inode;
    this.hostId = props.hostId;
    this.tenantId = props.tenantId;
    Object.freeze(this);
  }

  /**
   * Evaluates if this socket connection exhibits suspicious C2 or reverse shell heuristics.
   */
  public isSuspicious(): { suspicious: boolean; reason?: string; severity: EventSeverity } {
    const knownC2Ports = [4444, 1337, 31337, 6667, 8888, 9001];
    const suspiciousProcesses = ['nc', 'ncat', 'netcat', 'bash', 'sh', 'powershell', 'cmd', 'python', 'perl'];

    // Outbound connection on known reverse shell port
    if (this.state === 'ESTABLISHED' && knownC2Ports.includes(this.remotePort)) {
      return {
        suspicious: true,
        reason: `Connection to known high-risk port ${this.remotePort}`,
        severity: 'CRITICAL',
      };
    }

    // Shell process establishing direct remote socket
    const baseProcess = this.processName.toLowerCase().replace(/\.exe$/, '');
    if (this.state === 'ESTABLISHED' && suspiciousProcesses.includes(baseProcess)) {
      const isLoopback = this.remoteAddress === '127.0.0.1' || this.remoteAddress === '::1';
      if (!isLoopback && this.remotePort !== 0) {
        return {
          suspicious: true,
          reason: `Interactive shell (${this.processName}) initiated external connection to ${this.remoteAddress}:${this.remotePort}`,
          severity: 'CRITICAL',
        };
      }
    }

    // Listening on unusual high ports by unexpected processes
    if (this.state === 'LISTEN' && knownC2Ports.includes(this.localPort)) {
      return {
        suspicious: true,
        reason: `Unusual backdoor listener detected on port ${this.localPort}`,
        severity: 'HIGH',
      };
    }

    return { suspicious: false, severity: 'INFORMATIONAL' };
  }

  /**
   * Converts the raw socket telemetry record into a standardized TUM CyberMesh TelemetryEvent.
   */
  public toTelemetryEvent(): TelemetryEvent {
    const threatCheck = this.isSuspicious();
    const category: EventCategory = 'SOCKET_CONNECT';

    let action = `SOCKET_${this.state}: ${this.protocol} ${this.localAddress}:${this.localPort} -> ${this.remoteAddress}:${this.remotePort}`;
    if (threatCheck.suspicious) {
      action = `SUSPICIOUS_SOCKET_ALERT: ${threatCheck.reason}`;
    }

    return new TelemetryEvent({
      id: `sock-${this.connectionId}`,
      timestamp: this.timestamp,
      sourceHost: this.hostId,
      tenantId: this.tenantId,
      category,
      severity: threatCheck.severity,
      action,
      metadata: {
        protocol: this.protocol,
        localAddress: this.localAddress,
        localPort: this.localPort,
        remoteAddress: this.remoteAddress,
        remotePort: this.remotePort,
        state: this.state,
        pid: this.pid,
        processName: this.processName,
        processPath: this.processPath,
        commandLine: this.commandLine,
        inode: this.inode,
        isSuspicious: threatCheck.suspicious,
        suspiciousReason: threatCheck.reason,
      },
    });
  }
}
