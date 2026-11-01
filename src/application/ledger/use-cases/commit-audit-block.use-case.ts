import { createHash } from 'node:crypto';
import { MerkleTree } from '../../../domain/ledger/merkle-tree.js';
import { AuditBlock } from '../../../domain/ledger/entities/audit-block.entity.js';
import { IPqcSignerPort } from '../../pqc/use-cases/sign-pqc-envelope.use-case.js';
import { CommitBlockResult } from '../dtos/audit-ledger.dto.js';

export interface CommitBlockInput {
  eventPayloads: string[];
  previousBlockHash?: string;
  blockHeight: number;
}

export class CommitAuditBlockUseCase {
  constructor(private readonly pqcSigner: IPqcSignerPort) {}

  public async execute(input: CommitBlockInput): Promise<{ result: CommitBlockResult; tree: MerkleTree }> {
    const startTime = performance.now();
    const payloads = input.eventPayloads.length > 0 ? input.eventPayloads : ['GENESIS_EMPTY_BLOCK'];

    // 1. Build cryptographic Merkle Tree
    const tree = new MerkleTree(payloads);
    const merkleRoot = tree.getRoot();

    // 2. Sign Merkle Root with NIST FIPS 204 ML-DSA-65 (Quantum-Resistant Envelope)
    const rootDigest = createHash('sha384').update(Buffer.from(merkleRoot, 'hex')).digest('hex');
    const { pqcSignatureHex, publicKeyHex } = await this.pqcSigner.sign(rootDigest, 'ML-DSA-65');

    // 3. Assemble Audit Block
    const block = new AuditBlock({
      blockHeight: input.blockHeight,
      previousBlockHash: input.previousBlockHash ?? '0'.repeat(96),
      merkleRoot,
      eventIds: payloads.map((p, i) => `ev-leaf-${i}`),
      eventCount: payloads.length,
      pqcSignatureHex,
      pqcPublicKeyHex: publicKeyHex,
      sealedAt: new Date().toISOString(),
    });

    const latency = performance.now() - startTime;

    return {
      result: {
        block,
        merkleRoot,
        pqcSignatureHex,
        leafCount: payloads.length,
        blockLatencyMs: Math.round(latency * 100) / 100,
      },
      tree,
    };
  }
}
