import { PeerNode } from '../../../domain/mesh/entities/peer-node.entity.js';
import { MeshConsensusVerdict } from '../../../domain/mesh/entities/mesh-consensus-verdict.vo.js';

export class SynchronizeP2pMeshUseCase {
  public execute(peers: PeerNode[], candidateBlockHeight: number): MeshConsensusVerdict {
    const startTime = performance.now();
    if (peers.length === 0) {
      throw new Error('P2P Mesh requires at least one peer to evaluate consensus');
    }

    // Group peers by their latestMerkleRoot for candidateBlockHeight
    const rootCounts = new Map<string, PeerNode[]>();
    for (const peer of peers) {
      if (peer.currentBlockHeight === candidateBlockHeight) {
        const list = rootCounts.get(peer.latestMerkleRoot) ?? [];
        list.push(peer);
        rootCounts.set(peer.latestMerkleRoot, list);
      }
    }

    // Find majority agreed root
    let agreedRoot = '';
    let maxAgreeingNodes: PeerNode[] = [];

    for (const [root, nodes] of rootCounts.entries()) {
      if (nodes.length > maxAgreeingNodes.length) {
        agreedRoot = root;
        maxAgreeingNodes = nodes;
      }
    }

    const quorumRatio = maxAgreeingNodes.length / peers.length;
    const quorumReached = quorumRatio >= 0.60; // 60%+ BFT Quorum
    const byzantineNodes: PeerNode[] = [];

    // Isolate nodes that returned contradictory roots at the same block height
    for (const peer of peers) {
      if (peer.currentBlockHeight === candidateBlockHeight && peer.latestMerkleRoot !== agreedRoot) {
        peer.penalizeByzantine();
        byzantineNodes.push(peer);
      }
    }

    const latency = performance.now() - startTime;

    return new MeshConsensusVerdict({
      blockHeight: candidateBlockHeight,
      agreedMerkleRoot: agreedRoot,
      totalPeers: peers.length,
      agreeingPeersCount: maxAgreeingNodes.length,
      quorumReached,
      byzantineNodesIsolated: byzantineNodes,
      consensusLatencyMs: Math.round(latency * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  }
}
