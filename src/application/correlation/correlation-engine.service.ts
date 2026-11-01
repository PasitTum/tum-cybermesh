import { TelemetryEvent } from '../../domain/telemetry/entities/telemetry-event.entity.js';
import { SigmaRuleDefinition, SigmaMatchResult } from '../../domain/sigma/sigma-rule.types.js';
import { SigmaEvaluatorLogic } from '../../domain/sigma/sigma-evaluator.logic.js';
import { SocAnalystFleetService } from '../analyst/services/soc-analyst-fleet.service.js';
import { TriageResponse } from '../analyst/dtos/incident-triage.dto.js';
import { PartitionedRingBuffer } from '../../infrastructure/lakehouse/partitioned-ring-buffer.js';
import { Fips204MlDsaEngine } from '../../infrastructure/pqc/fips204-ml-dsa.engine.js';
import { createHash } from 'node:crypto';

export interface CorrelationResult {
  event: TelemetryEvent;
  matchedRules: SigmaMatchResult[];
  mitreTechniques: string[];
  requiresContainment: boolean;
  triageResponse?: TriageResponse;
  pqcSignatureEnvelope?: {
    digestHex: string;
    signatureHex: string;
    publicKeyHex: string;
    algorithm: string;
    signedAt: string;
  };
}

export class CorrelationEngineService {
  private rules: Map<string, SigmaRuleDefinition> = new Map();

  constructor(
    private readonly lakehouseBuffer: PartitionedRingBuffer<TelemetryEvent>,
    private readonly socFleet: SocAnalystFleetService,
    private readonly pqcEngine: Fips204MlDsaEngine
  ) {}

  public registerRule(rule: SigmaRuleDefinition): void {
    this.rules.set(rule.id, rule);
  }

  public registerRules(rules: SigmaRuleDefinition[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  public getRegisteredRules(): SigmaRuleDefinition[] {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluates an incoming telemetry event against the active rule base,
   * buffers into the lakehouse, and triggers autonomous triage & PQC signing on threat detection.
   */
  public async processEvent(event: TelemetryEvent): Promise<CorrelationResult> {
    // 1. Buffer event into partitioned lakehouse
    this.lakehouseBuffer.push(event);

    // 2. Flatten event for Sigma evaluation (attributes + metadata)
    const flatRecord: Record<string, unknown> = {
      id: event.id,
      tenantId: event.tenantId,
      category: event.category,
      severity: event.severity,
      timestamp: event.timestamp,
      sourceHost: event.sourceHost,
      action: event.action,
      ...event.metadata
    };

    // 3. Evaluate against active Sigma detection rules
    const matchedRules: SigmaMatchResult[] = [];
    for (const rule of this.rules.values()) {
      const match = SigmaEvaluatorLogic.evaluate(rule, flatRecord);
      if (match.matched) {
        matchedRules.push(match);
      }
    }

    const mitreTechniques: string[] = Array.from(
      new Set(matchedRules.flatMap(m => m.mitreTags))
    );

    const highestSeverityRule = matchedRules.find(
      r => r.level === 'critical' || r.level === 'high'
    );

    if (!highestSeverityRule) {
      return {
        event,
        matchedRules,
        mitreTechniques,
        requiresContainment: false
      };
    }

    // 4. Correlate context: retrieve recent telemetry for host from lakehouse
    const lakehouseEvents = this.lakehouseBuffer.toArray();
    const correlatedContext = lakehouseEvents.filter(
      (e: TelemetryEvent) => e.tenantId === event.tenantId && e.sourceHost === event.sourceHost && e.id !== event.id
    );

    // 5. Trigger Autonomous SOC Analyst Fleet for Triage and Containment
    const triageResponse = await this.socFleet.processEvent({
      event,
      correlatedContext
    });

    // 6. Post-Quantum Lattice Signature (NIST FIPS 204 ML-DSA-65) for immutable audit
    const digestPayload = JSON.stringify({
      eventId: event.id,
      incidentId: triageResponse.incident.id,
      verdict: triageResponse.tier1Decision.verdict,
      containmentCount: triageResponse.containmentActions.length,
      mitreTechniques
    });

    const digestHex = createHash('sha384').update(digestPayload).digest('hex');
    const pqcSignResult = await this.pqcEngine.sign(digestHex, 'ML-DSA-65', 'master-key');

    return {
      event,
      matchedRules,
      mitreTechniques,
      requiresContainment: triageResponse.containmentExecuted,
      triageResponse,
      pqcSignatureEnvelope: {
        digestHex,
        signatureHex: pqcSignResult.pqcSignatureHex,
        publicKeyHex: pqcSignResult.publicKeyHex,
        algorithm: 'ML-DSA-65',
        signedAt: new Date().toISOString()
      }
    };
  }
}
