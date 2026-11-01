import { AuditBlock } from '../../domain/ledger/entities/audit-block.entity.js';

export class WormAppendLedgerStore {
  private readonly storage: Map<number, AuditBlock> = new Map();
  private highestBlock: number = 0;

  public append(block: AuditBlock): void {
    if (this.storage.has(block.blockHeight)) {
      throw new Error(`WORM Violation: Block #${block.blockHeight} already committed. Overwrite prohibited.`);
    }

    if (block.blockHeight !== this.highestBlock + 1) {
      throw new Error(`WORM Violation: Non-sequential block height. Expected #${this.highestBlock + 1}, got #${block.blockHeight}`);
    }

    this.storage.set(block.blockHeight, block);
    this.highestBlock = block.blockHeight;
  }

  public get(height: number): AuditBlock | undefined {
    return this.storage.get(height);
  }

  public getChainHeight(): number {
    return this.highestBlock;
  }

  public getAllBlocks(): AuditBlock[] {
    const list: AuditBlock[] = [];
    for (let h = 1; h <= this.highestBlock; h++) {
      const b = this.storage.get(h);
      if (b) list.push(b);
    }
    return list;
  }
}
