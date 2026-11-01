import { PqcKEMAlgorithm } from '../../pqc/value-objects/pqc-algorithm.vo.js';

export interface PqcTunnelSessionProps {
  sessionId: string;
  initiatorNodeId: string;
  responderNodeId: string;
  kemAlgorithm: PqcKEMAlgorithm;
  sharedSecretHex: string;
  ciphertextHex: string;
  establishedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export class PqcTunnelSession {
  public readonly sessionId: string;
  public readonly initiatorNodeId: string;
  public readonly responderNodeId: string;
  public readonly kemAlgorithm: PqcKEMAlgorithm;
  private readonly sharedSecretHex: string;
  public readonly ciphertextHex: string;
  public readonly establishedAt: string;
  public readonly expiresAt: string;
  public isActive: boolean;

  constructor(props: PqcTunnelSessionProps) {
    this.sessionId = props.sessionId;
    this.initiatorNodeId = props.initiatorNodeId;
    this.responderNodeId = props.responderNodeId;
    this.kemAlgorithm = props.kemAlgorithm;
    this.sharedSecretHex = props.sharedSecretHex;
    this.ciphertextHex = props.ciphertextHex;
    this.establishedAt = props.establishedAt;
    this.expiresAt = props.expiresAt;
    this.isActive = props.isActive;
  }

  public getSessionKey(): string {
    return this.sharedSecretHex;
  }

  public isExpired(): boolean {
    return Date.now() > new Date(this.expiresAt).getTime();
  }

  public terminate(): void {
    this.isActive = false;
  }
}
