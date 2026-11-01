import { PqcDSAAlgorithm, PqcHybridMode } from '../../../domain/pqc/value-objects/pqc-algorithm.vo.js';
import { CryptoInventoryItem } from '../../../domain/pqc/value-objects/crypto-agility-status.vo.js';

export interface SignEnvelopeInput {
  payload: string | Buffer;
  algorithm?: PqcDSAAlgorithm;
  hybridMode?: PqcHybridMode;
  keyPairId?: string;
  tenantId: string;
}

export interface VerifyEnvelopeInput {
  payload: string | Buffer;
  pqcEnvelopeJson: string;
}

export interface CryptoAgilityScanResult {
  totalAssetsScanned: number;
  quantumResistantCount: number;
  transitionalHybridCount: number;
  quantumVulnerableCount: number;
  inventory: CryptoInventoryItem[];
  overallMigrationReadinessPercent: number;
  scanTimestamp: string;
}
