export interface AuditBlockProps {
  blockHeight: number;
  previousBlockHash: string;
  merkleRoot: string;
  eventIds: string[];
  eventCount: number;
  pqcSignatureHex: string;
  pqcPublicKeyHex: string;
  sealedAt: string;
}

export class AuditBlock {
  public readonly blockHeight: number;
  public readonly previousBlockHash: string;
  public readonly merkleRoot: string;
  public readonly eventIds: readonly string[];
  public readonly eventCount: number;
  public readonly pqcSignatureHex: string;
  public readonly pqcPublicKeyHex: string;
  public readonly sealedAt: string;

  constructor(props: AuditBlockProps) {
    this.blockHeight = props.blockHeight;
    this.previousBlockHash = props.previousBlockHash;
    this.merkleRoot = props.merkleRoot;
    this.eventIds = Object.freeze([...props.eventIds]);
    this.eventCount = props.eventCount;
    this.pqcSignatureHex = props.pqcSignatureHex;
    this.pqcPublicKeyHex = props.pqcPublicKeyHex;
    this.sealedAt = props.sealedAt;
    Object.freeze(this);
  }
}
