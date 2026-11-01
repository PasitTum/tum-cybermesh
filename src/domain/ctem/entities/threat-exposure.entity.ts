import { ExposureScore } from '../value-objects/exposure-score.vo.js';
import { RedTeamProbe } from './red-team-probe.entity.js';

export interface ThreatExposureProps {
  id: string;
  tenantId: string;
  assetIdentifier: string;
  assetType: 'HOST' | 'CLUSTER' | 'API_GATEWAY' | 'IDENTITY_PROVIDER' | 'DATABASE';
  cveList: string[];
  exposureScore: ExposureScore;
  probes: RedTeamProbe[];
  remediationPlan: string[];
  lastEvaluatedAt: string;
}

export class ThreatExposure {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly assetIdentifier: string;
  public readonly assetType: 'HOST' | 'CLUSTER' | 'API_GATEWAY' | 'IDENTITY_PROVIDER' | 'DATABASE';
  public readonly cveList: readonly string[];
  public readonly exposureScore: ExposureScore;
  public readonly probes: readonly RedTeamProbe[];
  public readonly remediationPlan: readonly string[];
  public readonly lastEvaluatedAt: string;

  constructor(props: ThreatExposureProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.assetIdentifier = props.assetIdentifier;
    this.assetType = props.assetType;
    this.cveList = Object.freeze([...props.cveList]);
    this.exposureScore = props.exposureScore;
    this.probes = Object.freeze([...props.probes]);
    this.remediationPlan = Object.freeze([...props.remediationPlan]);
    this.lastEvaluatedAt = props.lastEvaluatedAt;
    Object.freeze(this);
  }
}
