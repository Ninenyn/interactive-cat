import {
  classifyGesture,
  hitZone,
  screenToPoint,
  type Zone,
} from "./gestureClassifier";
import { CompanionMachine } from "./companionStateMachine";
export function connectPointerEngine(
  element: HTMLElement,
  machine: CompanionMachine,
  onEngaged: () => void,
) {
  let pointer: number | null = null;
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
  let zone: Zone = "air";
  let held = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;
  const stopHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = undefined;
  };
  const point = (e: PointerEvent) =>
    screenToPoint(e.clientX, e.clientY, element.getBoundingClientRect());
  const down = (e: PointerEvent) => {
    if (
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
      p = point(e);
    zone = hitZone(p, rect.width, rect.height);
    element.setPointerCapture(e.pointerId);
    onEngaged();
    machine.track(p);
    holdTimer = setTimeout(() => {
      if (pointer !== null && distance < 18) {
        held = true;
        if (machine.engage("hold", zone, machine.target)) onEngaged();
      }
    }, 750);
  };
  const move = (e: PointerEvent) => {
    if (!e.isPrimary) return;
    const now = performance.now(),
      p = point(e),
      rect = element.getBoundingClientRect();
    const near = hitZone(p, rect.width, rect.height) !== "air";
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
      machine.track(p, speed, near);
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
    machine.track(p, speed, near);
    if (distance > 14 && speed < 0.48 && now - lastPet > 500 && near && !held) {
      if (machine.engage(reversals >= 2 ? "scratch" : "stroke", zone, p))
        onEngaged();
      lastPet = now;
    }
    x = e.clientX;
    y = e.clientY;
    lastTime = now;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    stopHold();
    if (
      !held &&
      machine.engage(
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
      onEngaged();
    if (element.hasPointerCapture(e.pointerId))
      element.releasePointerCapture(e.pointerId);
    pointer = null;
  };
  const cancel = () => {
    stopHold();
    pointer = null;
    machine.cancelPointer();
  };
  const leave = () => {
    hoverTime = 0;
    if (pointer === null && machine.getSnapshot().state === "watching")
      machine.target = { x: 0, y: 0 };
  };
  element.addEventListener("pointerdown", down);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", up);
  element.addEventListener("pointercancel", cancel);
  element.addEventListener("pointerleave", leave);
  window.addEventListener("blur", cancel);
  return () => {
    stopHold();
    element.removeEventListener("pointerdown", down);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", up);
    element.removeEventListener("pointercancel", cancel);
    element.removeEventListener("pointerleave", leave);
    window.removeEventListener("blur", cancel);
  };
}
