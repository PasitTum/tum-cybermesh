import { createHash } from 'node:crypto';
import { PqcEnvelope } from '../../../domain/pqc/entities/pqc-envelope.entity.js';
import { SignEnvelopeInput } from '../dtos/pqc-operations.dto.js';
import { PqcDSAAlgorithm } from '../../../domain/pqc/value-objects/pqc-algorithm.vo.js';

export interface IPqcSignerPort {
  sign(digestHex: string, algorithm: PqcDSAAlgorithm): Promise<{ pqcSignatureHex: string; publicKeyHex: string }>;
}

export class SignPqcEnvelopeUseCase {
  constructor(private readonly pqcSigner: IPqcSignerPort) {}

  public async execute(input: SignEnvelopeInput): Promise<PqcEnvelope> {
    const algorithm: PqcDSAAlgorithm = input.algorithm ?? 'ML-DSA-65';
    const hybridMode = input.hybridMode ?? 'PURE_PQC';

    // 1. Calculate SHA-384 digest of payload (standard for high-security PQC envelopes)
    const payloadBuffer = typeof input.payload === 'string' ? Buffer.from(input.payload, 'utf-8') : input.payload;
    const digestHex = createHash('sha384').update(payloadBuffer).digest('hex');

    // 2. Invoke PQC Signer port (NIST FIPS 204)
    const { pqcSignatureHex, publicKeyHex } = await this.pqcSigner.sign(digestHex, algorithm);

    // 3. Assemble envelope
    return new PqcEnvelope({
      id: `pqc-env-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      algorithm,
      hybridMode,
      payloadDigestSha384: digestHex,
      pqcSignatureHex,
      classicalSignatureHex: hybridMode !== 'PURE_PQC' ? createHash('sha256').update(digestHex).digest('hex') : undefined,
      signedByPublicKeyHex: publicKeyHex,
      timestamp: new Date().toISOString(),
    });
  }
}
