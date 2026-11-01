import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Fips203MlKemEngine } from '../../../infrastructure/pqc/fips203-ml-kem.engine.js';
import { PqcTunnelSession } from '../../../domain/tunnel/entities/pqc-tunnel-session.entity.js';
import { PqcKEMAlgorithm } from '../../../domain/pqc/value-objects/pqc-algorithm.vo.js';

export interface EstablishTunnelInput {
  initiatorNodeId: string;
  responderNodeId: string;
  kemAlgorithm?: PqcKEMAlgorithm;
  ttlSeconds?: number;
}

export interface EncryptedTunnelFrame {
  sessionId: string;
  ivHex: string;
  ciphertextHex: string;
  authTagHex: string;
}

export class EstablishMlKemTunnelUseCase {
  constructor(private readonly kemEngine: Fips203MlKemEngine) {}

  public execute(input: EstablishTunnelInput): {
    session: PqcTunnelSession;
    encrypt: (plaintext: string) => EncryptedTunnelFrame;
    decrypt: (frame: EncryptedTunnelFrame) => string;
  } {
    const algorithm: PqcKEMAlgorithm = input.kemAlgorithm ?? 'ML-KEM-768';
    const ttlSeconds = input.ttlSeconds ?? 3600; // 1 hour default

    // 1. Responder creates ephemeral ML-KEM keypair
    const responderKey = this.kemEngine.generateKeyPair(algorithm);

    // 2. Initiator encapsulates shared secret
    const encapsulation = this.kemEngine.encapsulate(responderKey.publicKeyHex, algorithm);

    // 3. Responder decapsulates ciphertext
    const decapsulation = this.kemEngine.decapsulate(
      encapsulation.ciphertextHex,
      responderKey.privateKeyHex,
      responderKey.publicKeyHex
    );

    const sessionId = `pqc-tun-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const establishedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const session = new PqcTunnelSession({
      sessionId,
      initiatorNodeId: input.initiatorNodeId,
      responderNodeId: input.responderNodeId,
      kemAlgorithm: algorithm,
      sharedSecretHex: encapsulation.sharedSecretHex,
      ciphertextHex: encapsulation.ciphertextHex,
      establishedAt,
      expiresAt,
      isActive: true,
    });

    // 256-bit symmetric key derived from ML-KEM shared secret
    const sessionKeyBuffer = Buffer.from(encapsulation.sharedSecretHex.slice(0, 64), 'hex');

    // Symmetric AES-256-GCM AEAD encryption tunnel helper
    const encrypt = (plaintext: string): EncryptedTunnelFrame => {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', sessionKeyBuffer, iv);
      let enc = cipher.update(plaintext, 'utf-8', 'hex');
      enc += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');

      return {
        sessionId,
        ivHex: iv.toString('hex'),
        ciphertextHex: enc,
        authTagHex: tag,
      };
    };

    // Symmetric AES-256-GCM AEAD decryption tunnel helper
    const decrypt = (frame: EncryptedTunnelFrame): string => {
      const iv = Buffer.from(frame.ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-gcm', sessionKeyBuffer, iv);
      decipher.setAuthTag(Buffer.from(frame.authTagHex, 'hex'));
      let dec = decipher.update(frame.ciphertextHex, 'hex', 'utf-8');
      dec += decipher.final('utf-8');
      return dec;
    };

    return { session, encrypt, decrypt };
  }
}
