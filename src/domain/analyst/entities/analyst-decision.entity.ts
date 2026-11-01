import { AnalystTier } from '../value-objects/analyst-tier.vo.js';
import { MitreTechnique } from '../value-objects/mitre-attack.vo.js';
import { ContainmentAction } from './containment-action.entity.js';

export interface AnalystDecisionProps {
  id: string;
  incidentId: string;
  analystTier: AnalystTier;
  confidenceScore: number; // 0.00 to 1.00
  verdict: 'BENIGN' | 'SUSPICIOUS' | 'MALICIOUS_CONTAINMENT_REQUIRED';
  reasoning: string;
  mitreMapping?: MitreTechnique;
  containmentActions: ContainmentAction[];
  executionTimeMs: number;
  timestamp: string;
}

export class AnalystDecision {
  public readonly id: string;
  public readonly incidentId: string;
  public readonly analystTier: AnalystTier;
  public readonly confidenceScore: number;
  public readonly verdict: 'BENIGN' | 'SUSPICIOUS' | 'MALICIOUS_CONTAINMENT_REQUIRED';
  public readonly reasoning: string;
  public readonly mitreMapping?: MitreTechnique;
  public readonly containmentActions: readonly ContainmentAction[];
  public readonly executionTimeMs: number;
  public readonly timestamp: string;

  constructor(props: AnalystDecisionProps) {
    this.id = props.id;
    this.incidentId = props.incidentId;
    this.analystTier = props.analystTier;
    this.confidenceScore = props.confidenceScore;
    this.verdict = props.verdict;
    this.reasoning = props.reasoning;
    this.mitreMapping = props.mitreMapping;
    this.containmentActions = Object.freeze([...props.containmentActions]);
    this.executionTimeMs = props.executionTimeMs;
    this.timestamp = props.timestamp;
    Object.freeze(this);
  }

  public meets30SecondSla(): boolean {
    return this.executionTimeMs <= 30000;
  }
}
