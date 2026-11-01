import { createHash } from 'node:crypto';
import { MerkleTree } from '../../../domain/ledger/merkle-tree.js';
import { InclusionProof } from '../../../domain/ledger/entities/inclusion-proof.vo.js';
import { AuditBlock } from '../../../domain/ledger/entities/audit-block.entity.js';
import { IPqcVerifierPort } from '../../pqc/use-cases/verify-pqc-envelope.use-case.js';
import { VerifyProofResult } from '../dtos/audit-ledger.dto.js';

export class VerifyInclusionProofUseCase {
  constructor(private readonly pqcVerifier?: IPqcVerifierPort) {}

  public async execute(proof: InclusionProof, block?: AuditBlock): Promise<VerifyProofResult> {
    // 1. Verify Merkle cryptographic proof
    const isMerkleValid = MerkleTree.verifyProof(proof);
    if (!isMerkleValid) {
      return {
        valid: false,
        leafHash: proof.leafHash,
        rootHash: proof.rootHash,
        leafIndex: proof.leafIndex,
        message: 'Merkle inclusion proof verification failed (hash mismatch in path)',
      };
    }

    // 2. If block provided, verify root matches block's Merkle root
    if (block) {
      if (block.merkleRoot !== proof.rootHash) {
        return {
          valid: false,
          leafHash: proof.leafHash,
          rootHash: proof.rootHash,
          leafIndex: proof.leafIndex,
          message: `Proof root ${proof.rootHash} does not match Block #${block.blockHeight} root ${block.merkleRoot}`,
        };
      }

      // 3. Verify PQC ML-DSA-65 signature on block root if verifier is present
      if (this.pqcVerifier) {
        const rootDigest = createHash('sha384').update(Buffer.from(block.merkleRoot, 'hex')).digest('hex');
        const isSigValid = await this.pqcVerifier.verify(
          rootDigest,
          block.pqcSignatureHex,
          block.pqcPublicKeyHex
        );

        if (!isSigValid) {
          return {
            valid: false,
            leafHash: proof.leafHash,
            rootHash: proof.rootHash,
            leafIndex: proof.leafIndex,
            pqcSignatureVerified: false,
            message: 'NIST FIPS 204 PQC signature on block root is invalid or tampered',
          };
        }

        return {
          valid: true,
          leafHash: proof.leafHash,
          rootHash: proof.rootHash,
          leafIndex: proof.leafIndex,
          pqcSignatureVerified: true,
          message: 'Cryptographically verified: Merkle inclusion and NIST FIPS 204 PQC seal are valid',
        };
      }
    }

    return {
      valid: true,
      leafHash: proof.leafHash,
      rootHash: proof.rootHash,
      leafIndex: proof.leafIndex,
      message: 'Merkle inclusion proof valid',
    };
  }
}
