import { ScanCryptoAgilityUseCase, ScannedTargetEndpoint } from '../../application/pqc/use-cases/scan-crypto-agility.use-case.js';
import { CryptoAgilityScanResult } from '../../application/pqc/dtos/pqc-operations.dto.js';

export class PqcDiscoveryScanner {
  private readonly scanUseCase: ScanCryptoAgilityUseCase;

  constructor(scanUseCase?: ScanCryptoAgilityUseCase) {
    this.scanUseCase = scanUseCase ?? new ScanCryptoAgilityUseCase();
  }

  public scanDefaultFleet(): CryptoAgilityScanResult {
    const defaultSampleEndpoints: ScannedTargetEndpoint[] = [
      {
        assetName: 'api.tum-gateway.sovereign:443',
        tlsCipherSuite: 'TLS_AES_256_GCM_SHA384_ML_KEM_768',
        signatureScheme: 'ML-DSA-65',
        keyLengthBits: 1952,
      },
      {
        assetName: 'auth.identity.sovereign:443',
        tlsCipherSuite: 'ECDHE-ECDSA-AES256-GCM-SHA384',
        signatureScheme: 'ECDSA-P384',
        keyLengthBits: 384,
      },
      {
        assetName: 'telemetry.lakehouse.tum:8443',
        tlsCipherSuite: 'TLS_AES_128_GCM_SHA256_HYBRID',
        signatureScheme: 'HYBRID_ECDSA_ML_DSA_65',
        keyLengthBits: 2048,
      },
      {
        assetName: 'legacy-db.internal:5432',
        tlsCipherSuite: 'DHE-RSA-AES256-SHA',
        signatureScheme: 'RSA-2048',
        keyLengthBits: 2048,
      },
      {
        assetName: 'pqc-vault.defense.sovereign:9000',
        tlsCipherSuite: 'TLS_ML_KEM_1024_AES_256_GCM',
        signatureScheme: 'ML-DSA-87',
        keyLengthBits: 2592,
      },
    ];

    return this.scanUseCase.execute(defaultSampleEndpoints);
  }

  public scanCustomEndpoints(endpoints: ScannedTargetEndpoint[]): CryptoAgilityScanResult {
    return this.scanUseCase.execute(endpoints);
  }
}
