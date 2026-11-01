import { HoneytokenType } from '../value-objects/honeytoken-type.vo.js';

export interface CanaryTokenProps {
  id: string;
  tokenType: HoneytokenType;
  decoyIdentifier: string;
  secretPayload: string;
  targetDeploymentLocation: string;
  isTriggered: boolean;
  triggeredByIp?: string;
  triggeredAt?: string;
  tenantId: string;
  createdAt: string;
}

export class CanaryToken {
  public readonly id: string;
  public readonly tokenType: HoneytokenType;
  public readonly decoyIdentifier: string;
  public readonly secretPayload: string;
  public readonly targetDeploymentLocation: string;
  public isTriggered: boolean;
  public triggeredByIp?: string;
  public triggeredAt?: string;
  public readonly tenantId: string;
  public readonly createdAt: string;

  constructor(props: CanaryTokenProps) {
    this.id = props.id;
    this.tokenType = props.tokenType;
    this.decoyIdentifier = props.decoyIdentifier;
    this.secretPayload = props.secretPayload;
    this.targetDeploymentLocation = props.targetDeploymentLocation;
    this.isTriggered = props.isTriggered;
    this.triggeredByIp = props.triggeredByIp;
    this.triggeredAt = props.triggeredAt;
    this.tenantId = props.tenantId;
    this.createdAt = props.createdAt;
  }

  public trigger(attackerIp: string): void {
    this.isTriggered = true;
    this.triggeredByIp = attackerIp;
    this.triggeredAt = new Date().toISOString();
  }
}
