import { EventSeverity } from '../value-objects/event-severity.vo.js';
import { EventCategory } from '../value-objects/event-category.vo.js';

export interface TelemetryMetadata {
  pid?: number;
  ppid?: number;
  processName?: string;
  sourceIp?: string;
  destinationIp?: string;
  port?: number;
  syscall?: string;
  payloadDigest?: string;
  pqcEnvelopeHash?: string;
  [key: string]: unknown;
}

export interface TelemetryEventProps {
  id: string;
  timestamp: string;
  sourceHost: string;
  tenantId: string;
  category: EventCategory;
  severity: EventSeverity;
  action: string;
  metadata: TelemetryMetadata;
}

export class TelemetryEvent {
  public readonly id: string;
  public readonly timestamp: string;
  public readonly sourceHost: string;
  public readonly tenantId: string;
  public readonly category: EventCategory;
  public readonly severity: EventSeverity;
  public readonly action: string;
  public readonly metadata: TelemetryMetadata;

  constructor(props: TelemetryEventProps) {
    this.id = props.id;
    this.timestamp = props.timestamp;
    this.sourceHost = props.sourceHost;
    this.tenantId = props.tenantId;
    this.category = props.category;
    this.severity = props.severity;
    this.action = props.action;
    this.metadata = Object.freeze({ ...props.metadata });
    Object.freeze(this);
  }

  public isHighRisk(): boolean {
    return this.severity === 'HIGH' || this.severity === 'CRITICAL';
  }

  public toJSON(): TelemetryEventProps {
    return {
      id: this.id,
      timestamp: this.timestamp,
      sourceHost: this.sourceHost,
      tenantId: this.tenantId,
      category: this.category,
      severity: this.severity,
      action: this.action,
      metadata: this.metadata,
    };
  }
}
