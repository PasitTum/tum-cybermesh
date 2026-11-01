import { HoneytokenType } from '../../../domain/honeytoken/value-objects/honeytoken-type.vo.js';
import { CanaryToken } from '../../../domain/honeytoken/entities/canary-token.entity.js';

export interface GenerateCanaryInput {
  tokenType: HoneytokenType;
  decoyIdentifier: string;
  targetDeploymentLocation: string;
  tenantId: string;
}

export interface CanaryTripwireEvent {
  tokenId: string;
  accessedFromIp: string;
  accessTimestamp: string;
  canaryToken: CanaryToken;
}
