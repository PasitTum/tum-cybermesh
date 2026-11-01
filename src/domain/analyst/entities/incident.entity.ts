import { TelemetryEvent } from '../../telemetry/entities/telemetry-event.entity.js';
import { AnalystDecision } from './analyst-decision.entity.js';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface IncidentProps {
  id: string;
  title: string;
  tenantId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: IncidentStatus;
  primaryEvent: TelemetryEvent;
  correlatedEvents: TelemetryEvent[];
  decisions: AnalystDecision[];
  createdAt: string;
  containedAt?: string;
  resolvedAt?: string;
}

export class Incident {
  public readonly id: string;
  public readonly title: string;
  public readonly tenantId: string;
  public readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  public status: IncidentStatus;
  public readonly primaryEvent: TelemetryEvent;
  public readonly correlatedEvents: TelemetryEvent[];
  public readonly decisions: AnalystDecision[];
  public readonly createdAt: string;
  public containedAt?: string;
  public resolvedAt?: string;

  constructor(props: IncidentProps) {
    this.id = props.id;
    this.title = props.title;
    this.tenantId = props.tenantId;
    this.severity = props.severity;
    this.status = props.status;
    this.primaryEvent = props.primaryEvent;
    this.correlatedEvents = [...props.correlatedEvents];
    this.decisions = [...props.decisions];
    this.createdAt = props.createdAt;
    this.containedAt = props.containedAt;
    this.resolvedAt = props.resolvedAt;
  }

  public addDecision(decision: AnalystDecision): void {
    this.decisions.push(decision);
    if (decision.verdict === 'MALICIOUS_CONTAINMENT_REQUIRED') {
      this.status = 'CONTAINED';
      this.containedAt = new Date().toISOString();
    } else if (decision.verdict === 'BENIGN') {
      this.status = 'FALSE_POSITIVE';
      this.resolvedAt = new Date().toISOString();
    }
  }

  public getContainmentDurationMs(): number | null {
    if (!this.containedAt) return null;
    return new Date(this.containedAt).getTime() - new Date(this.createdAt).getTime();
  }
}
