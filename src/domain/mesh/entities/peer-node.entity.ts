export type PeerNodeStatus = 'ONLINE_SYNCED' | 'SYNCHRONIZING' | 'BEHIND' | 'ISOLATED_BYZANTINE';
export type GeographicRegion = 'BANGKOK_CORE' | 'CHIANG_MAI_ENCLAVE' | 'RAYONG_EDGE' | 'SINGAPORE_GATEWAY' | 'FRANKFURT_REDUNDANCY';

export interface PeerNodeProps {
  nodeId: string;
  enclaveName: string;
  region: GeographicRegion;
  pqcPublicKeyHex: string;
  currentBlockHeight: number;
  latestMerkleRoot: string;
  reputationScore: number; // 0 to 100
  status: PeerNodeStatus;
  lastHeartbeat: string;
}

export class PeerNode {
  public readonly nodeId: string;
  public readonly enclaveName: string;
  public readonly region: GeographicRegion;
  public readonly pqcPublicKeyHex: string;
  public currentBlockHeight: number;
  public latestMerkleRoot: string;
  public reputationScore: number;
  public status: PeerNodeStatus;
  public lastHeartbeat: string;

  constructor(props: PeerNodeProps) {
    this.nodeId = props.nodeId;
    this.enclaveName = props.enclaveName;
    this.region = props.region;
    this.pqcPublicKeyHex = props.pqcPublicKeyHex;
    this.currentBlockHeight = props.currentBlockHeight;
    this.latestMerkleRoot = props.latestMerkleRoot;
    this.reputationScore = props.reputationScore;
    this.status = props.status;
    this.lastHeartbeat = props.lastHeartbeat;
  }

  public penalizeByzantine(): void {
    this.reputationScore = 0;
    this.status = 'ISOLATED_BYZANTINE';
  }

  public updateState(height: number, merkleRoot: string): void {
    this.currentBlockHeight = height;
    this.latestMerkleRoot = merkleRoot;
    this.status = 'ONLINE_SYNCED';
    this.lastHeartbeat = new Date().toISOString();
  }
}
