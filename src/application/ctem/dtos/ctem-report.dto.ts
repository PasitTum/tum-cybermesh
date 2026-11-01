import { ExposureRiskLevel } from '../../../domain/ctem/value-objects/exposure-score.vo.js';
import { RedTeamProbe } from '../../../domain/ctem/entities/red-team-probe.entity.js';

export interface AssetEvaluationTarget {
  tenantId: string;
  assetIdentifier: string;
  assetType: 'HOST' | 'CLUSTER' | 'API_GATEWAY' | 'IDENTITY_PROVIDER' | 'DATABASE';
  openPorts: number[];
  detectedServices: string[];
  cveList: string[];
  authProtocols: string[];
}

export interface CtemEvaluationReport {
  assetIdentifier: string;
  exposureScore: number;
  riskLevel: ExposureRiskLevel;
  criticalVulnerabilitiesCount: number;
  unmitigatedProbesCount: number;
  probes: RedTeamProbe[];
  remediationPlan: string[];
  evaluatedAt: string;
}
