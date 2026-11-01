import { AuditBlock } from '../../../domain/ledger/entities/audit-block.entity.js';
import { InclusionProof } from '../../../domain/ledger/entities/inclusion-proof.vo.js';
import { MerkleTree } from '../../../domain/ledger/merkle-tree.js';
import { CommitAuditBlockUseCase } from '../use-cases/commit-audit-block.use-case.js';
import { VerifyInclusionProofUseCase } from '../use-cases/verify-inclusion-proof.use-case.js';
import { CommitBlockResult, VerifyProofResult } from '../dtos/audit-ledger.dto.js';

export class PqcAuditLedgerService {
  private readonly chain: AuditBlock[] = [];
  private readonly trees: Map<number, MerkleTree> = new Map();
  private pendingPayloads: string[] = [];

  constructor(
    private readonly commitUseCase: CommitAuditBlockUseCase,
    private readonly verifyUseCase: VerifyInclusionProofUseCase
  ) {}

  public appendEvent(eventJson: string): void {
    this.pendingPayloads.push(eventJson);
  }

  public async sealBlock(): Promise<CommitBlockResult> {
    const blockHeight = this.chain.length + 1;
    const previousBlockHash = this.chain.length > 0 ? this.chain[this.chain.length - 1].merkleRoot : '0'.repeat(96);

    const payloads = this.pendingPayloads.length > 0 ? [...this.pendingPayloads] : [`EMPTY_BLOCK_${blockHeight}`];
    this.pendingPayloads = [];

    const { result, tree } = await this.commitUseCase.execute({
      eventPayloads: payloads,
      previousBlockHash,
      blockHeight,
    });

    this.chain.push(result.block);
    this.trees.set(blockHeight, tree);

    return result;
  }

  public getInclusionProof(blockHeight: number, leafIndex: number): InclusionProof {
    const tree = this.trees.get(blockHeight);
    if (!tree) {
      throw new Error(`Block #${blockHeight} tree not found or block does not exist`);
    }
    return tree.generateProof(leafIndex);
  }

  public async verifyProof(proof: InclusionProof, blockHeight?: number): Promise<VerifyProofResult> {
    const block = blockHeight ? this.chain[blockHeight - 1] : undefined;
    return this.verifyUseCase.execute(proof, block);
  }

  public getBlockHeight(): number {
    return this.chain.length;
  }

  public getBlock(height: number): AuditBlock | undefined {
    return this.chain[height - 1];
  }

  public getPendingCount(): number {
    return this.pendingPayloads.length;
  }
}
