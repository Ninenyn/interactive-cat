import { describe, expect, it } from "vitest";
import { Wanderer } from "../../src/interactions/wandering";
import {
  groundToScreen,
  screenToGround,
  roomBounds,
} from "../../src/interactions/roomCoordinates";
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
describe("shared room locomotion", () => {
  it("walks with a distance-driven gait and stays inside phone bounds", () => {
    const cat = new Wanderer("jew", seeded(10)),
      dog = new Wanderer("bo", seeded(22)),
      bounds = roomBounds(390, 844);
    let catTravel = 0,
      dogTravel = 0,
      closest = Infinity;
    for (let i = 0; i < 7200; i++) {
      const before = [cat.x, cat.z, dog.x, dog.z];
      cat.step(1 / 60, bounds, dog);
      dog.step(1 / 60, bounds, cat);
      catTravel += Math.hypot(cat.x - before[0], cat.z - before[1]);
      dogTravel += Math.hypot(dog.x - before[2], dog.z - before[3]);
      closest = Math.min(closest, Math.hypot(cat.x - dog.x, cat.z - dog.z));
      for (const pet of [cat, dog]) {
        expect(Math.abs(pet.x)).toBeLessThanOrEqual(bounds.x);
        expect(Math.abs(pet.z)).toBeLessThanOrEqual(bounds.z);
      }
    }
    expect(catTravel).toBeGreaterThan(4);
    expect(dogTravel).toBeGreaterThan(4);
    expect(cat.stride).toBeGreaterThan(0);
    expect(dog.stride).toBeGreaterThan(0);
    expect(closest).toBeGreaterThanOrEqual(1.449);
  });
  it("stops for interaction and reduced motion instead of sliding while seated", () => {
    const cat = new Wanderer("jew", seeded(3)),
      other = { x: 1.4, z: -1.2 },
      bounds = { x: 2, z: 2 };
    cat.goTo({ x: -1.3, z: -1.6 }, bounds);
    for (let i = 0; i < 120; i++) cat.step(1 / 60, bounds, other);
    const position = { x: cat.x, z: cat.z };
    for (let i = 0; i < 120; i++) cat.step(1 / 60, bounds, other, false);
    expect({ x: cat.x, z: cat.z }).toEqual(position);
    expect(cat.stand).toBeLessThan(0.01);
    for (let i = 0; i < 120; i++) cat.step(1 / 60, bounds, other, true, true);
    expect({ x: cat.x, z: cat.z }).toEqual(position);
    expect(cat.walking).toBe(false);
  });
  it("clamps a floor invitation and a resized room without invalid coordinates", () => {
    const dog = new Wanderer("bo", seeded(5)),
      other = { x: -4, z: 4 },
      bounds = { x: 1.8, z: 2 };
    dog.goTo({ x: 99, z: 99 }, bounds);
    for (let i = 0; i < 1000; i++) dog.step(1 / 60, bounds, other);
    expect(dog.x).toBeLessThanOrEqual(1.8);
    expect(dog.z).toBeLessThanOrEqual(2);
    dog.step(0.1, { x: 1.2, z: 1.1 }, other);
    expect(Math.abs(dog.x)).toBeLessThanOrEqual(1.2);
    expect(Math.abs(dog.z)).toBeLessThanOrEqual(1.1);
  });
  it("projects floor taps and heart-note locations through the same camera at every size", () => {
    for (const [width, height] of [
      [320, 844],
      [390, 844],
      [844, 390],
      [1280, 900],
    ]) {
      for (const point of [
        { x: -1, z: 0.7 },
        { x: 1.3, z: -1.8 },
        { x: 0, z: 0 },
      ]) {
        const p = groundToScreen(point.x, point.z, width, height);
        const restored = screenToGround(
          { x: (p.x / width) * 2 - 1, y: 1 - (p.y / height) * 2 },
          width,
          height,
        );
        expect(restored.x).toBeCloseTo(point.x, 8);
        expect(restored.z).toBeCloseTo(point.z, 8);
      }
    }
  });
});
