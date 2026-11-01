export type ExposureRiskLevel = 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export class ExposureScore {
  public readonly score: number; // 0 to 100
  public readonly riskLevel: ExposureRiskLevel;

  constructor(score: number) {
    if (score < 0 || score > 100) {
      throw new Error(`Invalid exposure score: ${score}. Must be between 0 and 100.`);
    }
    this.score = Math.round(score * 10) / 10;
    this.riskLevel = this.calculateRiskLevel(this.score);
    Object.freeze(this);
  }

  private calculateRiskLevel(score: number): ExposureRiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'NEGLIGIBLE';
  }
}
