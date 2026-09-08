import type { Point } from "./gestureClassifier";
export const CAMERA_TARGET_Y = 0.65;
export const CAMERA_PITCH = Math.atan2(7.5 - CAMERA_TARGET_Y, 12);
export const roomZoom = (width: number, height: number) =>
  Math.min(width / 5.8, height / 6.5, 145);
export function roomBounds(width: number, height: number) {
  const zoom = roomZoom(width, height);
  return {
    x: Math.max(0.8, Math.min(4, width / zoom / 2 - 2.2)),
    z: Math.max(1.2, Math.min(3.1, (height / zoom) * 0.23)),
  };
}
export function screenToGround(point: Point, width: number, height: number) {
  const zoom = roomZoom(width, height);
  return {
    x: (point.x * width) / (2 * zoom),
    z:
      (-CAMERA_TARGET_Y * Math.cos(CAMERA_PITCH) -
        (point.y * height) / (2 * zoom)) /
      Math.sin(CAMERA_PITCH),
  };
}
export function groundToScreen(
  x: number,
  z: number,
  width: number,
  height: number,
) {
  const zoom = roomZoom(width, height);
  return {
    x: width / 2 + x * zoom,
    y:
      height / 2 +
      (CAMERA_TARGET_Y * Math.cos(CAMERA_PITCH) + z * Math.sin(CAMERA_PITCH)) *
        zoom,
  };
}
export function screenAtDepth(
  point: Point,
  z: number,
  width: number,
  height: number,
) {
  const zoom = roomZoom(width, height);
  return {
    x: (point.x * width) / (2 * zoom),
    y:
      CAMERA_TARGET_Y +
      ((point.y * height) / (2 * zoom) + z * Math.sin(CAMERA_PITCH)) /
        Math.cos(CAMERA_PITCH),
  };
}
