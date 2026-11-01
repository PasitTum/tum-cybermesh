import { TelemetryEvent } from '../../../domain/telemetry/entities/telemetry-event.entity.js';
import { AnalystDecision } from '../../../domain/analyst/entities/analyst-decision.entity.js';
import { COMMON_MITRE_MAPPINGS, MitreTechnique } from '../../../domain/analyst/value-objects/mitre-attack.vo.js';

export class AutonomousTriageUseCase {
  public execute(event: TelemetryEvent, incidentId: string): AnalystDecision {
    const startTime = performance.now();
    let verdict: 'BENIGN' | 'SUSPICIOUS' | 'MALICIOUS_CONTAINMENT_REQUIRED' = 'BENIGN';
    let reasoning = 'Routine telemetry operation; standard behavior profile observed.';
    let confidenceScore = 0.95;
    let mitreMapping: MitreTechnique | undefined;

    const actionLower = event.action.toLowerCase();
    const processName = (event.metadata.processName as string | undefined)?.toLowerCase() ?? '';
    const payload = JSON.stringify(event.metadata).toLowerCase();

    if (actionLower.includes('honeytoken') || actionLower.includes('canary')) {
      verdict = 'MALICIOUS_CONTAINMENT_REQUIRED';
      reasoning = `High-fidelity trap triggered: Canary token accessed from IP ${event.metadata.sourceIp ?? 'unknown'}.`;
      confidenceScore = 0.99;
      mitreMapping = COMMON_MITRE_MAPPINGS.HONEYTOKEN_TRIGGER;
    } else if (
      actionLower.includes('reverse_shell') ||
      processName.includes('nc') ||
      (processName.includes('bash') && payload.includes('/dev/tcp'))
    ) {
      verdict = 'MALICIOUS_CONTAINMENT_REQUIRED';
      reasoning = 'Anomalous socket spawn matching interactive reverse shell invocation.';
      confidenceScore = 0.98;
      mitreMapping = COMMON_MITRE_MAPPINGS.REVERSE_SHELL;
    } else if (
      actionLower.includes('prompt_injection') ||
      payload.includes('ignore previous instructions') ||
      payload.includes('bypass security filters')
    ) {
      verdict = 'MALICIOUS_CONTAINMENT_REQUIRED';
      reasoning = 'eBPF socket inspection flagged adversarial prompt injection signature.';
      confidenceScore = 0.94;
      mitreMapping = COMMON_MITRE_MAPPINGS.PROMPT_INJECTION;
    } else if (
      actionLower.includes('credential_dump') ||
      payload.includes('/etc/shadow') ||
      payload.includes('mimikatz')
    ) {
      verdict = 'MALICIOUS_CONTAINMENT_REQUIRED';
      reasoning = 'Unauthorized read operation on sensitive credential store detected.';
      confidenceScore = 0.97;
      mitreMapping = COMMON_MITRE_MAPPINGS.CREDENTIAL_DUMPING;
    } else if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      verdict = 'SUSPICIOUS';
      reasoning = `High severity alert on category ${event.category}; requiring Tier-2 causal graph investigation.`;
      confidenceScore = 0.82;
    }

    const executionTimeMs = performance.now() - startTime;

    return new AnalystDecision({
      id: `dec-t1-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentId,
      analystTier: 'TIER_1_TRIAGE',
      confidenceScore,
      verdict,
      reasoning,
      mitreMapping,
      containmentActions: [],
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }
}
