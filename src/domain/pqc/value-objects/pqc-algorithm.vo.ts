export type PqcKEMAlgorithm = 'ML-KEM-512' | 'ML-KEM-768' | 'ML-KEM-1024'; // NIST FIPS 203
export type PqcDSAAlgorithm = 'ML-DSA-44' | 'ML-DSA-65' | 'ML-DSA-87';     // NIST FIPS 204
export type PqcHybridMode = 'HYBRID_RSA_ML_DSA' | 'HYBRID_ECDSA_ML_DSA' | 'PURE_PQC';

export interface PqcAlgorithmSpecification {
  algorithm: PqcKEMAlgorithm | PqcDSAAlgorithm;
  fipsStandard: 'FIPS 203' | 'FIPS 204';
  securityCategory: 1 | 2 | 3 | 5;
  publicKeyBytes: number;
  privateKeyBytes: number;
  signatureOrCiphertextBytes: number;
}

export const NIST_PQC_SPECS: Record<string, PqcAlgorithmSpecification> = {
  'ML-KEM-768': {
    algorithm: 'ML-KEM-768',
    fipsStandard: 'FIPS 203',
    securityCategory: 3,
    publicKeyBytes: 1184,
    privateKeyBytes: 2400,
    signatureOrCiphertextBytes: 1088,
  },
  'ML-DSA-65': {
    algorithm: 'ML-DSA-65',
    fipsStandard: 'FIPS 204',
    securityCategory: 3,
    publicKeyBytes: 1952,
    privateKeyBytes: 4032,
    signatureOrCiphertextBytes: 3309,
  },
  'ML-DSA-87': {
    algorithm: 'ML-DSA-87',
    fipsStandard: 'FIPS 204',
    securityCategory: 5,
    publicKeyBytes: 2592,
    privateKeyBytes: 4896,
    signatureOrCiphertextBytes: 4627,
  },
};
