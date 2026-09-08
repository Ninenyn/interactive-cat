import { describe, it, expect } from "vitest";
import {
  CompanionMachine,
  BITE_COOLDOWN,
  type Behavior,
} from "../../src/interactions/companionStateMachine";
import {
  classifyGesture,
  screenToPoint,
  hitZone,
} from "../../src/interactions/gestureClassifier";
import { HeartScheduler } from "../../src/heart-notes/scheduler";
import { messages, chooseMessage } from "../../src/heart-notes/messages";
import { parsePreferences, STORAGE_KEY } from "../../src/heart-notes/storage";
function advance(machine: CompanionMachine, ms: number) {
  for (let t = 0; t < ms; t += 100) machine.advance(Math.min(100, ms - t));
}
function ready(pet: "jew" | "bo" = "jew", random = () => 0.1) {
  const m = new CompanionMachine(pet, random);
  advance(m, 1000);
  return m;
}
describe("coordinated companion behavior", () => {
  it("responds to the first greeting while an already visible pet is arriving", () => {
    const cat = new CompanionMachine("jew");
    const dog = new CompanionMachine("bo");
    expect(cat.engage("tap", "head", { x: 0, y: 0 })).toBe(true);
    expect(cat.getSnapshot().state).toBe("blink");
    expect(dog.engage("tap", "paw", { x: 0, y: 0 })).toBe(true);
    expect(dog.getSnapshot().state).toBe("paw");
  });
  it("occasionally bites, releases, and enforces a cooldown across more hunting attempts", () => {
    const m = ready(),
      events: Behavior[] = [];
    m.onEffect = (s) => events.push(s);
    m.track({ x: 0.4, y: 0.2 }, 0.8);
    advance(m, 1600);
    expect(events).toEqual(
      expect.arrayContaining(["hunting", "pounce", "bite", "release"]),
    );
    const bites = events.filter((s) => s === "bite").length;
    advance(m, 6000);
    m.hunt();
    advance(m, 1600);
    expect(events.filter((s) => s === "bite")).toHaveLength(bites);
    advance(m, BITE_COOLDOWN);
    m.hunt();
    advance(m, 1600);
    expect(events.filter((s) => s === "bite")).toHaveLength(bites + 1);
  });
  it("uses chance: most hunting outcomes are not bites", () => {
    const m = ready("jew", () => 0.8),
      events: Behavior[] = [];
    m.onEffect = (s) => events.push(s);
    m.hunt();
    advance(m, 2000);
    expect(events).toContain("pounce");
    expect(events).not.toContain("bite");
  });
  it("Bo boops and licks but never bites", () => {
    for (const roll of [0.1, 0.8]) {
      const m = ready("bo", () => roll),
        events: Behavior[] = [];
      m.onEffect = (s) => events.push(s);
      m.hunt();
      advance(m, 2000);
      expect(events).toContain(roll < 0.58 ? "boop" : "lick");
      expect(events).not.toContain("bite");
    }
  });
  it("lets Jew nibble out of a long drag while Bo never uses the drag bite", () => {
    const jew = ready("jew"),
      bo = ready("bo");
    expect(jew.biteFromDrag({ x: 0.25, y: -0.1 })).toBe(true);
    expect(jew.getSnapshot().state).toBe("bite");
    expect(jew.target).toEqual({ x: 0.25, y: -0.1 });
    expect(bo.biteFromDrag({ x: 0.25, y: -0.1 })).toBe(false);
    expect(bo.getSnapshot().state).not.toBe("bite");
  });
  it("keeps the bite target at the moving fingertip and lets pointer cancellation recover", () => {
    const m = ready();
    m.hunt();
    m.track({ x: 0.62, y: -0.12 }, 0.8);
    expect(m.target).toEqual({ x: 0.62, y: -0.12 });
    m.cancelPointer();
    expect(m.getSnapshot().state).toBe("release");
    advance(m, 1800);
    expect(m.getSnapshot().state).toBe("idle");
  });
  it("does not let petting interrupt digging or an unopened note", () => {
    const m = ready();
    expect(m.dig()).toBe(true);
    expect(m.engage("stroke", "head", { x: 0, y: 0 })).toBe(false);
    advance(m, 3000);
    expect(m.getSnapshot().state).toBe("heart-note");
    expect(m.dig()).toBe(false);
    m.dismissNote();
    advance(m, 2000);
    expect(m.getSnapshot().state).toBe("idle");
  });
  it("distinguishes chin, paw, tail, and long-press behavior", () => {
    const m = ready();
    m.engage("scratch", "chin", { x: 0, y: 0 });
    expect(m.getSnapshot().state).toBe("petting");
    expect(m.zone).toBe("chin");
    m.engage("tap", "paw", { x: 0, y: -0.5 });
    expect(m.getSnapshot().state).toBe("paw");
    m.engage("tap", "tail", { x: 0.8, y: -0.2 });
    expect(m.getSnapshot().state).toBe("annoyed");
    m.engage("hold", "head", { x: 0, y: 0 });
    expect(m.getSnapshot().state).toBe("breathing");
  });
  it("can switch companions mid-gesture and cancel a pending theme transition", () => {
    const m = ready();
    m.hunt();
    m.switchPet("bo");
    advance(m, 1200);
    expect(m.getSnapshot().pet).toBe("bo");
    m.switchPet("jew");
    m.switchPet("bo");
    advance(m, 1200);
    expect(m.getSnapshot().pet).toBe("bo");
  });
  it("randomizes bounded idle life, and a pet wakes for the user", () => {
    const m = ready("jew", () => 0.99);
    advance(m, 15000);
    expect(m.getSnapshot().state).toBe("sleeping");
    m.engage("tap", "head", { x: 0, y: 0.2 });
    expect(m.getSnapshot().state).toBe("blink");
  });
});
describe("heart notes and durable local preferences", () => {
  it("offers at least 60 unique original notes split between both pets", () => {
    expect(messages.length).toBeGreaterThanOrEqual(60);
    expect(new Set(messages.map((n) => n.text)).size).toBe(messages.length);
    expect(new Set(messages.map((n) => n.id)).size).toBe(messages.length);
    expect(
      messages.filter((n) => n.pet === "jew").length,
    ).toBeGreaterThanOrEqual(30);
  });
  it("does not repeat a note until the companion's collection is exhausted", () => {
    const seen: string[] = [];
    for (let i = 0; i < 36; i++) {
      const n = chooseMessage("jew", seen, () => 0.5);
      expect(seen).not.toContain(n.id);
      seen.push(n.id);
    }
    expect(chooseMessage("jew", seen, () => 0.5).id).not.toBe(seen.at(-1));
  });
  it("requires a little engagement, pauses for busy pets, discovers more often, and caps a session at five", () => {
    const scheduler = new HeartScheduler(true, () => 0);
    expect(scheduler.advance(14000, 0, true)).toBe(false);
    expect(scheduler.advance(0, 2, false)).toBe(false);
    expect(scheduler.advance(0, 2, true)).toBe(true);
    for (let discovery = 1; discovery < 5; discovery++) {
      expect(scheduler.advance(44999, 100, true)).toBe(false);
      expect(scheduler.advance(1, 100, true)).toBe(true);
    }
    expect(scheduler.advance(999999, 100, true)).toBe(false);
  });
  it("gives returning sessions a short but later discovery window", () => {
    const s = new HeartScheduler(false, () => 0);
    expect(s.advance(21999, 8, true)).toBe(false);
    expect(s.advance(1, 8, true)).toBe(true);
  });
  it("validates corrupted or incompatible browser storage without crashing", () => {
    expect(parsePreferences("{bad").seen).toEqual([]);
    expect(
      parsePreferences(JSON.stringify({ version: 7, theme: "dark" })).theme,
    ).toBe(null);
    expect(
      parsePreferences(
        JSON.stringify({
          version: 1,
          theme: "dark",
          sound: "true",
          seen: ["jew-01", "jew-01", "nope", 123],
          favorites: ["bo-02"],
          welcomed: true,
        }),
      ),
    ).toEqual({
      version: 1,
      theme: "dark",
      sound: false,
      seen: ["jew-01"],
      favorites: ["bo-02"],
      welcomed: true,
    });
    expect(STORAGE_KEY).toBe("jew-and-bo:v1");
  });
});
describe("one pointer architecture", () => {
  it("recognizes tap, slow strokes, chin scratches, fast play, and a still hold", () => {
    expect(classifyGesture(2, 100, 0.05, 0)).toBe("tap");
    expect(classifyGesture(70, 500, 0.2, 0)).toBe("stroke");
    expect(classifyGesture(35, 500, 0.2, 3)).toBe("scratch");
    expect(classifyGesture(120, 150, 0.8, 0)).toBe("fast");
    expect(classifyGesture(7, 900, 0.1, 0)).toBe("hold");
  });
  it("normalizes and clamps touch coordinates and maps mobile body zones", () => {
    expect(
      screenToPoint(110, 220, { left: 10, top: 20, width: 200, height: 400 }),
    ).toEqual({ x: 0, y: 0 });
    expect(
      screenToPoint(900, -500, { left: 0, top: 0, width: 320, height: 500 }),
    ).toEqual({ x: 1, y: 1 });
    expect(hitZone({ x: 0, y: 0.25 }, 390, 500)).toBe("head");
    expect(hitZone({ x: 0, y: -0.5 }, 390, 500)).toBe("paw");
  });
});
