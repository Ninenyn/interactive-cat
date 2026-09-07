export type Zone = "head" | "chin" | "body" | "paw" | "tail" | "air";
export type Point = { x: number; y: number };
export type Sample = Point & { time: number };
export type Gesture = "tap" | "stroke" | "scratch" | "fast" | "hold";
export function classifyGesture(
  distance: number,
  duration: number,
  speed: number,
  reversals: number,
): Gesture {
  if (duration >= 700 && distance < 18) return "hold";
  if (speed > 0.48 && distance > 24) return "fast";
  if (reversals >= 2 && distance > 18) return "scratch";
  if (distance > 12) return "stroke";
  return "tap";
}
export function screenToPoint(
  x: number,
  y: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): Point {
  return {
    x: Math.max(-1, Math.min(1, ((x - rect.left) / rect.width) * 2 - 1)),
    y: Math.max(-1, Math.min(1, 1 - ((y - rect.top) / rect.height) * 2)),
  };
}
// Matches the orthographic scene camera, including its responsive zoom.
export function pointToWorld(
  point: Point,
  width: number,
  height: number,
): Point {
  const zoom = Math.min(width / 3.9, height / 3.6);
  return {
    x: (point.x * width) / zoom / 2,
    y: 1.35 + (point.y * height) / zoom / 2,
  };
}
export function hitZone(point: Point, width: number, height: number): Zone {
  const p = pointToWorld(point, width, height);
  if (Math.abs(p.x) > 0.88 && p.y < 1.3 && p.y > 0.03) return "tail";
  if (Math.abs(p.x) > 0.94 || p.y < -0.1 || p.y > 2.85) return "air";
  if (p.y < 0.5) return "paw";
  if (p.y < 1.35) return "body";
  if (p.y < 1.67) return "chin";
  return "head";
}
