import type { Companion } from "./companionStateMachine";
export type GroundPoint = { x: number; z: number };
export type Bounds = { x: number; z: number };
const clamp = (v: number, limit: number) =>
  Math.max(-limit, Math.min(limit, v));
const distance = (a: GroundPoint, b: GroundPoint) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// Locomotion owns ground position; the behavior machine owns gestures and expressions.
export class Wanderer {
  x: number;
  z: number;
  heading: number;
  walking = false;
  stand = 0;
  stride = 0;
  private wait: number;
  private goal: GroundPoint | null = null;
  private idleHeading: number;
  constructor(
    readonly pet: Companion,
    private random = Math.random,
  ) {
    this.x = pet === "jew" ? -1.15 : 1.2;
    this.z = pet === "jew" ? 0.65 : -0.35;
    this.heading = this.idleHeading = pet === "jew" ? 0.28 : -0.35;
    this.wait = pet === "jew" ? 1.6 : 3.4;
  }
  pause(seconds = 2.5) {
    this.goal = null;
    this.wait = Math.max(this.wait, seconds);
    this.walking = false;
  }
  goTo(point: GroundPoint, bounds: Bounds) {
    this.goal = { x: clamp(point.x, bounds.x), z: clamp(point.z, bounds.z) };
    this.wait = 0;
  }
  private chooseGoal(bounds: Bounds, other: GroundPoint) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const p = {
        x: (this.random() * 2 - 1) * bounds.x,
        z: (this.random() * 2 - 1) * bounds.z,
      };
      if (distance(p, this) > 0.9 && distance(p, other) > 1.75) return p;
    }
    return null;
  }
  step(
    delta: number,
    bounds: Bounds,
    other: GroundPoint,
    allowed = true,
    reduced = false,
  ) {
    const dt = Math.min(0.05, Math.max(0, delta));
    if (
      !Number.isFinite(dt) ||
      !Number.isFinite(bounds.x) ||
      !Number.isFinite(bounds.z)
    )
      return;
    this.x = clamp(this.x, bounds.x);
    this.z = clamp(this.z, bounds.z);
    this.walking = false;
    if (!allowed || reduced) {
      this.goal = null;
      this.wait = Math.max(this.wait, 1.2);
    } else {
      this.wait = Math.max(0, this.wait - dt);
      if (this.wait === 0 && !this.goal) {
        this.goal = this.chooseGoal(bounds, other);
        if (!this.goal) this.wait = 0.8;
      }
      if (this.goal) {
        this.goal.x = clamp(this.goal.x, bounds.x);
        this.goal.z = clamp(this.goal.z, bounds.z);
        const dx = this.goal.x - this.x,
          dz = this.goal.z - this.z;
        const remaining = Math.hypot(dx, dz);
        if (remaining < 0.1) {
          this.goal = null;
          this.wait = 3.5 + this.random() * 5;
          this.idleHeading = (this.random() - 0.5) * 0.75;
        } else {
          let vx = dx / remaining,
            vz = dz / remaining;
          const gap = distance(this, other);
          if (gap < 1.9 && gap > 0.001) {
            const strength = (1.9 - gap) * 1.8;
            vx += ((this.x - other.x) / gap) * strength;
            vz += ((this.z - other.z) / gap) * strength;
          }
          const direction = Math.atan2(vx, vz);
          const turn = Math.atan2(
            Math.sin(direction - this.heading),
            Math.cos(direction - this.heading),
          );
          this.heading += Math.max(-dt * 2.8, Math.min(dt * 2.8, turn));
          const speed =
            (this.pet === "jew" ? 0.42 : 0.53) * Math.max(0.12, Math.cos(turn));
          const step = Math.min(remaining, speed * dt);
          const next = {
            x: clamp(this.x + Math.sin(this.heading) * step, bounds.x),
            z: clamp(this.z + Math.cos(this.heading) * step, bounds.z),
          };
          // Never walk through the other pet, even when their goals cross.
          if (distance(next, other) >= 1.45 || distance(next, other) > gap) {
            const moved = distance(this, next);
            this.x = next.x;
            this.z = next.z;
            this.stride += moved * (this.pet === "jew" ? 12 : 10);
            this.walking = moved > 0.00001;
          } else {
            this.goal = null;
            this.wait = 0.7 + this.random();
          }
        }
      }
    }
    if (!this.walking) {
      const turn = Math.atan2(
        Math.sin(this.idleHeading - this.heading),
        Math.cos(this.idleHeading - this.heading),
      );
      if (!reduced) this.heading += turn * Math.min(1, dt * 2);
    }
    this.stand += ((this.walking ? 1 : 0) - this.stand) * Math.min(1, dt * 7);
  }
}
