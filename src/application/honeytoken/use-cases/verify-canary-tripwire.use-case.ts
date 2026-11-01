import { CanaryToken } from '../../../domain/honeytoken/entities/canary-token.entity.js';
import { CanaryTripwireEvent } from '../dtos/honeytoken.dto.js';

export class VerifyCanaryTripwireUseCase {
  public execute(token: CanaryToken, accessedFromIp: string): CanaryTripwireEvent {
    token.trigger(accessedFromIp);

    return {
      tokenId: token.id,
      accessedFromIp,
      accessTimestamp: token.triggeredAt ?? new Date().toISOString(),
      canaryToken: token,
    };
  }
}
