import { classifyGesture, screenToPoint, type Zone } from "./gestureClassifier";
import { RoomRuntime } from "./roomRuntime";
import type { Companion } from "./companionStateMachine";
export function connectPointerEngine(
  element: HTMLElement,
  runtime: RoomRuntime,
  onEngaged: (pet: Companion) => void,
) {
  let pointer: number | null = null,
    selected: Companion | null = null;
  let start = 0,
    lastTime = 0,
    x = 0,
    y = 0,
    distance = 0,
    maxSpeed = 0,
    reversals = 0,
    direction = 0,
    lastPet = 0;
  let hoverTime = 0,
    hoverX = 0,
    hoverY = 0;
  let zone: Zone = "air",
    held = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  const stopHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = undefined;
  };
  const point = (e: PointerEvent) =>
    screenToPoint(e.clientX, e.clientY, element.getBoundingClientRect());
  const down = (e: PointerEvent) => {
    if (
      runtime.paused ||
      !e.isPrimary ||
      (e.pointerType === "mouse" && e.button !== 0) ||
      (e.target as HTMLElement).closest("button,a,dialog")
    )
      return;
    pointer = e.pointerId;
    start = lastTime = performance.now();
    x = e.clientX;
    y = e.clientY;
    distance = maxSpeed = reversals = direction = 0;
    held = false;
    const rect = element.getBoundingClientRect(),
      p = point(e),
      hit = runtime.hit(p, rect.width, rect.height);
    selected = hit?.pet ?? null;
    zone = hit?.zone ?? "air";
    element.setPointerCapture(e.pointerId);
    if (!selected) return;
    const pet = runtime.pets[selected];
    runtime.select(selected);
    pet.motion.pause(3);
    onEngaged(selected);
    pet.machine.track(p);
    holdTimer = setTimeout(() => {
      if (pointer !== null && selected && distance < 18) {
        held = true;
        if (pet.machine.engage("hold", zone, pet.machine.target))
          onEngaged(selected);
      }
    }, 750);
  };
  const move = (e: PointerEvent) => {
    if (runtime.paused || !e.isPrimary) return;
    const now = performance.now(),
      p = point(e),
      rect = element.getBoundingClientRect();
    const hit = runtime.hit(p, rect.width, rect.height);
    element.style.cursor = hit ? "grab" : "default";
    if (pointer === null) {
      if (e.pointerType !== "mouse") return;
      const dt = now - hoverTime;
      const speed =
        dt > 0 && dt < 160
          ? Math.hypot(e.clientX - hoverX, e.clientY - hoverY) /
            Math.max(16, dt)
          : 0;
      hoverTime = now;
      hoverX = e.clientX;
      hoverY = e.clientY;
      if (hit) {
        const pet = runtime.pets[hit.pet];
        pet.motion.pause(1);
        pet.machine.track(p, speed, true);
      }
      // A nibble follows the real pointer until release, including outside the body.
      for (const pet of Object.values(runtime.pets)) {
        if (
          ["hunting", "pounce", "bite", "boop", "lick"].includes(
            pet.machine.getSnapshot().state,
          )
        )
          pet.machine.track(p, 0, false);
      }
      return;
    }
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - x,
      dy = e.clientY - y,
      step = Math.hypot(dx, dy);
    const speed = step / Math.max(16, now - lastTime);
    distance += step;
    maxSpeed = Math.max(maxSpeed * 0.92, speed);
    if (Math.abs(dx) > 2) {
      const sign = Math.sign(dx);
      if (direction && direction !== sign) reversals++;
      direction = sign;
    }
    if (distance > 18) stopHold();
    if (selected) {
      const pet = runtime.pets[selected];
      pet.motion.pause(2.5);
      pet.machine.track(p, speed, hit?.pet === selected);
      if (
        distance > 14 &&
        speed < 0.48 &&
        now - lastPet > 500 &&
        hit?.pet === selected &&
        !held
      ) {
        if (
          pet.machine.engage(reversals >= 2 ? "scratch" : "stroke", hit.zone, p)
        )
          onEngaged(selected);
        lastPet = now;
      }
    }
    x = e.clientX;
    y = e.clientY;
    lastTime = now;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    stopHold();
    if (selected && !held) {
      if (
        runtime.pets[selected].machine.engage(
          classifyGesture(
            distance,
            performance.now() - start,
            maxSpeed,
            reversals,
          ),
          zone,
          point(e),
        )
      )
        onEngaged(selected);
    } else if (!selected && distance < 12) {
      const rect = element.getBoundingClientRect();
      runtime.walkTo(point(e), rect.width, rect.height);
    }
    pointer = null;
    selected = null;
    if (element.hasPointerCapture(e.pointerId))
      element.releasePointerCapture(e.pointerId);
  };
  const cancel = () => {
    stopHold();
    const captured = pointer;
    pointer = null;
    selected = null;
    if (captured !== null && element.hasPointerCapture(captured))
      element.releasePointerCapture(captured);
    runtime.cancelPointers();
  };
  const lostCapture = () => {
    if (pointer !== null) cancel();
  };
  const leave = () => {
    hoverTime = 0;
  };
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
  element.addEventListener("lostpointercapture", lostCapture);
  element.addEventListener("pointerleave", leave);
  window.addEventListener("blur", cancel);
  return () => {
    stopHold();
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
    element.removeEventListener("lostpointercapture", lostCapture);
    element.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", cancel);
  };
}
