export type CryptoVulnerabilityLevel = 'QUANTUM_VULNERABLE' | 'TRANSITIONAL_HYBRID' | 'QUANTUM_RESISTANT_NIST';

export interface CryptoInventoryItem {
  assetName: string;
  cipherSuite: string;
  signatureScheme: string;
  keyLengthBits: number;
  status: CryptoVulnerabilityLevel;
  recommendedPqcTarget: string;
}
