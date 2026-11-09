import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PeerNode } from '../src/domain/mesh/entities/peer-node.entity.js';
import { SynchronizeP2pMeshUseCase } from '../src/application/mesh/use-cases/synchronize-p2p-mesh.use-case.js';
import { P2pMerkleMeshService } from '../src/application/mesh/services/p2p-merkle-mesh.service.js';

describe('Distributed P2P Merkle Mesh Consensus (Multi-Enclave BFT)', () => {
  it('SynchronizeP2pMeshUseCase should reach quorum when majority peers agree on canonical root', () => {
    const sync = new SynchronizeP2pMeshUseCase();
    const validRoot = 'a'.repeat(96);

    const peers = [
      new PeerNode({
        nodeId: 'node-bkk',
        enclaveName: 'Bangkok Core',
        region: 'BANGKOK_CORE',
        pqcPublicKeyHex: 'pub-bkk',
        currentBlockHeight: 1,
        latestMerkleRoot: validRoot,
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
      new PeerNode({
        nodeId: 'node-cmi',
        enclaveName: 'Chiang Mai Enclave',
        region: 'CHIANG_MAI_ENCLAVE',
        pqcPublicKeyHex: 'pub-cmi',
        currentBlockHeight: 1,
        latestMerkleRoot: validRoot,
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
      new PeerNode({
        nodeId: 'node-ryg',
        enclaveName: 'Rayong Edge',
        region: 'RAYONG_EDGE',
        pqcPublicKeyHex: 'pub-ryg',
        currentBlockHeight: 1,
        latestMerkleRoot: validRoot,
        reputationScore: 100,
        status: 'ONLINE_SYNCED',
        lastHeartbeat: new Date().toISOString(),
      }),
    ];

    const verdict = sync.execute(peers, 1);
    assert.equal(verdict.quorumReached, true);
    assert.equal(verdict.agreeingPeersCount, 3);
    assert.equal(verdict.byzantineNodesIsolated.length, 0);
    assert.equal(verdict.agreedMerkleRoot, validRoot);
  });

  it('SynchronizeP2pMeshUseCase should detect, penalize, and isolate Byzantine divergent peer', () => {
    const sync = new SynchronizeP2pMeshUseCase();
    const validRoot = 'a'.repeat(96);
    const rogueRoot = 'b'.repeat(96);

    const honestNode1 = new PeerNode({
      nodeId: 'honest-1',
      enclaveName: 'Honest Enclave 1',
      region: 'BANGKOK_CORE',
      pqcPublicKeyHex: 'pub-1',
      currentBlockHeight: 5,
      latestMerkleRoot: validRoot,
      reputationScore: 100,
      status: 'ONLINE_SYNCED',
      lastHeartbeat: new Date().toISOString(),
    });
    const honestNode2 = new PeerNode({
      nodeId: 'honest-2',
      enclaveName: 'Honest Enclave 2',
      region: 'CHIANG_MAI_ENCLAVE',
      pqcPublicKeyHex: 'pub-2',
      currentBlockHeight: 5,
      latestMerkleRoot: validRoot,
      reputationScore: 100,
      status: 'ONLINE_SYNCED',
      lastHeartbeat: new Date().toISOString(),
    });
    const rogueNode = new PeerNode({
      nodeId: 'rogue-byzantine-03',
      enclaveName: 'Compromised Edge',
      region: 'RAYONG_EDGE',
      pqcPublicKeyHex: 'pub-3',
      currentBlockHeight: 5,
      latestMerkleRoot: rogueRoot,
      reputationScore: 90,
      status: 'ONLINE_SYNCED',
      lastHeartbeat: new Date().toISOString(),
    });

    const verdict = sync.execute([honestNode1, honestNode2, rogueNode], 5);
    assert.equal(verdict.quorumReached, true);
    assert.equal(verdict.byzantineNodesIsolated.length, 1);
    assert.equal(verdict.byzantineNodesIsolated[0].nodeId, 'rogue-byzantine-03');
    assert.equal(rogueNode.status, 'ISOLATED_BYZANTINE');
    assert.equal(rogueNode.reputationScore, 0);
  });

  it('P2pMerkleMeshService should seed enclaves and broadcast updates cleanly', () => {
    const mesh = new P2pMerkleMeshService(new SynchronizeP2pMeshUseCase());
    assert.ok(mesh.getAllPeers().length >= 4);

    const newRoot = 'c'.repeat(96);
    mesh.broadcastBlock(2, newRoot);

    const bkk = mesh.getPeer('node-bkk-core-01');
    assert.equal(bkk?.currentBlockHeight, 2);
    assert.equal(bkk?.latestMerkleRoot, newRoot);

    const verdict = mesh.triggerConsensus(2);
    assert.equal(verdict.quorumReached, true);
  });
});
