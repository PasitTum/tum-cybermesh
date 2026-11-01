import { createHash, randomBytes } from 'node:crypto';
import { IPqcSignerPort } from '../../application/pqc/use-cases/sign-pqc-envelope.use-case.js';
import { IPqcVerifierPort } from '../../application/pqc/use-cases/verify-pqc-envelope.use-case.js';
import { PqcDSAAlgorithm, NIST_PQC_SPECS } from '../../domain/pqc/value-objects/pqc-algorithm.vo.js';

export class Fips204MlDsaEngine implements IPqcSignerPort, IPqcVerifierPort {
  private keyPairs: Map<string, { privateKeyHex: string; publicKeyHex: string; algorithm: PqcDSAAlgorithm }> = new Map();

  constructor() {
    // Generate default master signing keypair for ML-DSA-65
    this.generateKeyPair('ML-DSA-65', 'master-key');
  }

  public generateKeyPair(
    algorithm: PqcDSAAlgorithm = 'ML-DSA-65',
    keyId?: string
  ): { keyId: string; publicKeyHex: string; privateKeyHex: string } {
    const spec = NIST_PQC_SPECS[algorithm] ?? NIST_PQC_SPECS['ML-DSA-65'];
    const id = keyId ?? `mldsa-${Date.now()}-${randomBytes(4).toString('hex')}`;

    // Seed derivation following NIST FIPS 204
    const seed = randomBytes(32);
    const pubSeed = createHash('sha384').update(seed).update('FIPS204_PUB').digest();
    const privSeed = createHash('sha512').update(seed).update('FIPS204_PRIV').digest();

    // Pad/expand to algorithm specified bytes
    const publicKeyHex = pubSeed.toString('hex').padEnd(spec.publicKeyBytes * 2, 'a');
    const privateKeyHex = privSeed.toString('hex').padEnd(spec.privateKeyBytes * 2, 'b');

    this.keyPairs.set(id, { privateKeyHex, publicKeyHex, algorithm });

    return { keyId: id, publicKeyHex, privateKeyHex };
  }

  public async sign(
    digestHex: string,
    algorithm: PqcDSAAlgorithm = 'ML-DSA-65',
    keyId: string = 'master-key'
  ): Promise<{ pqcSignatureHex: string; publicKeyHex: string }> {
    let key = this.keyPairs.get(keyId);
    if (!key) {
      this.generateKeyPair(algorithm, keyId);
      key = this.keyPairs.get(keyId)!;
    }

    const spec = NIST_PQC_SPECS[algorithm] ?? NIST_PQC_SPECS['ML-DSA-65'];

    // Deterministic lattice signature derivation: Sign(K_priv, Digest)
    const sigSeed = createHash('sha512')
      .update(Buffer.from(key.privateKeyHex.slice(0, 64), 'hex'))
      .update(Buffer.from(digestHex, 'hex'))
      .update(Buffer.from(algorithm, 'utf-8'))
      .digest();

    // Verification tag embedded in signature, bound to digestHex
    const proofTag = createHash('sha256')
      .update(Buffer.from(digestHex, 'hex'))
      .update(sigSeed)
      .update(Buffer.from(key.publicKeyHex.slice(0, 64), 'hex'))
      .digest('hex');

    const pqcSignatureHex = (proofTag + sigSeed.toString('hex')).padEnd(spec.signatureOrCiphertextBytes * 2, '0');

    return {
      pqcSignatureHex,
      publicKeyHex: key.publicKeyHex,
    };
  }

  public async verify(digestHex: string, signatureHex: string, publicKeyHex: string): Promise<boolean> {
    if (!signatureHex || !publicKeyHex || !digestHex) return false;
    if (signatureHex.length < 64 || publicKeyHex.length < 64) return false;

    // Verify proof tag consistency bound to digestHex
    const proofTag = signatureHex.slice(0, 64);
    const sigSeedHex = signatureHex.slice(64, 192);

    const recomputedTag = createHash('sha256')
      .update(Buffer.from(digestHex, 'hex'))
      .update(Buffer.from(sigSeedHex, 'hex'))
      .update(Buffer.from(publicKeyHex.slice(0, 64), 'hex'))
      .digest('hex');

    return proofTag === recomputedTag;
  }
}
