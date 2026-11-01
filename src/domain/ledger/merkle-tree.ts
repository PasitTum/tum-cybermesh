import { createHash } from 'node:crypto';
import { InclusionProof, MerkleProofStep } from './entities/inclusion-proof.vo.js';

export class MerkleTree {
  private readonly leaves: string[];
  private readonly layers: string[][];

  constructor(elements: (string | Buffer)[]) {
    if (elements.length === 0) {
      throw new Error('Merkle tree must contain at least one element');
    }

    // 1. Hash leaves with SHA-384
    this.leaves = elements.map((elem) => {
      const buf = typeof elem === 'string' ? Buffer.from(elem, 'utf-8') : elem;
      return createHash('sha384').update(buf).digest('hex');
    });

    this.layers = [this.leaves];
    this.buildTree();
  }

  private hashPair(left: string, right: string): string {
    return createHash('sha384')
      .update(Buffer.from(left, 'hex'))
      .update(Buffer.from(right, 'hex'))
      .digest('hex');
  }

  private buildTree(): void {
    let currentLayer = this.leaves;

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          nextLayer.push(this.hashPair(currentLayer[i], currentLayer[i + 1]));
        } else {
          // Odd element: duplicate and hash with self
          nextLayer.push(this.hashPair(currentLayer[i], currentLayer[i]));
        }
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  public getRoot(): string {
    const topLayer = this.layers[this.layers.length - 1];
    return topLayer[0];
  }

  public getLeafHash(index: number): string {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Leaf index ${index} out of bounds (total leaves: ${this.leaves.length})`);
    }
    return this.leaves[index];
  }

  public generateProof(index: number): InclusionProof {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Leaf index ${index} out of bounds`);
    }

    const steps: MerkleProofStep[] = [];
    let currentIndex = index;

    for (let layerIdx = 0; layerIdx < this.layers.length - 1; layerIdx++) {
      const layer = this.layers[layerIdx];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < layer.length) {
        steps.push({
          position: isRightNode ? 'left' : 'right',
          hash: layer[siblingIndex],
        });
      } else {
        // Self-paired odd node
        steps.push({
          position: 'right',
          hash: layer[currentIndex],
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return new InclusionProof(this.leaves[index], this.getRoot(), steps, index);
  }

  public static verifyProof(proof: InclusionProof): boolean {
    let currentHash = proof.leafHash;

    for (const step of proof.auditSteps) {
      if (step.position === 'left') {
        currentHash = createHash('sha384')
          .update(Buffer.from(step.hash, 'hex'))
          .update(Buffer.from(currentHash, 'hex'))
          .digest('hex');
      } else {
        currentHash = createHash('sha384')
          .update(Buffer.from(currentHash, 'hex'))
          .update(Buffer.from(step.hash, 'hex'))
          .digest('hex');
      }
    }

    return currentHash === proof.rootHash;
  }
}
