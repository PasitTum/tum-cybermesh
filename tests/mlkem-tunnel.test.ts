import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Fips203MlKemEngine } from '../src/infrastructure/pqc/fips203-ml-kem.engine.js';
import { EstablishMlKemTunnelUseCase } from '../src/application/tunnel/use-cases/establish-mlkem-tunnel.use-case.js';

describe('NIST FIPS 203 ML-KEM Ephemeral Encrypted Telemetry Tunnel', () => {
  it('establishes quantum-safe tunnel and securely encrypts/decrypts authenticated payload', () => {
    const kemEngine = new Fips203MlKemEngine();
    const useCase = new EstablishMlKemTunnelUseCase(kemEngine);

    const { session, encrypt, decrypt } = useCase.execute({
      initiatorNodeId: 'sensor-rayong',
      responderNodeId: 'lakehouse-bangkok',
      kemAlgorithm: 'ML-KEM-768',
      ttlSeconds: 1800,
    });

    assert.ok(session.sessionId.startsWith('pqc-tun-'));
    assert.equal(session.kemAlgorithm, 'ML-KEM-768');
    assert.equal(session.isActive, true);
    assert.equal(session.isExpired(), false);

    const secretMessage = JSON.stringify({
      syscall: 'SYS_EXECVE',
      binary: '/usr/bin/python3',
      args: ['agent.py'],
      quantumSignature: 'VALID_ML_DSA_87',
    });

    const frame = encrypt(secretMessage);
    assert.equal(frame.sessionId, session.sessionId);
    assert.ok(frame.ciphertextHex.length > 0);
    assert.ok(frame.authTagHex.length > 0);

    const decrypted = decrypt(frame);
    assert.equal(decrypted, secretMessage);
  });

  it('rejects tampered ciphertext with AEAD authentication failure', () => {
    const kemEngine = new Fips203MlKemEngine();
    const useCase = new EstablishMlKemTunnelUseCase(kemEngine);

    const { encrypt, decrypt } = useCase.execute({
      initiatorNodeId: 'node-a',
      responderNodeId: 'node-b',
    });

    const frame = encrypt('ORIGINAL_CONFIDENTIAL_PAYLOAD');

    // Tamper with ciphertext by flipping first character
    const tamperedHex = (frame.ciphertextHex[0] === 'a' ? 'b' : 'a') + frame.ciphertextHex.slice(1);
    const tamperedFrame = { ...frame, ciphertextHex: tamperedHex };

    assert.throws(() => {
      decrypt(tamperedFrame);
    }, /Unsupported state or unable to authenticate data/);
  });
});
