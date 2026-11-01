import { randomBytes } from 'node:crypto';
import { CanaryToken } from '../../../domain/honeytoken/entities/canary-token.entity.js';
import { GenerateCanaryInput } from '../dtos/honeytoken.dto.js';

export class GenerateCanaryTokenUseCase {
  public execute(input: GenerateCanaryInput): CanaryToken {
    let secretPayload = '';

    switch (input.tokenType) {
      case 'AWS_SECRET_KEY':
        secretPayload = `AKIA${randomBytes(8).toString('hex').toUpperCase()}:${randomBytes(20).toString('base64')}`;
        break;
      case 'SOVEREIGN_JWT_TOKEN':
        secretPayload = `tum_canary_jwt.${Buffer.from(JSON.stringify({ decoy: input.decoyIdentifier, sub: 'canary' })).toString('base64url')}.${randomBytes(32).toString('hex')}`;
        break;
      case 'DATABASE_CREDENTIAL':
        secretPayload = `postgresql://canary_admin:${randomBytes(12).toString('hex')}@db.tum-internal.sovereign:5432/core_telemetry`;
        break;
      case 'CANARY_FILE_TRIPWIRE':
        secretPayload = `--- TUM SOVEREIGN HIGHLY CONFIDENTIAL FINANCIAL LEDGER ---\nTRIPWIRE_SIGNATURE=${randomBytes(16).toString('hex')}`;
        break;
      case 'K8S_SERVICE_ACCOUNT_TOKEN':
        secretPayload = `eyJhcnRpZmFjdCI6ICJjYW5hcnlfc2EiLCAiZXhwIjogMTgwMDAwMDAwMH0.${randomBytes(32).toString('base64url')}`;
        break;
    }

    return new CanaryToken({
      id: `canary-${Date.now()}-${randomBytes(4).toString('hex')}`,
      tokenType: input.tokenType,
      decoyIdentifier: input.decoyIdentifier,
      secretPayload,
      targetDeploymentLocation: input.targetDeploymentLocation,
      isTriggered: false,
      tenantId: input.tenantId,
      createdAt: new Date().toISOString(),
    });
  }
}
