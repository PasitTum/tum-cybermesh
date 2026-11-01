import { createHash } from 'node:crypto';
import { PqcEnvelopeProps } from '../../../domain/pqc/entities/pqc-envelope.entity.js';
import { VerifyEnvelopeInput } from '../dtos/pqc-operations.dto.js';

export interface IPqcVerifierPort {
  verify(digestHex: string, signatureHex: string, publicKeyHex: string): Promise<boolean>;
}

export class VerifyPqcEnvelopeUseCase {
  constructor(private readonly pqcVerifier: IPqcVerifierPort) {}

  public async execute(input: VerifyEnvelopeInput): Promise<{ valid: boolean; reason: string }> {
    let envelopeProps: PqcEnvelopeProps;
    try {
      envelopeProps = JSON.parse(input.pqcEnvelopeJson) as PqcEnvelopeProps;
    } catch {
      return { valid: false, reason: 'Malformed PQC envelope JSON' };
    }

    // 1. Verify payload hash match
    const payloadBuffer = typeof input.payload === 'string' ? Buffer.from(input.payload, 'utf-8') : input.payload;
    const computedDigest = createHash('sha384').update(payloadBuffer).digest('hex');

    if (computedDigest !== envelopeProps.payloadDigestSha384) {
      return {
        valid: false,
        reason: `Payload digest mismatch: expected ${envelopeProps.payloadDigestSha384}, got ${computedDigest}`,
      };
    }

    // 2. Verify signature via verifier port
    const signatureValid = await this.pqcVerifier.verify(
      envelopeProps.payloadDigestSha384,
      envelopeProps.pqcSignatureHex,
      envelopeProps.signedByPublicKeyHex
    );

    if (!signatureValid) {
      return { valid: false, reason: 'PQC signature verification failed against public key' };
    }

    return { valid: true, reason: 'NIST FIPS 204 PQC Envelope cryptographically verified' };
  }
}
