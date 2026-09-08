export class HeartScheduler {
  elapsed = 0;
  discoveries = 0;
  private due: number;
  constructor(
    firstSession: boolean,
    private random: () => number = Math.random,
  ) {
    this.due = firstSession
      ? 14000 + random() * 10000
      : 22000 + random() * 16000;
  }
  advance(delta: number, engagement: number, available: boolean) {
    this.elapsed += Math.max(0, delta);
    if (
      this.discoveries >= 5 ||
      engagement < 2 ||
      this.elapsed < this.due ||
      !available
    )
      return false;
    this.discoveries++;
    this.due = this.elapsed + 45000 + this.random() * 30000;
    return true;
  }
}
