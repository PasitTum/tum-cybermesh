import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';
import { Incident } from '../../../domain/analyst/entities/incident.entity.js';
import { AnalystDecision } from '../../../domain/analyst/entities/analyst-decision.entity.js';
import { ContainmentAction } from '../../../domain/analyst/entities/containment-action.entity.js';

export interface TriageRequest {
  event: TelemetryEvent;
  correlatedContext?: TelemetryEvent[];
}

export interface TriageResponse {
  incident: Incident;
  tier1Decision: AnalystDecision;
  tier2Decision?: AnalystDecision;
  containmentExecuted: boolean;
  containmentDurationMs?: number;
  containmentActions: readonly ContainmentAction[];
}
