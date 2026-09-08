import {
  CompanionMachine,
  type Behavior,
  type Companion,
} from "./companionStateMachine";
import type { Point, Zone } from "./gestureClassifier";
import { Wanderer, type GroundPoint } from "./wandering";
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
  active: Companion;
  visiblePet: Companion;
  readonly audio = new SoftAudio();
  scheduler = new HeartScheduler(true);
  paused = false;
  hasNote = false;
  noteGround = { x: 0, z: 0 };

  constructor(initialPet: Companion = "jew") {
    this.active = initialPet;
    this.visiblePet = initialPet;
  }

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
  setVisiblePet(pet: Companion) {
    if (this.visiblePet !== pet) this.cancelPointers();
    this.visiblePet = pet;
    this.active = pet;
    for (const candidate of companions)
      if (candidate !== pet) this.pets[candidate].hits = [];
  }
  bindAnchor(pet: Companion, element: HTMLButtonElement | null) {
    this.pets[pet].anchor = element;
  }
  project(pet: Companion, hits: HitCircle[]) {
    const entry = this.pets[pet];
    if (pet !== this.visiblePet) {
      entry.hits = [];
      return;
    }
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
    const pet = this.visiblePet;
    const hit = this.pets[pet].hits.find(
      (h) =>
        Math.pow((x - h.x) / h.rx, 2) + Math.pow((y - h.y) / h.ry, 2) <= 1,
    );
    return hit ? { pet, zone: hit.zone } : null;
  }
  walkTo(point: Point, width: number, height: number) {
    const target = screenToGround(point, width, height),
      pet = this.visiblePet;
    this.active = pet;
    this.pets[pet].motion.goTo(target, roomBounds(width, height));
  }
  dragOffset(pet: Companion, point: Point, width: number, height: number) {
    const ground = screenToGround(point, width, height),
      motion = this.pets[pet].motion;
    return { x: motion.x - ground.x, z: motion.z - ground.z };
  }
  dragPet(
    pet: Companion,
    point: Point,
    width: number,
    height: number,
    offset: GroundPoint = { x: 0, z: 0 },
  ) {
    if (pet !== this.visiblePet) return;
    const ground = screenToGround(point, width, height);
    this.pets[pet].motion.place(
      { x: ground.x + offset.x, z: ground.z + offset.z },
      roomBounds(width, height),
    );
  }
  advance(ms: number) {
    if (this.paused) return;
    for (const pet of companions) this.pets[pet].machine.advance(ms);
    const candidate = this.visiblePet,
      machine = this.pets[candidate].machine;
    if (
      this.scheduler.advance(
        ms,
        machine.engagement,
        machine.canDiscover() && !this.hasNote,
      )
    ) {
      const pet = this.pets[candidate];
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
