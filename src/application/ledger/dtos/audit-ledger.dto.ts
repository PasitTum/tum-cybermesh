import { AuditBlock } from '../../../domain/ledger/entities/audit-block.entity.js';
import { InclusionProof } from '../../../domain/ledger/entities/inclusion-proof.vo.js';

export interface CommitBlockResult {
  block: AuditBlock;
  merkleRoot: string;
  pqcSignatureHex: string;
  leafCount: number;
  blockLatencyMs: number;
}

export interface VerifyProofResult {
  valid: boolean;
  leafHash: string;
  rootHash: string;
  leafIndex: number;
  pqcSignatureVerified?: boolean;
  message: string;
}
