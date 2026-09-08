import { describe, it, expect } from "vitest";
import * as T from "three";
import { AnimalRig, type AnimalInput } from "../../src/companions/animalRig";
import jew from "../../src/assets/pets/jew.json";
import bo from "../../src/assets/pets/bo.json";
import type { Behavior } from "../../src/interactions/companionStateMachine";

const input = (state: Behavior, stand = 0): AnimalInput => ({
  state,
  stand,
  delta: 1 / 60,
  time: 0,
  stride: 0,
  walking: false,
  dragging: false,
  reduced: false,
  target: { x: 0, y: 0 },
});
for (const pet of ["jew", "bo"] as const)
  describe(pet + " skeletal model", () => {
    it("has one connected surface with normalized, valid bone weights", () => {
      const asset = pet === "jew" ? jew : bo,
        count = asset.positions.length / 3;
      const neighbors = Array.from({ length: count }, () => new Set<number>());
      for (let i = 0; i < asset.indices.length; i += 3) {
        const [a, b, c] = asset.indices.slice(i, i + 3);
        neighbors[a].add(b).add(c);
        neighbors[b].add(a).add(c);
        neighbors[c].add(a).add(b);
      }
      const visited = new Set<number>(),
        queue = [asset.indices[0]];
      while (queue.length) {
        const next = queue.pop()!;
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(...[...neighbors[next]].filter((n) => !visited.has(n)));
      }
      expect(visited.size).toBe(new Set(asset.indices).size);
      for (let i = 0; i < count; i++) {
        expect(
          asset.skinWeight.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0),
        ).toBeCloseTo(1, 5);
        for (const n of asset.skinIndex.slice(i * 4, i * 4 + 4))
          expect(n).toBeLessThan(asset.bones.length);
      }
    });
    it("keeps bone lengths and finite skin positions throughout every pose transition", () => {
      const rig = new AnimalRig(pet),
        rest = rig.bones.map((b) => b.position.length());
      const states: Behavior[] = [
        "idle",
        "stretch",
        "sleeping",
        "digging",
        "paw",
        "groom",
        "bite",
        "lick",
        "breathing",
        "idle",
      ];
      const p = new T.Vector3(),
        before = new T.Vector3();
      for (const state of states) {
        const frame = input(state);
        for (let i = 0; i < 90; i++) {
          frame.time += frame.delta;
          rig.mesh.getVertexPosition(0, before);
          rig.update(frame);
          rig.mesh.getVertexPosition(0, p);
          expect(p.distanceTo(before)).toBeLessThan(0.35);
          for (let j = 1; j < rig.bones.length; j++)
            expect(rig.bones[j].position.length()).toBeCloseTo(rest[j], 6);
        }
        for (
          let i = 0;
          i < rig.mesh.geometry.attributes.position.count;
          i += 3
        ) {
          rig.mesh.getVertexPosition(i, p);
          expect(p.toArray().every(Number.isFinite)).toBe(true);
        }
        expect(rig.root.scale.toArray()).toEqual([1, 1, 1]);
      }
      rig.dispose();
    });
    it("keeps a stance paw steady while the animal advances", () => {
      const rig = new AnimalRig(pet),
        frame = input("idle", 1);
      for (let i = 0; i < 120; i++) rig.update(frame);
      frame.walking = true;
      let z = 0,
        previous: T.Vector3 | null = null,
        samples = 0;
      for (let i = 0; i < 180; i++) {
        const distance = (pet === "jew" ? 0.42 : 0.53) / 60;
        z += distance;
        frame.stride += distance * (pet === "jew" ? 12 : 10);
        frame.time += 1 / 60;
        rig.moveTo(0, z, 0, 1 / 60);
        rig.update(frame);
        const phase = (frame.stride / (2 * Math.PI)) % 1;
        const paw = rig.legs[0].paw.getWorldPosition(new T.Vector3());
        if (phase > 0.22 && phase < 0.5) {
          if (previous) {
            expect(paw.distanceTo(previous)).toBeLessThan(0.025);
            samples++;
          }
          previous = paw;
        } else previous = null;
      }
      expect(samples).toBeGreaterThan(12);
      expect(rig.root.position.z).toBeGreaterThan(1);
      rig.dispose();
    });
    it("plants feet on the floor and lifts the body when carried", () => {
      const rig = new AnimalRig(pet),
        frame = input("idle", 1);
      for (let i = 0; i < 180; i++) {
        frame.time += frame.delta;
        rig.update(frame);
      }
      for (const leg of rig.legs) {
        const p = leg.paw.getWorldPosition(new T.Vector3());
        expect(p.y).toBeCloseTo(0.14, 2);
      }
      const y = rig.byName.pelvis.position.y;
      frame.dragging = true;
      for (let i = 0; i < 90; i++) {
        frame.time += frame.delta;
        rig.update(frame);
      }
      expect(rig.byName.pelvis.position.y).toBeGreaterThan(y + 0.4);
      expect(
        rig.legs.every(
          (leg) => leg.paw.getWorldPosition(new T.Vector3()).y > 0.2,
        ),
      ).toBe(true);
      rig.dispose();
    });
  });
