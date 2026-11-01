import { PeerNode } from './peer-node.entity.js';

export interface MeshConsensusVerdictProps {
  blockHeight: number;
  agreedMerkleRoot: string;
  totalPeers: number;
  agreeingPeersCount: number;
  quorumReached: boolean;
  byzantineNodesIsolated: PeerNode[];
  consensusLatencyMs: number;
  timestamp: string;
}

export class MeshConsensusVerdict {
  public readonly blockHeight: number;
  public readonly agreedMerkleRoot: string;
  public readonly totalPeers: number;
  public readonly agreeingPeersCount: number;
  public readonly quorumReached: boolean;
  public readonly byzantineNodesIsolated: readonly PeerNode[];
  public readonly consensusLatencyMs: number;
  public readonly timestamp: string;

  constructor(props: MeshConsensusVerdictProps) {
    this.blockHeight = props.blockHeight;
    this.agreedMerkleRoot = props.agreedMerkleRoot;
    this.totalPeers = props.totalPeers;
    this.agreeingPeersCount = props.agreeingPeersCount;
    this.quorumReached = props.quorumReached;
    this.byzantineNodesIsolated = Object.freeze([...props.byzantineNodesIsolated]);
    this.consensusLatencyMs = props.consensusLatencyMs;
    this.timestamp = props.timestamp;
    Object.freeze(this);
  }
}
