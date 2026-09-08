// Authored polygon cages for the approved Jew / Bo character sheets.
// No implicit surfaces, remeshing, decimation, downloaded meshes, or runtime modelling.
// Run: node scripts/build-pet-models.mjs
import * as T from "three";
import fs from "node:fs/promises";

const V = (p) => new T.Vector3(...p);
const lerp = T.MathUtils.lerp;
for (const cat of [true, false]) {
  const name = cat ? "jew" : "bo";
  const bones = [],
    positions = [],
    weights = [],
    faces = [],
    regions = [];
  const bone = (name, parent, position) => {
    bones.push({ name, parent, position });
    return bones.length - 1;
  };
  const hipY = cat ? 0.9 : 0.94,
    chestY = cat ? 1.02 : 1.07;
  const h = [0, cat ? 1.44 : 1.48, cat ? 0.68 : 0.73];
  bone("pelvis", -1, [0, hipY, -0.56]);
  bone("spine", 0, [0, hipY + 0.04, -0.08]);
  bone("chest", 1, [0, chestY, 0.36]);
  bone("neck", 2, [0, cat ? 1.16 : 1.2, 0.64]);
  bone("head", 3, h);
  const add = (p, w) => {
    positions.push(p);
    weights.push(w);
    return positions.length - 1;
  };
  const tri = (a, b, c, region = 0) => {
    faces.push([a, b, c]);
    regions.push(region);
  };
  const quad = (a, b, c, d, region = 0, diagonal = false) => {
    if (diagonal) {
      tri(a, b, d, region);
      tri(b, c, d, region);
    } else {
      tri(a, b, c, region);
      tri(a, c, d, region);
    }
  };
  // Align boundary loops geometrically before bridging differently sized cages.
  const align = (a, b) => {
    let best = b,
      cost = Infinity;
    for (const sign of [-1, 1])
      for (let shift = 0; shift < b.length; shift++) {
        const candidate = b.map(
          (_, i) => b[(shift + sign * i + b.length * 2) % b.length],
        );
        let sum = 0;
        for (let i = 0; i < a.length; i++)
          sum += V(positions[a[i]]).distanceToSquared(
            V(positions[candidate[Math.floor((i * b.length) / a.length)]]),
          );
        if (sum < cost) {
          cost = sum;
          best = candidate;
        }
      }
    return best;
  };
  const bridge = (a, raw, region = 0) => {
    const b = align(a, raw),
      n = a.length,
      m = b.length;
    let i = 0,
      j = 0;
    while (i < n || j < m) {
      const u = (i + 1) / n,
        v = (j + 1) / m;
      if (Math.abs(u - v) < 1e-7) {
        quad(
          a[i % n],
          a[(i + 1) % n],
          b[(j + 1) % m],
          b[j % m],
          region,
          (i + j) % 4 === 0,
        );
        i++;
        j++;
      } else if (u < v) {
        tri(a[i % n], a[(i + 1) % n], b[j % m], region);
        i++;
      } else {
        tri(a[i % n], b[(j + 1) % m], b[j % m], region);
        j++;
      }
    }
    return b;
  };
  const cap = (loop, w, region = 0) => {
    const p = loop
      .reduce((p, id) => p.add(V(positions[id])), new T.Vector3())
      .multiplyScalar(1 / loop.length);
    const center = add(p.toArray(), w);
    loop.forEach((id, i) =>
      tri(id, loop[(i + 1) % loop.length], center, region),
    );
  };
  const bodyWeights = (z) => {
    if (z < -0.08) {
      const t = T.MathUtils.clamp((z + 0.56) / 0.48, 0, 1);
      return [
        [0, 1 - t],
        [1, t],
      ];
    }
    const t = T.MathUtils.clamp((z + 0.08) / 0.44, 0, 1);
    return [
      [1, 1 - t],
      [2, t],
    ];
  };
  // A twelve-sided torso with explicitly opened shoulder/hip patches.
  const bodySpecs = [
    [-0.91, hipY, 0.17, 0.22, 0],
    [-0.76, hipY, 0.31, 0.34, 0],
    [-0.56, hipY, 0.38, 0.39, 0],
    [-0.36, hipY + 0.01, 0.36, 0.38, 0],
    [-0.1, hipY + 0.025, 0.34, 0.36, 0],
    [0.12, chestY - 0.03, 0.36, 0.39, 0],
    [0.32, chestY, 0.39, 0.42, 0],
    [0.52, chestY + 0.015, 0.34, 0.39, 0],
    [0.63, chestY + 0.06, 0.28, 0.31, -0.65],
    [0.66, h[1] - 0.41, 0.235, 0.235, -Math.PI / 2],
  ];
  const body = bodySpecs.map(([z, y, width, height, angle], row) =>
    Array.from({ length: 12 }, (_, j) => {
      const t = (j * Math.PI) / 6,
        x = Math.sin(t) * width * (cat ? 1 : 1.12),
        off = Math.cos(t) * height;
      const stagger =
        row > 0 && row < 8 ? (row % 2 ? 1 : -1) * 0.037 * Math.cos(t * 2) : 0;
      return add(
        [x, y + off * Math.cos(angle), z + off * Math.sin(angle) + stagger],
        row >= 8
          ? [
              [2, (9 - row) * 0.65],
              [3, 0.35 + (row - 8) * 0.65],
            ]
          : bodyWeights(z),
      );
    }),
  );
  for (let r = 0; r < body.length - 1; r++)
    for (let j = 0; j < 12; j++) {
      const leg =
        (r === 1 || r === 2 || r === 5 || r === 6) &&
        (j === 3 || j === 4 || j === 7 || j === 8);
      if (leg) continue;
      const cream = !cat && r >= 6 && j >= 4 && j <= 7;
      quad(
        body[r][j],
        body[r][(j + 1) % 12],
        body[r + 1][(j + 1) % 12],
        body[r + 1][j],
        cream ? 1 : 0,
        (r + j) % 2 === 0,
      );
    }
  // Horizontal head contours define the jaw, cheeks, brow and forehead deliberately.
  // [height, half-width, front depth, back depth]
  const headSpecs = cat
    ? [
        [-0.42, 0.24, 0.22, 0.2],
        [-0.32, 0.43, 0.36, 0.31],
        [-0.15, 0.52, 0.43, 0.39],
        [0.1, 0.51, 0.4, 0.42],
        [0.32, 0.43, 0.29, 0.34],
        [0.45, 0.25, 0.12, 0.2],
        [0.49, 0.065, 0.01, 0.07],
      ]
    : [
        [-0.43, 0.245, 0.28, 0.22],
        [-0.32, 0.4, 0.49, 0.32],
        [-0.14, 0.49, 0.49, 0.39],
        [0.1, 0.49, 0.4, 0.42],
        [0.32, 0.41, 0.29, 0.35],
        [0.46, 0.24, 0.11, 0.21],
        [0.49, 0.055, 0.01, 0.07],
      ];
  const head = headSpecs.map(([y, w, front, back], r) =>
    Array.from({ length: 12 }, (_, j) => {
      const a =
          (j * Math.PI) / 6 + (r % 2 ? Math.sin((j * Math.PI) / 3) * 0.12 : 0),
        co = Math.cos(a);
      let z = co * (co >= 0 ? front : back);
      // Muzzle and nasal bridge are part of the face cage, never attached balls.
      if (j === 0 && r === 1) z = cat ? 0.475 : 0.57;
      if (j === 0 && r === 2) z = cat ? 0.55 : 0.635;
      if ((j === 1 || j === 11) && r === 2) z = cat ? 0.415 : 0.57;
      if (!cat && (j === 1 || j === 11) && r === 1) z = 0.53;
      const offsets = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0.02, 0.09, 0.11, 0.07, 0.04, 0],
        [0, -0.04, -0.015, 0.06, 0.06, 0.02, 0],
        [0.08, -0.055, 0.045, 0.065, 0.05, 0.025, 0],
        [0.06, 0.075, 0.045, 0, 0.015, 0.01, 0],
        [-0.015, 0.015, -0.025, -0.035, -0.015, 0.01, 0],
        [0, 0, 0, 0, 0, 0, 0],
      ];
      const crown = offsets[r][j <= 6 ? j : 12 - j];
      return add(
        [
          h[0] + Math.sin(a) * w * (cat ? 1.16 : 1.18),
          h[1] + y * 1.07 + crown,
          h[2] + z,
        ],
        r === 0
          ? [
              [3, 0.25],
              [4, 0.75],
            ]
          : [[4, 1]],
      );
    }),
  );
  bridge(body.at(-1), head[0]);
  for (let r = 0; r < head.length - 1; r++)
    for (let j = 0; j < 12; j++) {
      const hole = cat
        ? r === 4 && (j === 1 || j === 2 || j === 9 || j === 10)
        : r === 3 && (j === 2 || j === 3 || j === 8 || j === 9);
      if (hole) continue;
      const cream =
        !cat &&
        r < 3 &&
        (j === 0 || j === 11 || ((j === 1 || j === 10) && r < 2));
      quad(
        head[r][j],
        head[r][(j + 1) % 12],
        head[r + 1][(j + 1) % 12],
        head[r + 1][j],
        cream ? 1 : 0,
        r === 2 && j === 0
          ? false
          : r === 2 && j === 11
            ? true
            : (r + j) % 2 === 0,
      );
    }
  cap(head.at(-1), [[4, 1]]);
  const horizontal = (center, rx, rz, w, n = 8, side = 1) =>
    Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 4 - (i * Math.PI * 2) / n;
      return add(
        [
          center[0] + side * rx * Math.cos(a),
          center[1],
          center[2] + rz * Math.sin(a),
        ],
        w,
      );
    });
  for (const side of [-1, 1]) {
    const x = side * (cat ? 0.275 : 0.31);
    for (const front of [true, false]) {
      const prefix = (front ? "front" : "hind") + (side < 0 ? "L" : "R");
      const a = [x, front ? chestY - 0.04 : hipY - 0.03, front ? 0.36 : -0.56];
      const b = [x, front ? 0.51 : 0.48, front ? 0.32 : -0.34];
      const c = [x, 0.14, front ? 0.42 : -0.62];
      const root = front ? 2 : 0;
      const upper = bone(prefix, root, a),
        lower = bone(prefix + "Lower", upper, b),
        paw = bone(prefix + "Paw", lower, c);
      const row = front ? 5 : 1,
        js = side > 0 ? [3, 4, 5] : [9, 8, 7];
      let loop = [
        body[row][js[0]],
        body[row][js[1]],
        body[row][js[2]],
        body[row + 1][js[2]],
        body[row + 2][js[2]],
        body[row + 2][js[1]],
        body[row + 2][js[0]],
        body[row + 1][js[0]],
      ];
      const scale = cat ? 1 : 1.13;
      const specs = [
        [
          a[1] - 0.1,
          a[2],
          front ? 0.18 : 0.23,
          front ? 0.17 : 0.245,
          [
            [root, 0.35],
            [upper, 0.65],
          ],
        ],
        [
          a[1] - 0.27,
          lerp(a[2], b[2], 0.6),
          front ? 0.155 : 0.19,
          front ? 0.145 : 0.2,
          [
            [upper, 0.85],
            [lower, 0.15],
          ],
        ],
        [
          b[1],
          b[2],
          0.12,
          0.125,
          [
            [upper, 0.4],
            [lower, 0.6],
          ],
        ],
        [
          0.29,
          lerp(b[2], c[2], 0.66),
          0.11,
          0.11,
          [
            [lower, 0.9],
            [paw, 0.1],
          ],
        ],
        [
          0.2,
          c[2] + 0.025,
          0.12,
          0.155,
          [
            [lower, 0.25],
            [paw, 0.75],
          ],
        ],
        [0.105, c[2] + 0.06, 0.145, 0.205, [[paw, 1]]],
        [0.025, c[2] + 0.06, 0.14, 0.185, [[paw, 1]]],
      ];
      for (let k = 0; k < specs.length; k++) {
        const [y, z, rx, rz, w] = specs[k];
        const next = horizontal([x, y, z], rx * scale, rz * scale, w, 8, side);
        loop = bridge(loop, next, !cat && k >= 5 ? 3 : 0);
      }
      cap(loop, [[paw, 1]], cat ? 0 : 3);
    }
    const ear = bone(side < 0 ? "earL" : "earR", 4, [
      side * (cat ? 0.4 : 0.5),
      h[1] + (cat ? 0.32 : 0.2),
      h[2] - 0.035,
    ]);
    const rr = cat ? 4 : 3,
      js =
        side > 0
          ? cat
            ? [1, 2, 3]
            : [2, 3, 4]
          : cat
            ? [11, 10, 9]
            : [10, 9, 8];
    let loop = [
      head[rr][js[0]],
      head[rr][js[1]],
      head[rr][js[2]],
      head[rr + 1][js[2]],
      head[rr + 1][js[1]],
      head[rr + 1][js[0]],
    ];
    if (cat) {
      const outline = [
        [side * 0.2, h[1] + 0.28, h[2] + 0.09],
        [side * 0.59, h[1] + 0.26, h[2] - 0.015],
        [side * 0.56, h[1] + 0.77, h[2] - 0.075],
      ];
      const back = outline.map((p) =>
        add([p[0], p[1], p[2] - 0.115], [[ear, 1]]),
      );
      loop = bridge(loop, back);
      const front = outline.map((p) => add(p, [[ear, 1]]));
      loop = bridge(loop, front);
      cap(loop, [[ear, 1]]);
    } else {
      // Broad pendant-shaped ears, sculpted front/back instead of cylindrical rings.
      const outline = [
        [0.38, 0.28, 0.015],
        [0.55, 0.24, 0.055],
        [0.73, 0.045, 0.105],
        [0.71, -0.22, 0.13],
        [0.56, -0.46, 0.15],
        [0.395, -0.36, 0.17],
        [0.37, -0.11, 0.135],
        [0.37, 0.11, 0.065],
      ];
      const back = outline.map(([x, y, z]) =>
        add([side * x, h[1] + y, h[2] + z - 0.16], [[ear, 1]]),
      );
      loop = bridge(loop, back, 2);
      const front = outline.map(([x, y, z]) =>
        add([side * x, h[1] + y, h[2] + z], [[ear, 1]]),
      );
      loop = bridge(loop, front, 2);
      const center = add([side * 0.515, h[1] - 0.05, h[2] + 0.2], [[ear, 1]]);
      loop.forEach((id, i) => tri(id, loop[(i + 1) % loop.length], center, 2));
    }
  }
  const tailPoints = cat
    ? [
        [0, hipY, -0.91],
        [0, 0.92, -1.14],
        [0, 1.0, -1.36],
        [0, 1.17, -1.5],
        [0, 1.36, -1.54],
        [0, 1.5, -1.47],
        [0, 1.58, -1.35],
      ]
    : [
        [0, hipY, -0.91],
        [0, 1.0, -1.15],
        [0, 1.13, -1.37],
        [0, 1.31, -1.53],
        [0, 1.5, -1.6],
        [0, 1.66, -1.56],
      ];
  const tailStart = bones.length;
  tailPoints.forEach((p, i) => bone("tail" + i, i ? tailStart + i - 1 : 0, p));
  const curve = new T.CatmullRomCurve3(tailPoints.map(V));
  let tail = body[0];
  const steps = cat ? 12 : 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      p = curve.getPoint(t),
      tangent = curve.getTangent(t).normalize();
    const up = new T.Vector3()
      .crossVectors(tangent, new T.Vector3(1, 0, 0))
      .normalize();
    const radius = (cat ? 0.145 : 0.17) * Math.pow(1 - t, 0.85) + 0.006;
    const sample = t * (tailPoints.length - 1),
      id = Math.min(tailPoints.length - 2, Math.floor(sample)),
      f = sample - id;
    const w = [
      [tailStart + id, 1 - f],
      [tailStart + id + 1, f],
    ];
    const ring = Array.from({ length: 8 }, (_, j) => {
      const a = (j * Math.PI) / 4;
      return add(
        p
          .clone()
          .add(new T.Vector3(Math.cos(a) * radius, 0, 0))
          .addScaledVector(up, Math.sin(a) * radius)
          .toArray(),
        w,
      );
    });
    tail = bridge(tail, ring);
  }
  cap(tail, [[bones.length - 1, 1]]);
  // Propagate coherent winding across the watertight branched surface.
  const edges = new Map();
  faces.forEach((f, i) =>
    f.forEach((a, j) => {
      const b = f[(j + 1) % 3],
        key = Math.min(a, b) + ":" + Math.max(a, b);
      const list = edges.get(key) || [];
      list.push([i, a < b ? 1 : -1]);
      edges.set(key, list);
    }),
  );
  const adjacency = faces.map(() => []);
  for (const [key, pair] of edges) {
    if (pair.length !== 2)
      throw Error(name + " non-manifold edge " + key + " count " + pair.length);
    const [[a, da], [b, db]] = pair;
    adjacency[a].push([b, da === db]);
    adjacency[b].push([a, da === db]);
  }
  const flip = new Map([[0, false]]),
    queue = [0];
  while (queue.length) {
    const a = queue.pop();
    for (const [b, opposite] of adjacency[a])
      if (!flip.has(b)) {
        flip.set(b, flip.get(a) !== opposite);
        queue.push(b);
      }
  }
  if (flip.size !== faces.length) throw Error(name + " disconnected cage");
  faces.forEach((f, i) => {
    if (flip.get(i)) [f[1], f[2]] = [f[2], f[1]];
  });
  let volume = 0;
  for (const f of faces)
    volume += V(positions[f[0]]).dot(
      V(positions[f[1]]).cross(V(positions[f[2]])),
    );
  if (volume < 0)
    faces.forEach((f) => {
      [f[1], f[2]] = [f[2], f[1]];
    });
  // Keep cream on Bo's short muzzle, not as a horizontal mask through the eyes.
  if (!cat)
    faces.forEach((f, i) => {
      if (f.every((id) => id >= head[0][0] && id <= head.at(-1).at(-1))) {
        const center = f
          .reduce((v, id) => v.add(V(positions[id])), new T.Vector3())
          .multiplyScalar(1 / 3)
          .sub(V(h));
        regions[i] =
          center.z > 0.27 && center.y < 0.06 && Math.abs(center.x) < 0.36
            ? 1
            : 0;
      }
    });
  // Opening limb patches leaves a few unused cage vertices; remove them before refinement.
  const used = [...new Set(faces.flat())].sort((a, b) => a - b),
    remap = new Map(used.map((id, i) => [id, i]));
  const keptPositions = used.map((id) => positions[id]),
    keptWeights = used.map((id) => weights[id]);
  faces.forEach((f) =>
    f.forEach((id, i) => {
      f[i] = remap.get(id);
    }),
  );
  positions.splice(0, positions.length, ...keptPositions);
  weights.splice(0, weights.length, ...keptWeights);
  // One controlled Loop refinement rounds the cage silhouette while retaining
  // flat polygon planes. Ear tips and planted soles keep their authored creases.
  const oldPositions = positions.map((p) => [...p]),
    oldWeights = weights.map((w) => w.map((e) => [...e]));
  const neighbors = positions.map(() => new Set());
  const edgeMap = new Map();
  faces.forEach((f) =>
    f.forEach((a, j) => {
      const b = f[(j + 1) % 3],
        c = f[(j + 2) % 3],
        key = Math.min(a, b) + ":" + Math.max(a, b);
      neighbors[a].add(b);
      neighbors[b].add(a);
      if (!edgeMap.has(key)) edgeMap.set(key, { a, b, opposites: [] });
      edgeMap.get(key).opposites.push(c);
    }),
  );
  const combine = (entries) => {
    const map = new Map();
    for (const [id, factor] of entries)
      for (const [bone, w] of oldWeights[id])
        map.set(bone, (map.get(bone) || 0) + w * factor);
    return [...map].sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  const feature = (p) =>
    cat && p[1] > h[1] + 0.3 && Math.abs(p[0]) > 0.25 ? 0.2 : 1;
  const refined = oldPositions.map((p, i) => {
    const ns = [...neighbors[i]],
      n = ns.length,
      beta = n === 3 ? 3 / 16 : 3 / (8 * n),
      amount = feature(p);
    const entries = [
      [i, 1 - n * beta * amount],
      ...ns.map((j) => [j, beta * amount]),
    ];
    const point = entries.reduce(
      (v, [j, w]) => v.addScaledVector(V(oldPositions[j]), w),
      new T.Vector3(),
    );
    if (p[1] < 0.035) point.y = p[1];
    return { p: point.toArray(), w: combine(entries) };
  });
  for (const edge of edgeMap.values()) {
    const mid = V(oldPositions[edge.a])
      .add(V(oldPositions[edge.b]))
      .multiplyScalar(0.5);
    const amount = feature(mid.toArray()),
      entries = [
        [edge.a, 0.5 - 0.125 * amount],
        [edge.b, 0.5 - 0.125 * amount],
        ...edge.opposites.map((id) => [id, 0.125 * amount]),
      ];
    const point = entries.reduce(
      (v, [j, w]) => v.addScaledVector(V(oldPositions[j]), w),
      new T.Vector3(),
    );
    if (oldPositions[edge.a][1] < 0.035 && oldPositions[edge.b][1] < 0.035)
      point.y = 0.025;
    edge.id = refined.length;
    refined.push({ p: point.toArray(), w: combine(entries) });
  }
  const subdivided = [],
    subRegions = [];
  const midpoint = (a, b) =>
    edgeMap.get(Math.min(a, b) + ":" + Math.max(a, b)).id;
  faces.forEach(([a, b, c], i) => {
    const ab = midpoint(a, b),
      bc = midpoint(b, c),
      ca = midpoint(c, a);
    subdivided.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    subRegions.push(regions[i], regions[i], regions[i], regions[i]);
  });
  positions.splice(0, positions.length, ...refined.map((v) => v.p));
  weights.splice(0, weights.length, ...refined.map((v) => v.w));
  faces.splice(0, faces.length, ...subdivided);
  regions.splice(0, regions.length, ...subRegions);
  const skinIndex = [],
    skinWeight = [];
  weights.forEach((w) => {
    const entries = w.filter(([, v]) => v > 0),
      total = entries.reduce((s, [, v]) => s + v, 0);
    while (entries.length < 4) entries.push([0, 0]);
    skinIndex.push(...entries.map(([i]) => i));
    skinWeight.push(...entries.map(([, v]) => +(v / total).toFixed(6)));
  });
  // Compact the ribcage behind the shoulders to the approved puppy/kitten ratio.
  // Facial projection and muzzle length stay independent of torso length.
  const compact = (z) => (z < 0.36 ? 0.36 + (z - 0.36) * 0.8 : z);
  positions.forEach((p) => {
    p[2] = compact(p[2]);
  });
  bones.forEach((b) => {
    b.position[2] = compact(b.position[2]);
  });
  const out = {
    name,
    bones,
    positions: positions.flat().map((n) => +n.toFixed(6)),
    indices: faces.flat(),
    skinIndex,
    skinWeight,
    regions,
  };
  await fs.mkdir("src/assets/pets", { recursive: true });
  await fs.writeFile("src/assets/pets/" + name + ".json", JSON.stringify(out));
  console.log(name, {
    vertices: positions.length,
    triangles: faces.length,
    bones: bones.length,
    closed: true,
  });
}
