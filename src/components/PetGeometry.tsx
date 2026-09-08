"use client";

import { useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";

type Shape = "body" | "catHead" | "dogHead" | "foreleg" | "haunch" | "ear";
type Ring = [y: number, width: number, depth: number, forward: number];
type Vec3 = [number, number, number];

// Deliberately placed cross-sections give each part a continuous silhouette.
// The regular triangles catch real light; coat colors do not add random noise.
const profiles: Record<Shape, Ring[]> = {
  body: [
    [-1, 0, 0, 0],
    [-0.88, 0.56, 0.59, 0],
    [-0.58, 0.9, 0.87, -0.03],
    [-0.15, 1, 1, 0],
    [0.3, 0.94, 0.95, 0.3],
    [0.65, 0.76, 0.76, 0.52],
    [1, 0.55, 0.53, 0.73],
    [1.32, 0.38, 0.38, 0.82],
    [1.43, 0, 0, 0.85],
  ],
  catHead: [
    [-1, 0, 0, 0.18],
    [-0.84, 0.45, 0.42, 0.16],
    [-0.58, 0.77, 0.66, 0.1],
    [-0.28, 0.94, 0.85, 0.04],
    [0.06, 1, 0.94, 0],
    [0.4, 0.91, 0.88, -0.01],
    [0.7, 0.7, 0.7, -0.02],
    [0.91, 0.4, 0.42, -0.02],
    [1, 0, 0, -0.02],
  ],
  dogHead: [
    [-1, 0, 0, 0.2],
    [-0.84, 0.44, 0.47, 0.2],
    [-0.59, 0.72, 0.7, 0.13],
    [-0.29, 0.91, 0.88, 0.06],
    [0.06, 1, 0.96, 0],
    [0.4, 0.93, 0.9, -0.02],
    [0.72, 0.72, 0.73, -0.03],
    [0.93, 0.4, 0.43, -0.04],
    [1, 0, 0, -0.04],
  ],
  foreleg: [
    [-1, 0, 0, 0.28],
    [-1, 0.79, 0.88, 0.28],
    [-0.83, 0.93, 1, 0.28],
    [-0.57, 0.84, 0.83, 0.18],
    [-0.33, 0.64, 0.63, 0],
    [0.08, 0.65, 0.66, -0.04],
    [0.55, 0.77, 0.73, -0.08],
    [1.05, 0.86, 0.82, -0.2],
    [1.42, 0.74, 0.72, -0.65],
    [1.8, 0.5, 0.49, -0.9],
    [2.25, 0, 0, -1.15],
  ],
  haunch: [
    [-1, 0, 0, 0.38],
    [-1, 0.68, 0.83, 0.38],
    [-0.8, 0.83, 1, 0.38],
    [-0.5, 0.68, 0.75, 0.15],
    [-0.17, 0.83, 0.8, -0.05],
    [0.22, 1, 0.94, -0.06],
    [0.6, 0.9, 0.85, -0.04],
    [0.88, 0.61, 0.61, 0],
    [1, 0, 0, 0],
  ],
  ear: [
    [-1, 0, 0, 0.08],
    [-0.88, 0.47, 0.6, 0.06],
    [-0.65, 0.82, 0.86, 0.03],
    [-0.28, 1, 1, 0],
    [0.15, 0.94, 0.92, 0],
    [0.52, 0.77, 0.77, -0.02],
    [0.85, 0.53, 0.55, 0],
    [1, 0, 0, 0],
  ],
};

export function Sculpt({
  shape,
  color,
  cream,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  meshRef,
}: {
  shape: Shape;
  color: string;
  cream?: string;
  position?: Vec3;
  scale?: Vec3;
  rotation?: Vec3;
  meshRef?: Ref<THREE.Mesh>;
}) {
  const geometry = useMemo(() => {
    const rings = profiles[shape],
      segments = shape === "ear" ? 12 : 16;
    const points: THREE.Vector3[] = [];
    for (const [ringIndex, [y, width, depth, forward]] of rings.entries()) {
      for (let i = 0; i < segments; i++) {
        const stagger =
          shape === "body" || shape.endsWith("Head")
            ? (ringIndex % 2) * 0.5
            : 0;
        const a = ((i + stagger) / segments) * Math.PI * 2;
        const front = Math.max(0, Math.cos(a));
        const muzzle =
          shape === "dogHead" ? 0.43 : shape === "catHead" ? 0.18 : 0;
        const cheek = Math.exp(-Math.pow((y + 0.39) / 0.35, 2));
        points.push(
          new THREE.Vector3(
            Math.sin(a) * width,
            y,
            Math.cos(a) * depth + forward + muzzle * cheek * Math.pow(front, 4),
          ),
        );
      }
    }
    const positions: number[] = [],
      colors: number[] = [];
    const coat = new THREE.Color(color),
      marking = new THREE.Color(cream ?? color);
    const edgeA = new THREE.Vector3(),
      edgeB = new THREE.Vector3();
    const triangle = (a: number, b: number, c: number) => {
      const verts = [points[a], points[b], points[c]];
      if (
        edgeA
          .subVectors(verts[1], verts[0])
          .cross(edgeB.subVectors(verts[2], verts[0]))
          .lengthSq() < 1e-10
      )
        return;
      const center = verts[0]
        .clone()
        .add(verts[1])
        .add(verts[2])
        .divideScalar(3);
      const patch =
        !!cream &&
        (shape === "dogHead"
          ? center.y < -0.16 && center.z > 0.65 && Math.abs(center.x) < 0.63
          : shape === "body"
            ? center.z > 0.6 && center.y > -0.35 && Math.abs(center.x) < 0.55
            : shape === "foreleg" || shape === "haunch"
              ? center.y < -0.79
              : false);
      for (const vertex of verts) {
        positions.push(vertex.x, vertex.y, vertex.z);
        colors.push(...(patch ? marking : coat).toArray());
      }
    };
    for (let ring = 0; ring < rings.length - 1; ring++) {
      for (let i = 0; i < segments; i++) {
        const a = ring * segments + i,
          b = ring * segments + ((i + 1) % segments);
        const c = a + segments,
          d = b + segments;
        // Alternate diagonals without asymmetrical silhouette or noisy color.
        if (ring % 2) {
          triangle(a, b, d);
          triangle(a, d, c);
        } else {
          triangle(a, b, c);
          triangle(b, d, c);
        }
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    result.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    result.computeVertexNormals();
    result.computeBoundingSphere();
    return result;
  }, [shape, color, cream]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      scale={scale}
      rotation={rotation}
    >
      <meshStandardMaterial vertexColors flatShading roughness={0.84} />
    </mesh>
  );
}
