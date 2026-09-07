export class HeartScheduler {
  elapsed = 0;
  discoveries = 0;
  private due: number;
  constructor(
    firstSession: boolean,
    private random: () => number = Math.random,
  ) {
    this.due = firstSession
      ? 24000 + random() * 18000
      : 50000 + random() * 45000;
  }
  advance(delta: number, engagement: number, available: boolean) {
    this.elapsed += Math.max(0, delta);
    if (
      this.discoveries >= 3 ||
      engagement < 4 ||
      this.elapsed < this.due ||
      !available
    )
      return false;
    this.discoveries++;
    this.due = this.elapsed + 105000 + this.random() * 105000;
    return true;
  }
}
