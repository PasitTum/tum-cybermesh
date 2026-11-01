import { PqcDSAAlgorithm, PqcHybridMode } from '../value-objects/pqc-algorithm.vo.js';

export interface PqcEnvelopeProps {
  id: string;
  algorithm: PqcDSAAlgorithm;
  hybridMode: PqcHybridMode;
  payloadDigestSha384: string;
  pqcSignatureHex: string;
  classicalSignatureHex?: string;
  signedByPublicKeyHex: string;
  timestamp: string;
}

export class PqcEnvelope {
  public readonly id: string;
  public readonly algorithm: PqcDSAAlgorithm;
  public readonly hybridMode: PqcHybridMode;
  public readonly payloadDigestSha384: string;
  public readonly pqcSignatureHex: string;
  public readonly classicalSignatureHex?: string;
  public readonly signedByPublicKeyHex: string;
  public readonly timestamp: string;

  constructor(props: PqcEnvelopeProps) {
    this.id = props.id;
    this.algorithm = props.algorithm;
    this.hybridMode = props.hybridMode;
    this.payloadDigestSha384 = props.payloadDigestSha384;
    this.pqcSignatureHex = props.pqcSignatureHex;
    this.classicalSignatureHex = props.classicalSignatureHex;
    this.signedByPublicKeyHex = props.signedByPublicKeyHex;
    this.timestamp = props.timestamp;
    Object.freeze(this);
  }
}
