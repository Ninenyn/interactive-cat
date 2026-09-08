// Original animal surfaces, generated offline. No downloaded models or textures.
// Run: node scripts/build-pet-models.mjs
import * as T from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { SimplifyModifier } from "three/addons/modifiers/SimplifyModifier.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import fs from "node:fs/promises";

const V = (p) => new T.Vector3(...p);
for (const cat of [true, false]) {
  const name = cat ? "jew" : "bo";
  const bones = [],
    fields = [];
  const bone = (name, parent, p) => {
    bones.push({ name, parent, position: p });
    return bones.length - 1;
  };
  const hipY = cat ? 0.83 : 0.96,
    chestY = cat ? 0.91 : 1.06;
  bone("pelvis", -1, [0, hipY, -0.65]);
  bone("spine", 0, [0, hipY + 0.04, -0.2]);
  bone("chest", 1, [0, chestY, 0.43]);
  bone("neck", 2, [0, cat ? 1.04 : 1.2, 0.68]);
  bone("head", 3, [0, cat ? 1.25 : 1.43, 0.88]);
  const solid = (distance, weights) => fields.push({ distance, weights });
  const ellipsoid = (p, r, weights) => {
    const center = V(p);
    solid((v) => {
      const x = (v.x - center.x) / r[0],
        y = (v.y - center.y) / r[1],
        z = (v.z - center.z) / r[2];
      return (Math.hypot(x, y, z) - 1) * Math.min(...r);
    }, weights);
  };
  const capsule = (a, b, ra, rb, weights) => {
    a = V(a);
    b = V(b);
    const d = b.clone().sub(a),
      len = d.lengthSq();
    solid((p) => {
      const t = T.MathUtils.clamp(p.clone().sub(a).dot(d) / len, 0, 1);
      return (
        p.distanceTo(a.clone().addScaledVector(d, t)) -
        T.MathUtils.lerp(ra, rb, t)
      );
    }, weights);
  };
  const bodyWeights = (p) => {
    const z = T.MathUtils.clamp((p.z + 0.65) / 1.08, 0, 1);
    return z < 0.42
      ? [
          [0, 1 - z / 0.42],
          [1, z / 0.42],
        ]
      : [
          [1, 1 - (z - 0.42) / 0.58],
          [2, (z - 0.42) / 0.58],
        ];
  };
  ellipsoid(
    [0, hipY, -0.5],
    [cat ? 0.39 : 0.46, cat ? 0.35 : 0.43, 0.43],
    bodyWeights,
  );
  ellipsoid(
    [0, hipY + 0.01, 0.04],
    [cat ? 0.35 : 0.43, cat ? 0.34 : 0.42, 0.63],
    bodyWeights,
  );
  ellipsoid(
    [0, chestY - 0.04, 0.46],
    [cat ? 0.36 : 0.45, cat ? 0.37 : 0.45, 0.36],
    bodyWeights,
  );
  capsule(
    [0, chestY, 0.48],
    bones[4].position,
    cat ? 0.29 : 0.34,
    cat ? 0.3 : 0.35,
    (p) => {
      const t = T.MathUtils.clamp((p.z - 0.48) / 0.4, 0, 1);
      return [
        [2, 1 - t],
        [3, t * (1 - t)],
        [4, t * t],
      ];
    },
  );
  const h = bones[4].position;
  ellipsoid(h, [0.47, cat ? 0.4 : 0.42, cat ? 0.42 : 0.44], () => [
    [4, 1],
  ]);
  ellipsoid(
    [0, h[1] - 0.09, h[2] + (cat ? 0.29 : 0.38)],
    [cat ? 0.265 : 0.31, cat ? 0.18 : 0.23, cat ? 0.225 : 0.29],
    () => [[4, 1]],
  );
  for (const side of [-1, 1]) {
    const x = side * (cat ? 0.28 : 0.35);
    for (const front of [true, false]) {
      const prefix = (front ? "front" : "hind") + (side < 0 ? "L" : "R");
      const a = [x, front ? chestY - 0.04 : hipY - 0.02, front ? 0.48 : -0.65];
      const b = [
        x,
        front ? (cat ? 0.46 : 0.53) : cat ? 0.45 : 0.52,
        front ? 0.36 : -0.37,
      ];
      const c = [x, 0.14, front ? 0.49 : -0.76];
      const index = bone(prefix, front ? 2 : 0, a);
      bone(prefix + "Lower", index, b);
      bone(prefix + "Paw", index + 1, c);
      const r = cat ? (front ? 0.175 : 0.21) : front ? 0.205 : 0.25;
      capsule(a, b, r, cat ? 0.125 : 0.15, (p) => {
        const t = T.MathUtils.clamp((a[1] - p.y) / (a[1] - b[1]), 0, 1);
        const upperBlend = T.MathUtils.smoothstep(p.y, a[1] - 0.3, a[1] - 0.05);
        return [
          [front ? 2 : 0, upperBlend],
          [index, (1 - upperBlend) * (1 - t * 0.3)],
          [index + 1, (1 - upperBlend) * t * 0.3],
        ];
      });
      capsule(b, c, cat ? 0.125 : 0.15, cat ? 0.11 : 0.135, (p) => {
        const t = T.MathUtils.clamp((b[1] - p.y) / (b[1] - c[1]), 0, 1);
        return [
          [index, (1 - t) * 0.25],
          [index + 1, 1 - (1 - t) * 0.25 - t * 0.4],
          [index + 2, t * 0.4],
        ];
      });
      ellipsoid(
        [x, 0.095, c[2] + 0.085],
        [cat ? 0.145 : 0.18, 0.1, cat ? 0.19 : 0.23],
        () => [[index + 2, 1]],
      );
    }
    const ear = bone(side < 0 ? "earL" : "earR", 4, [
      side * (cat ? 0.295 : 0.415),
      h[1] + (cat ? 0.265 : 0.17),
      h[2] - 0.075,
    ]);
    if (cat) {
      const p = bones[ear].position;
      const verts = [
        [p[0] - 0.12, p[1] - 0.09, p[2] + 0.1],
        [p[0] + 0.12, p[1] - 0.09, p[2] + 0.1],
        [p[0] + side * 0.025 - 0.025, p[1] + 0.29, p[2] - 0.01],
        [p[0] + side * 0.025 + 0.025, p[1] + 0.29, p[2] - 0.01],
        [p[0] - 0.09, p[1] - 0.07, p[2] - 0.13],
        [p[0] + 0.09, p[1] - 0.07, p[2] - 0.13],
      ].map(V);
      const geom = new ConvexGeometry(verts),
        pos = geom.attributes.position,
        planes = [];
      for (let i = 0; i < pos.count; i += 3)
        planes.push(
          new T.Plane().setFromCoplanarPoints(
            new T.Vector3().fromBufferAttribute(pos, i),
            new T.Vector3().fromBufferAttribute(pos, i + 1),
            new T.Vector3().fromBufferAttribute(pos, i + 2),
          ),
        );
      solid(
        (p) => Math.max(...planes.map((q) => q.distanceToPoint(p))),
        () => [[ear, 1]],
      );
      geom.dispose();
    } else {
      ellipsoid(
        [side * 0.44, h[1] - 0.13, h[2] - 0.035],
        [0.165, 0.37, 0.23],
        (p) => [
          [4, T.MathUtils.smoothstep(p.y, h[1] - 0.05, h[1] + 0.15) * 0.4],
          [
            ear,
            1 - T.MathUtils.smoothstep(p.y, h[1] - 0.05, h[1] + 0.15) * 0.4,
          ],
        ],
      );
    }
  }
  const tailPoints = cat
    ? [
        [0, hipY, -0.94],
        [0, 0.92, -1.15],
        [0, 1.12, -1.29],
        [0, 1.35, -1.32],
        [0, 1.55, -1.26],
        [0, 1.64, -1.1],
        [0, 1.59, -0.98],
      ]
    : [
        [0, hipY, -1.02],
        [0, 1.02, -1.25],
        [0, 1.13, -1.45],
        [0, 1.28, -1.61],
        [0, 1.44, -1.72],
        [0, 1.55, -1.71],
      ];
  const tailStart = bones.length;
  tailPoints.forEach((p, i) => bone("tail" + i, i ? tailStart + i - 1 : 0, p));
  for (let i = 0; i < tailPoints.length - 1; i++) {
    const ra = cat ? 0.115 - i * 0.008 : [0.145, 0.19, 0.18, 0.145, 0.095][i];
    const rb = cat ? 0.107 - i * 0.008 : [0.19, 0.18, 0.145, 0.095, 0.055][i];
    capsule(tailPoints[i], tailPoints[i + 1], ra, rb, (p) => {
      const a = V(tailPoints[i]),
        d = V(tailPoints[i + 1]).sub(a);
      const t = T.MathUtils.clamp(p.clone().sub(a).dot(d) / d.lengthSq(), 0, 1);
      return [
        [tailStart + i, 1 - t],
        [tailStart + i + 1, t],
      ];
    });
  }
  const resolution = 80,
    span = 2.5,
    centerY = 1;
  const mc = new MarchingCubes(
    resolution,
    new T.MeshBasicMaterial(),
    false,
    false,
    80000,
  );
  mc.isolation = 0;
  const p = new T.Vector3();
  for (let z = 0; z < resolution; z++)
    for (let y = 0; y < resolution; y++)
      for (let x = 0; x < resolution; x++) {
        p.set(
          ((x / resolution) * 2 - 1) * span,
          ((y / resolution) * 2 - 1) * span + centerY,
          ((z / resolution) * 2 - 1) * span,
        );
        let distance = 10;
        for (const field of fields) {
          const d = field.distance(p),
            k = 0.075;
          const h = T.MathUtils.clamp(0.5 + (0.5 * (d - distance)) / k, 0, 1);
          distance = T.MathUtils.lerp(d, distance, h) - k * h * (1 - h);
        }
        distance = Math.max(distance, 0.018 - p.y);
        mc.field[x + y * resolution + z * resolution * resolution] = -distance;
      }
  mc.update();
  let geometry = new T.BufferGeometry();
  const count = mc.geometry.drawRange.count;
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      mc.geometry.attributes.position.array.slice(0, count * 3),
      3,
    ),
  );
  geometry.scale(span, span, span);
  geometry.translate(0, centerY, 0);
  geometry = mergeVertices(geometry, 1e-4);
  const original = geometry.attributes.position.count;
  geometry = new SimplifyModifier().modify(
    geometry,
    Math.max(0, original - (cat ? 1500 : 1700)),
  );
  const position = geometry.attributes.position,
    skinIndex = [],
    skinWeight = [],
    positions = [];
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    positions.push(...p.toArray().map((v) => +v.toFixed(5)));
    const ds = fields.map((f) => f.distance(p)),
      min = Math.min(...ds),
      weights = new Map();
    fields.forEach((f, j) => {
      const influence = Math.exp(-Math.max(0, ds[j] - min) * 55);
      if (influence < 0.005) return;
      for (const [id, w] of f.weights(p))
        weights.set(id, (weights.get(id) || 0) + w * influence);
    });
    const selected = [...weights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const sum = selected.reduce((a, b) => a + b[1], 0);
    while (selected.length < 4) selected.push([0, 0]);
    skinIndex.push(...selected.map((w) => w[0]));
    skinWeight.push(...selected.map((w) => +(w[1] / sum || 0).toFixed(6)));
  }
  const output = {
    name,
    bones,
    positions,
    indices: Array.from(geometry.index.array),
    skinIndex,
    skinWeight,
  };
  await fs.mkdir("src/assets/pets", { recursive: true });
  await fs.writeFile(
    "src/assets/pets/" + name + ".json",
    JSON.stringify(output),
  );
  console.log(name, {
    originalVertices: original,
    vertices: position.count,
    triangles: geometry.index.count / 3,
    bones: bones.length,
  });
}
