import { PeerNode } from '../../../domain/mesh/entities/peer-node.entity.js';
import { MeshConsensusVerdict } from '../../../domain/mesh/entities/mesh-consensus-verdict.vo.js';
import { SynchronizeP2pMeshUseCase } from '../use-cases/synchronize-p2p-mesh.use-case.js';

export class P2pMerkleMeshService {
  private peers: Map<string, PeerNode> = new Map();

  constructor(private readonly syncUseCase: SynchronizeP2pMeshUseCase) {
    this.seedDefaultEnclaves();
  }

  private seedDefaultEnclaves(): void {
    const defaultEnclaves: PeerNode[] = [
      new PeerNode({
        nodeId: 'node-bkk-core-01',
        enclaveName: 'Bangkok Sovereign Core DC',
        region: 'BANGKOK_CORE',
        pqcPublicKeyHex: 'bkk_mldsa_pubkey_01',
        currentBlockHeight: 1,
        latestMerkleRoot: '7bb9decbc923f7c556a91d79a4f18dd44524bc1cff25e784',
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
      new PeerNode({
        nodeId: 'node-cmi-enclave-02',
        enclaveName: 'Chiang Mai North Disaster Enclave',
        region: 'CHIANG_MAI_ENCLAVE',
        pqcPublicKeyHex: 'cmi_mldsa_pubkey_02',
        currentBlockHeight: 1,
        latestMerkleRoot: '7bb9decbc923f7c556a91d79a4f18dd44524bc1cff25e784',
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
      new PeerNode({
        nodeId: 'node-ryg-edge-03',
        enclaveName: 'Rayong EEC Sovereign Edge Sensor',
        region: 'RAYONG_EDGE',
        pqcPublicKeyHex: 'ryg_mldsa_pubkey_03',
        currentBlockHeight: 1,
        latestMerkleRoot: '7bb9decbc923f7c556a91d79a4f18dd44524bc1cff25e784',
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
      new PeerNode({
        nodeId: 'node-sgp-gateway-04',
        enclaveName: 'Singapore Financial Gateway',
        region: 'SINGAPORE_GATEWAY',
        pqcPublicKeyHex: 'sgp_mldsa_pubkey_04',
        currentBlockHeight: 1,
        latestMerkleRoot: '7bb9decbc923f7c556a91d79a4f18dd44524bc1cff25e784',
        reputationScore: 98,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
    ];

    for (const p of defaultEnclaves) {
      this.peers.set(p.nodeId, p);
    }
  }

  public registerPeer(peer: PeerNode): void {
    this.peers.set(peer.nodeId, peer);
  }

  public getAllPeers(): PeerNode[] {
    return Array.from(this.peers.values());
  }

  public getPeer(nodeId: string): PeerNode | undefined {
    return this.peers.get(nodeId);
  }

  public broadcastBlock(height: number, merkleRoot: string): void {
    for (const peer of this.peers.values()) {
      if (peer.status !== 'ISOLATED_BYZANTINE') {
        peer.updateState(height, merkleRoot);
      }
    }
  }

  public triggerConsensus(targetHeight: number): MeshConsensusVerdict {
    const peerList = Array.from(this.peers.values());
    return this.syncUseCase.execute(peerList, targetHeight);
  }

  public simulateByzantineDrift(nodeId: string, rogueRoot: string): void {
    const peer = this.peers.get(nodeId);
    if (peer) {
      peer.latestMerkleRoot = rogueRoot;
    }
  }
}
