import type {
  Behavior,
  Companion,
} from "../interactions/companionStateMachine";
export class SoftAudio {
  private context?: AudioContext;
  private enabled = false;
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      void this.context?.suspend().catch(() => {});
      return;
    }
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }
  play(state: Behavior, pet: Companion) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    if (
      ![
        "petting",
        "blink",
        "happy",
        "paw",
        "bite",
        "boop",
        "lick",
        "digging",
        "heart-note",
      ].includes(state)
    )
      return;
    const ctx = this.context,
      now = ctx.currentTime,
      purr = pet === "jew" && ["petting", "blink"].includes(state);
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = purr ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(
      purr ? 42 : state === "heart-note" ? 523 : pet === "bo" ? 190 : 140,
      now,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      purr ? 36 : state === "heart-note" ? 660 : 85,
      now + 0.24,
    );
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(purr ? 0.035 : 0.045, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (purr ? 0.8 : 0.3));
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + (purr ? 0.85 : 0.35));
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }
}
export function haptic(duration = 12) {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    )
      navigator.vibrate(Math.min(24, duration));
  } catch {}
}
