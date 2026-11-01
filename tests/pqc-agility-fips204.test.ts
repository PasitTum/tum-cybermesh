import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Fips204MlDsaEngine } from '../src/infrastructure/pqc/fips204-ml-dsa.engine.js';
import { Fips203MlKemEngine } from '../src/infrastructure/pqc/fips203-ml-kem.engine.js';
import { SignPqcEnvelopeUseCase } from '../src/application/pqc/use-cases/sign-pqc-envelope.use-case.js';
import { VerifyPqcEnvelopeUseCase } from '../src/application/pqc/use-cases/verify-pqc-envelope.use-case.js';
import { PqcDiscoveryScanner } from '../src/infrastructure/scanner/pqc-discovery-scanner.js';

describe('Post-Quantum Cryptographic Agility & NIST FIPS Standards', () => {
  it('Fips204MlDsaEngine should generate keys and sign/verify deterministically', async () => {
    const engine = new Fips204MlDsaEngine();
    const digest = 'a'.repeat(96); // 384-bit hex digest

    const { pqcSignatureHex, publicKeyHex } = await engine.sign(digest, 'ML-DSA-65');
    assert.ok(pqcSignatureHex.length > 0);
    assert.ok(publicKeyHex.length > 0);

    const isValid = await engine.verify(digest, pqcSignatureHex, publicKeyHex);
    assert.equal(isValid, true);

    const isTamperedValid = await engine.verify('b'.repeat(96), pqcSignatureHex, publicKeyHex);
    assert.equal(isTamperedValid, false);
  });

  it('Fips203MlKemEngine should generate keypair, encapsulate, and decapsulate', () => {
    const kem = new Fips203MlKemEngine();
    const keyPair = kem.generateKeyPair('ML-KEM-768');

    const enc = kem.encapsulate(keyPair.publicKeyHex, 'ML-KEM-768');
    assert.ok(enc.ciphertextHex.length > 0);
    assert.ok(enc.sharedSecretHex.length > 0);
  });

  it('should sign and verify PQC Envelope via Clean Architecture use cases', async () => {
    const engine = new Fips204MlDsaEngine();
    const signUseCase = new SignPqcEnvelopeUseCase(engine);
    const verifyUseCase = new VerifyPqcEnvelopeUseCase(engine);

    const payload = JSON.stringify({
      transactionId: 'tx-sovereign-001',
      sender: 'TUM_HQ',
      amount: 1000000,
    });

    const envelope = await signUseCase.execute({
      payload,
      algorithm: 'ML-DSA-65',
      hybridMode: 'PURE_PQC',
      tenantId: 'tum-sovereign',
    });

    assert.equal(envelope.algorithm, 'ML-DSA-65');

    const verification = await verifyUseCase.execute({
      payload,
      pqcEnvelopeJson: JSON.stringify(envelope),
    });

    assert.equal(verification.valid, true);

    // Tampered payload verification
    const tamperedVerification = await verifyUseCase.execute({
      payload: payload + 'tampered',
      pqcEnvelopeJson: JSON.stringify(envelope),
    });

    assert.equal(tamperedVerification.valid, false);
  });

  it('PqcDiscoveryScanner should scan endpoints and assess quantum risk (MESH-BKL-07)', () => {
    const scanner = new PqcDiscoveryScanner();
    const result = scanner.scanDefaultFleet();

    assert.ok(result.totalAssetsScanned > 0);
    assert.ok(result.quantumResistantCount > 0);
    assert.ok(result.quantumVulnerableCount > 0);
    assert.ok(result.overallMigrationReadinessPercent >= 50);
  });
});
