import { randomUUID } from 'node:crypto';
import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';
import { EbpfSocketPromptFilter, SocketFilterVerdict } from './socket-filter.js';

export interface RawPacketFrame {
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  payload: string;
  protocol: 'TCP' | 'UDP';
  sourceHost?: string;
  tenantId?: string;
}

export interface SniffedPacketAnalysis {
  verdict: SocketFilterVerdict;
  telemetryEvent: TelemetryEvent;
}

export class KernelPacketSniffer {
  private readonly filter: EbpfSocketPromptFilter;

  constructor(filter?: EbpfSocketPromptFilter) {
    this.filter = filter ?? new EbpfSocketPromptFilter();
  }

  public processPacket(frame: RawPacketFrame): SniffedPacketAnalysis {
    const verdict = this.filter.inspectPayload(frame.payload);
    const isThreat = !verdict.passed;

    const event = new TelemetryEvent({
      id: `ebpf-${Date.now()}-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      sourceHost: frame.sourceHost ?? 'kernel-ebpf-gateway',
      tenantId: frame.tenantId ?? 'tum-internal-default',
      category: 'SOCKET_CONNECT',
      severity: isThreat ? (verdict.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH') : 'INFORMATIONAL',
      action: isThreat ? `EBPF_FILTER_DROP: ${verdict.threatSignature}` : 'SOCKET_FLOW_FORWARD',
      metadata: {
        sourceIp: frame.sourceIp,
        sourcePort: frame.sourcePort,
        destinationIp: frame.destinationIp,
        destinationPort: frame.destinationPort,
        protocol: frame.protocol,
        blocked: isThreat,
        blockedReason: verdict.blockedReason,
        threatSignature: verdict.threatSignature,
      },
    });

    return {
      verdict,
      telemetryEvent: event,
    };
  }
}
