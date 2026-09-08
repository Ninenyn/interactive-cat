import {
  classifyGesture,
  screenToPoint,
  type Point,
  type Zone,
} from "./gestureClassifier";
import { RoomRuntime } from "./roomRuntime";
import type { Companion } from "./companionStateMachine";

const DRAG_THRESHOLD = 12;
const JEW_DRAG_LIMIT = 2200;

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
  let zone: Zone = "air",
    held = false,
    dragging = false;
  let dragOffset = { x: 0, z: 0 };
  let latestPoint: Point = { x: 0, y: 0 };
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  let biteTimer: ReturnType<typeof setTimeout> | undefined;

  const stopHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = undefined;
  };
  const stopBiteTimer = () => {
    if (biteTimer) clearTimeout(biteTimer);
    biteTimer = undefined;
  };
  const setDragging = (pet: Companion, value: boolean) => {
    const anchor = runtime.pets[pet].anchor;
    if (anchor) anchor.dataset.dragging = String(value);
    element.style.cursor = value ? "grabbing" : "grab";
  };
  const point = (e: PointerEvent) =>
    screenToPoint(e.clientX, e.clientY, element.getBoundingClientRect());

  const dropJew = () => {
    if (pointer === null || selected !== "jew" || !dragging) return;
    const pet = runtime.pets.jew;
    if (pet.machine.biteFromDrag(latestPoint)) onEngaged("jew");
    dragging = false;
    held = false;
    setDragging("jew", false);
    const captured = pointer;
    pointer = null;
    selected = null;
    element.style.cursor = "default";
    if (element.hasPointerCapture(captured)) element.releasePointerCapture(captured);
  };

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
    dragging = false;
    stopBiteTimer();
    const rect = element.getBoundingClientRect(),
      p = point(e),
      hit = runtime.hit(p, rect.width, rect.height);
    latestPoint = p;
    selected = hit?.pet ?? null;
    zone = hit?.zone ?? "air";
    element.setPointerCapture(e.pointerId);
    if (!selected) return;
    const pet = runtime.pets[selected];
    runtime.select(selected);
    dragOffset = runtime.dragOffset(selected, p, rect.width, rect.height);
    pet.motion.pause(3);
    onEngaged(selected);
    pet.machine.track(p, 0, true);
    holdTimer = setTimeout(() => {
      if (pointer !== null && selected && distance < DRAG_THRESHOLD && !dragging) {
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
      rect = element.getBoundingClientRect(),
      hit = runtime.hit(p, rect.width, rect.height);
    latestPoint = p;

    if (pointer === null) {
      element.style.cursor = hit ? "grab" : "default";
      if (e.pointerType === "mouse" && hit) {
        const pet = runtime.pets[hit.pet];
        pet.machine.track(p, 0, true);
      }
      return;
    }
    if (e.pointerId !== pointer) return;

    const dx = e.clientX - x,
      dy = e.clientY - y,
      step = Math.hypot(dx, dy),
      speed = step / Math.max(16, now - lastTime);
    distance += step;
    maxSpeed = Math.max(maxSpeed * 0.92, speed);
    if (Math.abs(dx) > 2) {
      const sign = Math.sign(dx);
      if (direction && direction !== sign) reversals++;
      direction = sign;
    }

    if (selected) {
      const pet = runtime.pets[selected];
      const locked = ["digging", "heart-note"].includes(
        pet.machine.getSnapshot().state,
      );
      if (
        !dragging &&
        !locked &&
        distance >= DRAG_THRESHOLD &&
        ["head", "chin", "body"].includes(zone)
      ) {
        dragging = true;
        held = false;
        stopHold();
        setDragging(selected, true);
        pet.motion.pause(1);
        if (selected === "jew") {
          stopBiteTimer();
          biteTimer = setTimeout(dropJew, JEW_DRAG_LIMIT);
        }
      }

      if (dragging) {
        runtime.dragPet(selected, p, rect.width, rect.height, dragOffset);
        pet.machine.track(p, 0, false);
        x = e.clientX;
        y = e.clientY;
        lastTime = now;
        return;
      }

      if (distance > 18) stopHold();
      pet.motion.pause(2.5);
      pet.machine.track(p, 0, hit?.pet === selected);
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
    stopBiteTimer();
    const wasDragging = dragging;
    const releasedPet = selected;
    if (releasedPet && wasDragging) {
      setDragging(releasedPet, false);
    } else if (selected && !held) {
      const classified = classifyGesture(
        distance,
        performance.now() - start,
        maxSpeed,
        reversals,
      );
      const gesture = classified === "fast" ? "tap" : classified;
      if (runtime.pets[selected].machine.engage(gesture, zone, point(e)))
        onEngaged(selected);
    } else if (!selected && distance < 12) {
      const rect = element.getBoundingClientRect();
      runtime.walkTo(point(e), rect.width, rect.height);
    }
    pointer = null;
    selected = null;
    dragging = false;
    held = false;
    element.style.cursor = "default";
    if (element.hasPointerCapture(e.pointerId))
      element.releasePointerCapture(e.pointerId);
  };

  const cancel = () => {
    stopHold();
    stopBiteTimer();
    const captured = pointer,
      releasedPet = selected;
    pointer = null;
    selected = null;
    held = false;
    dragging = false;
    if (releasedPet) setDragging(releasedPet, false);
    element.style.cursor = "default";
    if (captured !== null && element.hasPointerCapture(captured))
      element.releasePointerCapture(captured);
    runtime.cancelPointers();
  };
  const lostCapture = () => {
    if (pointer !== null) cancel();
  };
  const leave = () => {
    if (pointer === null) element.style.cursor = "default";
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
    stopBiteTimer();
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
    element.removeEventListener("lostpointercapture", lostCapture);
    element.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", cancel);
  };
}
