import type { Gesture, Point, Zone } from "./gestureClassifier";
export type Companion = "jew" | "bo";
export type Behavior =
  | "idle"
  | "watching"
  | "curious"
  | "petting"
  | "happy"
  | "annoyed"
  | "hunting"
  | "pounce"
  | "bite"
  | "release"
  | "sleeping"
  | "digging"
  | "heart-note"
  | "paw"
  | "boop"
  | "lick"
  | "blink"
  | "groom"
  | "stretch"
  | "breathing"
  | "leaving"
  | "entering";
export type Snapshot = Readonly<{
  pet: Companion;
  state: Behavior;
  since: number;
  serial: number;
  variant: number;
}>;
const protectedStates = new Set<Behavior>([
  "hunting",
  "pounce",
  "bite",
  "release",
  "digging",
  "heart-note",
  "leaving",
]);
const idleStates = new Set<Behavior>([
  "idle",
  "watching",
  "curious",
  "sleeping",
  "blink",
  "groom",
  "stretch",
]);
export const BITE_COOLDOWN = 32000;
export class CompanionMachine {
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private due = Infinity;
  private nextIdle = 3800;
  private nextHunt = 0;
  private biteReady = 0;
  private outcome: Behavior = "paw";
  private nextPet: Companion | null = null;
  private annoyance = 0;
  private lastTouch = 0;
  clock = 0;
  target: Point = { x: 0, y: 0 };
  engagement = 0;
  zone: Zone = "head";
  onEffect?: (effect: Behavior) => void;
  constructor(
    pet: Companion = "jew",
    private random: () => number = Math.random,
  ) {
    this.snapshot = { pet, state: "entering", since: 0, serial: 0, variant: 0 };
    this.due = 800;
  }
  getSnapshot = (): Snapshot => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private enter(state: Behavior, duration = Infinity) {
    this.snapshot = {
      ...this.snapshot,
      state,
      since: this.clock,
      serial: this.snapshot.serial + 1,
      variant: this.random(),
    };
    this.due = this.clock + duration;
    this.listeners.forEach((fn) => fn());
    this.onEffect?.(state);
  }
  track(point: Point, speed = 0, near = true) {
    this.target = point;
    if (!near || protectedStates.has(this.snapshot.state)) return;
    if (
      speed > 0.48 &&
      this.clock >= this.nextHunt &&
      this.snapshot.state !== "breathing"
    )
      this.hunt();
    else if (["idle", "sleeping", "groom"].includes(this.snapshot.state))
      this.enter("watching", 1900);
  }
  engage(gesture: Gesture, zone: Zone, point: Point) {
    this.target = point;
    if (protectedStates.has(this.snapshot.state)) return false;
    this.engagement++;
    this.zone = zone;
    this.lastTouch = this.clock;
    this.nextIdle = this.clock + 5000 + this.random() * 5000;
    if (gesture === "hold") {
      this.enter("breathing", 16000);
      return true;
    }
    if (gesture === "fast") {
      this.hunt();
      return true;
    }
    if (zone === "air") {
      this.enter("curious", 1600);
      return true;
    }
    if (zone === "tail" && this.snapshot.pet === "jew") {
      this.annoyance = Math.min(4, this.annoyance + 1);
      this.enter("annoyed", 800 + this.annoyance * 200);
      if (this.annoyance >= 3)
        this.nextHunt = Math.min(this.nextHunt, this.clock);
      return true;
    }
    if (zone === "paw") {
      this.enter("paw", 1400);
      return true;
    }
    this.annoyance = Math.max(0, this.annoyance - 0.25);
    if (gesture === "scratch" || gesture === "stroke")
      this.enter("petting", 1800);
    else this.enter(this.snapshot.pet === "jew" ? "blink" : "happy", 1600);
    return true;
  }
  hunt() {
    if (protectedStates.has(this.snapshot.state) || this.clock < this.nextHunt)
      return;
    this.engagement++;
    this.nextHunt = this.clock + 5500;
    this.lastTouch = this.clock;
    if (this.snapshot.pet === "jew") {
      const roll = this.random();
      const chance = 0.24 + Math.min(this.annoyance, 3) * 0.015;
      this.outcome =
        this.clock >= this.biteReady && roll < chance
          ? "bite"
          : roll < 0.65
            ? "paw"
            : "curious";
    } else this.outcome = this.random() < 0.58 ? "boop" : "lick";
    this.enter("hunting", 520);
  }
  switchPet(pet: Companion) {
    if (pet === this.snapshot.pet && !this.nextPet) return;
    this.nextPet = pet;
    this.enter("leaving", 430);
  }
  dig() {
    if (!this.canDiscover()) return false;
    this.enter("digging", 3000);
    return true;
  }
  canDiscover() {
    return idleStates.has(this.snapshot.state);
  }
  dismissNote() {
    if (this.snapshot.state === "heart-note") {
      this.enter("happy", 1600);
      this.nextIdle = this.clock + 7000;
    }
  }
  rest() {
    if (!["leaving", "digging", "heart-note"].includes(this.snapshot.state))
      this.enter("breathing", 16000);
  }
  cancelPointer() {
    // Never leave a pressed cursor or hunting chain behind after OS gesture interruption.
    if (["hunting", "pounce", "bite"].includes(this.snapshot.state))
      this.enter("release", 250);
  }
  advance(delta: number) {
    this.clock += Math.max(0, delta);
    if (this.clock - this.lastTouch > 15000) this.annoyance = 0;
    if (this.clock >= this.due) {
      const state = this.snapshot.state;
      if (state === "leaving") {
        this.snapshot = {
          ...this.snapshot,
          pet: this.nextPet ?? this.snapshot.pet,
        };
        this.nextPet = null;
        this.enter("entering", 650);
      } else if (state === "hunting") this.enter("pounce", 190);
      else if (state === "pounce") {
        if (this.outcome === "bite")
          this.biteReady = this.clock + BITE_COOLDOWN;
        this.enter(this.outcome, this.outcome === "bite" ? 240 : 600);
      } else if (state === "bite" || state === "boop" || state === "lick")
        this.enter("release", 340);
      else if (state === "release") this.enter("happy", 1100);
      else if (state === "digging") this.enter("heart-note");
      else {
        this.enter("idle");
        this.nextIdle = this.clock + 3000 + this.random() * 6500;
      }
    }
    if (this.snapshot.state === "idle" && this.clock >= this.nextIdle) {
      const choices: Behavior[] =
        this.snapshot.pet === "jew"
          ? ["blink", "groom", "curious", "stretch", "sleeping"]
          : ["happy", "curious", "stretch", "sleeping", "groom"];
      const next =
        choices[
          Math.min(
            choices.length - 1,
            Math.floor(this.random() * choices.length),
          )
        ];
      this.enter(next, next === "sleeping" ? 11000 : 2400);
    }
  }
}
