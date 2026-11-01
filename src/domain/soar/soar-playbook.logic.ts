/**
 * TUM CyberMesh — SOAR Playbook Domain Logic
 * Pure Functional Domain Logic (Deterministic, Zero Side-Effects)
 */

import {
  SoarPlaybookDefinition,
  MitreTechniqueId,
  PlaybookExecutionRecord,
  StepExecutionResult
} from './soar-playbook.types.js';

export class SoarPlaybookLogic {
  /**
   * Validates a playbook definition structure and rules.
   */
  public static validatePlaybook(playbook: SoarPlaybookDefinition): { isValid: boolean; error?: string } {
    if (!playbook.playbookId || playbook.playbookId.trim().length === 0) {
      return { isValid: false, error: 'Playbook ID must not be empty' };
    }
    if (!playbook.name || playbook.name.trim().length === 0) {
      return { isValid: false, error: 'Playbook name must not be empty' };
    }
    if (!playbook.steps || playbook.steps.length === 0) {
      return { isValid: false, error: 'Playbook must contain at least one remediation step' };
    }
    const seenStepIds = new Set<string>();
    for (const step of playbook.steps) {
      if (seenStepIds.has(step.stepId)) {
        return { isValid: false, error: `Duplicate step ID: ${step.stepId}` };
      }
      seenStepIds.add(step.stepId);
      if (step.timeoutMs <= 0 || step.timeoutMs > 30000) {
        return { isValid: false, error: `Step timeout (${step.timeoutMs}ms) exceeds 30s SLA limit` };
      }
    }
    return { isValid: true };
  }

  /**
   * Matches an incident technique to the appropriate playbook in the registry.
   */
  public static matchPlaybook(
    playbooks: readonly SoarPlaybookDefinition[],
    technique: MitreTechniqueId,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): SoarPlaybookDefinition | undefined {
    const severityRank: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };

    return playbooks.find(p => {
      if (p.targetTechnique !== technique) return false;
      return severityRank[severity] >= severityRank[p.minSeverity];
    });
  }

  /**
   * Computes the execution status and SLA compliance (DoD 30-second response mandate).
   */
  public static evaluateExecutionRecord(
    executionId: string,
    playbookId: string,
    incidentId: string,
    technique: MitreTechniqueId,
    stepResults: readonly StepExecutionResult[],
    quantumSignature: string
  ): PlaybookExecutionRecord {
    const totalDurationMs = stepResults.reduce((acc, step) => acc + step.durationMs, 0);
    const hasFailures = stepResults.some(s => !s.success);
    const criticalFailed = stepResults.some(s => !s.success);

    let status: 'COMPLETED' | 'FAILED' | 'PARTIAL_ROLLBACK' = 'COMPLETED';
    if (criticalFailed) {
      status = 'FAILED';
    }

    // DoD SLA requires containment under 30,000ms (30 seconds)
    const withinSla = totalDurationMs < 30000;

    return {
      executionId,
      playbookId,
      incidentId,
      targetTechnique: technique,
      status,
      totalDurationMs,
      withinSla,
      stepResults,
      quantumSignature,
      timestamp: new Date().toISOString()
    };
  }
}
