export interface MerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export class InclusionProof {
  public readonly leafHash: string;
  public readonly rootHash: string;
  public readonly auditSteps: readonly MerkleProofStep[];
  public readonly leafIndex: number;

  constructor(leafHash: string, rootHash: string, steps: MerkleProofStep[], leafIndex: number) {
    this.leafHash = leafHash;
    this.rootHash = rootHash;
    this.auditSteps = Object.freeze([...steps]);
    this.leafIndex = leafIndex;
    Object.freeze(this);
  }
}
