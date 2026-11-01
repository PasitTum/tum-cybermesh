import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { WormAppendLedgerStore } from '../src/infrastructure/ledger/worm-append-store.js';
import { AuditBlock } from '../src/domain/ledger/entities/audit-block.entity.js';

describe('WORM Append-Only Ledger Store (Tamper-Proof Storage)', () => {
  it('appends sequential blocks and retrieves stored records intact', () => {
    const store = new WormAppendLedgerStore();
    assert.equal(store.getChainHeight(), 0);

    const b1 = new AuditBlock({
      blockHeight: 1,
      previousBlockHash: '0'.repeat(96),
      merkleRoot: '1'.repeat(96),
      eventIds: ['ev-1'],
      eventCount: 1,
      pqcSignatureHex: 'sig-1',
      pqcPublicKeyHex: 'pub-1',
      sealedAt: new Date().toISOString(),
    });

    const b2 = new AuditBlock({
      blockHeight: 2,
      previousBlockHash: '1'.repeat(96),
      merkleRoot: '2'.repeat(96),
      eventIds: ['ev-2'],
      eventCount: 1,
      pqcSignatureHex: 'sig-2',
      pqcPublicKeyHex: 'pub-2',
      sealedAt: new Date().toISOString(),
    });

    store.append(b1);
    store.append(b2);

    assert.equal(store.getChainHeight(), 2);
    assert.equal(store.get(1)?.merkleRoot, '1'.repeat(96));
    assert.equal(store.get(2)?.merkleRoot, '2'.repeat(96));
    assert.equal(store.getAllBlocks().length, 2);
  });

  it('prohibits overwriting existing block heights (WORM violation)', () => {
    const store = new WormAppendLedgerStore();

    const b1 = new AuditBlock({
      blockHeight: 1,
      previousBlockHash: '0'.repeat(96),
      merkleRoot: 'root-a',
      eventIds: ['ev-1'],
      eventCount: 1,
      pqcSignatureHex: 'sig-1',
      pqcPublicKeyHex: 'pub-1',
      sealedAt: new Date().toISOString(),
    });

    store.append(b1);

    // Attempt overwrite
    const b1Overwrite = new AuditBlock({
      blockHeight: 1,
      previousBlockHash: '0'.repeat(96),
      merkleRoot: 'root-tampered',
      eventIds: ['ev-tampered'],
      eventCount: 1,
      pqcSignatureHex: 'sig-tampered',
      pqcPublicKeyHex: 'pub-1',
      sealedAt: new Date().toISOString(),
    });

    assert.throws(() => {
      store.append(b1Overwrite);
    }, /WORM Violation: Block #1 already committed/);
  });

  it('rejects non-sequential block gap', () => {
    const store = new WormAppendLedgerStore();

    const b3 = new AuditBlock({
      blockHeight: 3,
      previousBlockHash: '2'.repeat(96),
      merkleRoot: 'root-3',
      eventIds: ['ev-3'],
      eventCount: 1,
      pqcSignatureHex: 'sig-3',
      pqcPublicKeyHex: 'pub-3',
      sealedAt: new Date().toISOString(),
    });

    assert.throws(() => {
      store.append(b3);
    }, /WORM Violation: Non-sequential block height/);
  });
});
