export type RedTeamProbeType =
  | 'CREDENTIAL_STUFFING_SIM'
  | 'PRIVILEGE_ESCALATION_PROBE'
  | 'LATERAL_MOVEMENT_SIM'
  | 'DATA_EXFILTRATION_PROBE'
  | 'EBPF_BYPASS_ATTEMPT';

export interface RedTeamProbeProps {
  id: string;
  probeType: RedTeamProbeType;
  targetAsset: string;
  payloadDescription: string;
  simulatedSuccess: boolean;
  detectedByTelemetry: boolean;
  containedWithinSla: boolean;
  mitreTechnique: string;
  timestamp: string;
}

export class RedTeamProbe {
  public readonly id: string;
  public readonly probeType: RedTeamProbeType;
  public readonly targetAsset: string;
  public readonly payloadDescription: string;
  public readonly simulatedSuccess: boolean;
  public readonly detectedByTelemetry: boolean;
  public readonly containedWithinSla: boolean;
  public readonly mitreTechnique: string;
  public readonly timestamp: string;

  constructor(props: RedTeamProbeProps) {
    this.id = props.id;
    this.probeType = props.probeType;
    this.targetAsset = props.targetAsset;
    this.payloadDescription = props.payloadDescription;
    this.simulatedSuccess = props.simulatedSuccess;
    this.detectedByTelemetry = props.detectedByTelemetry;
    this.containedWithinSla = props.containedWithinSla;
    this.mitreTechnique = props.mitreTechnique;
    this.timestamp = props.timestamp;
    Object.freeze(this);
  }

  public isDefenseDeficiency(): boolean {
    return this.simulatedSuccess && (!this.detectedByTelemetry || !this.containedWithinSla);
  }
}
