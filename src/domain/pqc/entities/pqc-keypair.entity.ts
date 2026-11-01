import { PqcDSAAlgorithm, PqcKEMAlgorithm } from '../value-objects/pqc-algorithm.vo.js';

export interface PqcKeyPairProps {
  id: string;
  algorithm: PqcKEMAlgorithm | PqcDSAAlgorithm;
  publicKeyHex: string;
  privateKeyHex: string; // Stored securely/encrypted in memory
  createdAt: string;
  expiresAt: string;
  tenantId: string;
  isActive: boolean;
}

export class PqcKeyPair {
  public readonly id: string;
  public readonly algorithm: PqcKEMAlgorithm | PqcDSAAlgorithm;
  public readonly publicKeyHex: string;
  private readonly privateKeyHex: string;
  public readonly createdAt: string;
  public readonly expiresAt: string;
  public readonly tenantId: string;
  public isActive: boolean;

  constructor(props: PqcKeyPairProps) {
    this.id = props.id;
    this.algorithm = props.algorithm;
    this.publicKeyHex = props.publicKeyHex;
    this.privateKeyHex = props.privateKeyHex;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.tenantId = props.tenantId;
    this.isActive = props.isActive;
  }

  public getSecretKey(): string {
    return this.privateKeyHex;
  }

  public isExpired(): boolean {
    return new Date().getTime() > new Date(this.expiresAt).getTime();
  }
}
