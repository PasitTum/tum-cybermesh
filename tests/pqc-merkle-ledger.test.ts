import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MerkleTree } from '../src/domain/ledger/merkle-tree.js';
import { Fips204MlDsaEngine } from '../src/infrastructure/pqc/fips204-ml-dsa.engine.js';
import { CommitAuditBlockUseCase } from '../src/application/ledger/use-cases/commit-audit-block.use-case.js';
import { VerifyInclusionProofUseCase } from '../src/application/ledger/use-cases/verify-inclusion-proof.use-case.js';
import { PqcAuditLedgerService } from '../src/application/ledger/services/pqc-audit-ledger.service.js';

describe('Quantum-Safe Merkle Audit Ledger (NIST FIPS 204 ML-DSA-65)', () => {
  it('MerkleTree should compute deterministic root and verify inclusion proofs', () => {
    const leaves = ['event_alpha', 'event_beta', 'event_gamma', 'event_delta', 'event_epsilon'];
    const tree = new MerkleTree(leaves);

    const root = tree.getRoot();
    assert.ok(root.length > 0);

    // Verify proof for every leaf
    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.generateProof(i);
      const isValid = MerkleTree.verifyProof(proof);
      assert.equal(isValid, true, `Proof for leaf #${i} should be cryptographically valid`);
    }
  });

  it('CommitAuditBlockUseCase should seal block with NIST FIPS 204 signature', async () => {
    const mlDsa = new Fips204MlDsaEngine();
    const commitUseCase = new CommitAuditBlockUseCase(mlDsa);
    const verifyUseCase = new VerifyInclusionProofUseCase(mlDsa);

    const { result, tree } = await commitUseCase.execute({
      eventPayloads: ['audit_log_1', 'audit_log_2', 'audit_log_3'],
      blockHeight: 1,
    });

    assert.equal(result.block.blockHeight, 1);
    assert.equal(result.leafCount, 3);
    assert.ok(result.pqcSignatureHex.length > 0);

    const proof = tree.generateProof(1);
    const verification = await verifyUseCase.execute(proof, result.block);

    assert.equal(verification.valid, true);
    assert.equal(verification.pqcSignatureVerified, true);
  });

  it('PqcAuditLedgerService should manage block chaining and proof verification', async () => {
    const mlDsa = new Fips204MlDsaEngine();
    const ledger = new PqcAuditLedgerService(
      new CommitAuditBlockUseCase(mlDsa),
      new VerifyInclusionProofUseCase(mlDsa)
    );

    ledger.appendEvent(JSON.stringify({ op: 'PROCESS_KILL', pid: 9912 }));
    ledger.appendEvent(JSON.stringify({ op: 'FIREWALL_DROP', ip: '198.51.100.4' }));

    const res1 = await ledger.sealBlock();
    assert.equal(ledger.getBlockHeight(), 1);
    assert.equal(res1.block.blockHeight, 1);

    ledger.appendEvent(JSON.stringify({ op: 'HOST_QUARANTINE', host: 'node-corp' }));
    const res2 = await ledger.sealBlock();
    assert.equal(ledger.getBlockHeight(), 2);
    assert.equal(res2.block.previousBlockHash, res1.merkleRoot);

    const proof = ledger.getInclusionProof(1, 0);
    const verified = await ledger.verifyProof(proof, 1);
    assert.equal(verified.valid, true);
  });
});
