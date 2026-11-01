import { CryptoInventoryItem, CryptoVulnerabilityLevel } from '../../../domain/pqc/value-objects/crypto-agility-status.vo.js';
import { CryptoAgilityScanResult } from '../dtos/pqc-operations.dto.js';

export interface ScannedTargetEndpoint {
  assetName: string;
  tlsCipherSuite: string;
  signatureScheme: string;
  keyLengthBits: number;
}

export class ScanCryptoAgilityUseCase {
  public execute(endpoints: ScannedTargetEndpoint[]): CryptoAgilityScanResult {
    const inventory: CryptoInventoryItem[] = [];

    let quantumResistantCount = 0;
    let transitionalHybridCount = 0;
    let quantumVulnerableCount = 0;

    for (const ep of endpoints) {
      let status: CryptoVulnerabilityLevel = 'QUANTUM_VULNERABLE';
      let recommendedPqcTarget = 'NIST FIPS 204 ML-DSA-65';

      const cipher = ep.tlsCipherSuite.toUpperCase().replace(/_/g, '-');
      const sig = ep.signatureScheme.toUpperCase().replace(/_/g, '-');

      if (
        sig.includes('ML-DSA') ||
        sig.includes('DILITHIUM') ||
        cipher.includes('ML-KEM') ||
        cipher.includes('KYBER') ||
        cipher.includes('HYBRID') ||
        sig.includes('HYBRID')
      ) {
        if (sig.includes('RSA') || sig.includes('ECDSA') || sig.includes('HYBRID')) {
          status = 'TRANSITIONAL_HYBRID';
          recommendedPqcTarget = 'Transition to Pure NIST FIPS 204 ML-DSA';
          transitionalHybridCount++;
        } else {
          status = 'QUANTUM_RESISTANT_NIST';
          recommendedPqcTarget = 'Fully compliant with NIST FIPS 204 / FIPS 203';
          quantumResistantCount++;
        }
      } else {
        status = 'QUANTUM_VULNERABLE';
        if (sig.includes('RSA')) {
          recommendedPqcTarget = 'Migrate RSA to NIST FIPS 204 ML-DSA-65';
        } else if (sig.includes('ECDSA')) {
          recommendedPqcTarget = 'Migrate ECDSA to NIST FIPS 204 ML-DSA-65';
        }
        quantumVulnerableCount++;
      }

      inventory.push({
        assetName: ep.assetName,
        cipherSuite: ep.tlsCipherSuite,
        signatureScheme: ep.signatureScheme,
        keyLengthBits: ep.keyLengthBits,
        status,
        recommendedPqcTarget,
      });
    }

    const total = endpoints.length;
    const readiness = total > 0 ? Math.round(((quantumResistantCount + transitionalHybridCount * 0.5) / total) * 100) : 0;

    return {
      totalAssetsScanned: total,
      quantumResistantCount,
      transitionalHybridCount,
      quantumVulnerableCount,
      inventory,
      overallMigrationReadinessPercent: readiness,
      scanTimestamp: new Date().toISOString(),
    };
  }
}
