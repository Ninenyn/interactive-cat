import {
  CompanionMachine,
  type Behavior,
  type Companion,
} from "./companionStateMachine";
import type { Point, Zone } from "./gestureClassifier";
import { Wanderer } from "./wandering";
import { screenToGround, roomBounds } from "./roomCoordinates";
import { HeartScheduler } from "../heart-notes/scheduler";
import { SoftAudio } from "../audio/softAudio";
export const companions: Companion[] = ["jew", "bo"];
export type HitCircle = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  zone: Zone;
};
export type PetRuntime = {
  machine: CompanionMachine;
  motion: Wanderer;
  hits: HitCircle[];
  anchor: HTMLButtonElement | null;
};
export class RoomRuntime {
  readonly pets: Record<Companion, PetRuntime> = {
    jew: {
      machine: new CompanionMachine("jew"),
      motion: new Wanderer("jew"),
      hits: [],
      anchor: null,
    },
    bo: {
      machine: new CompanionMachine("bo"),
      motion: new Wanderer("bo"),
      hits: [],
      anchor: null,
    },
  };
  active: Companion = "jew";
  readonly audio = new SoftAudio();
  scheduler = new HeartScheduler(true);
  paused = false;
  hasNote = false;
  noteGround = { x: 0, z: 0 };
  get machine() {
    return this.pets[this.active].machine;
  }
  initialize(
    firstSession: boolean,
    onEffect: (state: Behavior, pet: Companion) => void,
  ) {
    this.scheduler = new HeartScheduler(firstSession);
    for (const pet of companions)
      this.pets[pet].machine.onEffect = (state) => onEffect(state, pet);
  }
  select(pet: Companion) {
    this.active = pet;
  }
  bindAnchor(pet: Companion, element: HTMLButtonElement | null) {
    this.pets[pet].anchor = element;
  }
  project(pet: Companion, hits: HitCircle[]) {
    const entry = this.pets[pet];
    entry.hits = hits;
    const element = entry.anchor;
    if (!element || !hits.length) return;
    const left = Math.min(...hits.map((h) => h.x - h.rx));
    const right = Math.max(...hits.map((h) => h.x + h.rx));
    const top = Math.min(...hits.map((h) => h.y - h.ry));
    const bottom = Math.max(...hits.map((h) => h.y + h.ry));
    element.style.transform =
      "translate(" + left.toFixed(2) + "px," + top.toFixed(2) + "px)";
    element.style.width = (right - left).toFixed(2) + "px";
    element.style.height = (bottom - top).toFixed(2) + "px";
    element.dataset.walking = String(entry.motion.walking);
    element.dataset.x = entry.motion.x.toFixed(3);
    element.dataset.z = entry.motion.z.toFixed(3);
    const head = hits.find((h) => h.zone === "head");
    if (head) {
      element.dataset.headX = head.x.toFixed(2);
      element.dataset.headY = head.y.toFixed(2);
    }
  }
  hit(point: Point, width: number, height: number) {
    const x = ((point.x + 1) * width) / 2,
      y = ((1 - point.y) * height) / 2;
    const frontFirst = [...companions].sort(
      (a, b) => this.pets[b].motion.z - this.pets[a].motion.z,
    );
    for (const pet of frontFirst) {
      const hit = this.pets[pet].hits.find(
        (h) =>
          Math.pow((x - h.x) / h.rx, 2) + Math.pow((y - h.y) / h.ry, 2) <= 1,
      );
      if (hit) return { pet, zone: hit.zone };
    }
    return null;
  }
  walkTo(point: Point, width: number, height: number) {
    const target = screenToGround(point, width, height);
    const nearest = [...companions].sort(
      (a, b) =>
        Math.hypot(
          this.pets[a].motion.x - target.x,
          this.pets[a].motion.z - target.z,
        ) -
        Math.hypot(
          this.pets[b].motion.x - target.x,
          this.pets[b].motion.z - target.z,
        ),
    )[0];
    this.active = nearest;
    this.pets[nearest].motion.goTo(target, roomBounds(width, height));
  }
  advance(ms: number) {
    if (this.paused) return;
    for (const pet of companions) this.pets[pet].machine.advance(ms);
    const preferred = this.pets[this.active];
    const candidate = preferred.machine.canDiscover()
      ? this.active
      : companions.find((p) => this.pets[p].machine.canDiscover());
    const engagement = companions.reduce(
      (n, p) => n + this.pets[p].machine.engagement,
      0,
    );
    if (
      this.scheduler.advance(
        ms,
        engagement,
        Boolean(candidate) && !this.hasNote,
      )
    ) {
      const pet = this.pets[candidate!];
      pet.motion.pause(4);
      this.noteGround = { x: pet.motion.x + 0.55, z: pet.motion.z + 0.75 };
      pet.machine.dig();
    }
  }
  setPaused(value: boolean) {
    this.paused = value;
  }
  setHasNote(value: boolean) {
    this.hasNote = value;
  }
  dismissNote() {
    this.hasNote = false;
    for (const pet of companions) this.pets[pet].machine.dismissNote();
  }
  cancelPointers() {
    for (const pet of companions) this.pets[pet].machine.cancelPointer();
  }
  dispose() {
    for (const pet of companions) this.pets[pet].machine.onEffect = undefined;
    this.audio.dispose();
  }
}
