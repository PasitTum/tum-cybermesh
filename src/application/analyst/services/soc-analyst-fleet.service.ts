import { AutonomousTriageUseCase } from '../use-cases/autonomous-triage.use-case.js';
import { AutonomousContainmentUseCase } from '../use-cases/autonomous-containment.use-case.js';
import { TriageRequest, TriageResponse } from '../dtos/incident-triage.dto.js';
import { Incident } from '../../../domain/analyst/entities/incident.entity.js';

export class SocAnalystFleetService {
  constructor(
    private readonly triageUseCase: AutonomousTriageUseCase,
    private readonly containmentUseCase: AutonomousContainmentUseCase
  ) {}

  public async processEvent(request: TriageRequest): Promise<TriageResponse> {
    const { event, correlatedContext = [] } = request;
    const incidentId = `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const incident = new Incident({
      id: incidentId,
      title: `Automated Investigation: ${event.action} on ${event.sourceHost}`,
      tenantId: event.tenantId,
      severity: event.severity === 'INFORMATIONAL' ? 'LOW' : event.severity,
      status: 'INVESTIGATING',
      primaryEvent: event,
      correlatedEvents: correlatedContext,
      decisions: [],
      createdAt: new Date().toISOString(),
    });

    // 1. Tier-1 Triage
    const tier1Decision = this.triageUseCase.execute(event, incidentId);
    incident.addDecision(tier1Decision);

    let tier2Decision;
    let containmentExecuted = false;

    // 2. Tier-2 Escalation if SUSPICIOUS or MALICIOUS
    if (tier1Decision.verdict === 'SUSPICIOUS' || tier1Decision.verdict === 'MALICIOUS_CONTAINMENT_REQUIRED') {
      tier2Decision = await this.containmentUseCase.execute(incident, correlatedContext);
      incident.addDecision(tier2Decision);
      containmentExecuted = tier2Decision.containmentActions.length > 0;
    }

    const containmentDurationMs = incident.getContainmentDurationMs() ?? undefined;

    return {
      incident,
      tier1Decision,
      tier2Decision,
      containmentExecuted,
      containmentDurationMs,
      containmentActions: tier2Decision?.containmentActions ?? [],
    };
  }
}
