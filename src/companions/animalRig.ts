import * as T from "three";
import jew from "../assets/pets/jew.json";
import bo from "../assets/pets/bo.json";
import type { Behavior, Companion } from "@/interactions/companionStateMachine";

export type AnimalInput = {
  state: Behavior;
  delta: number;
  time: number;
  stride: number;
  stand: number;
  walking: boolean;
  dragging: boolean;
  reduced: boolean;
  target: { x: number; y: number };
};
type Asset = typeof jew;
type Leg = {
  upper: T.Bone;
  lower: T.Bone;
  paw: T.Bone;
  front: boolean;
  side: number;
  upperRest: T.Vector3;
  lowerRest: T.Vector3;
  foot: T.Vector3;
  plant: T.Vector3;
  planted: boolean;
};
const v = (a: number[]) => new T.Vector3(a[0], a[1], a[2]);
const clamp = T.MathUtils.clamp;
const mix = T.MathUtils.lerp;
const tau = Math.PI * 2;
const smooth = (n: number) => n * n * (3 - 2 * n);
const q = new T.Quaternion(),
  parentQ = new T.Quaternion(),
  rootQ = new T.Quaternion();
const euler = new T.Euler(),
  a = new T.Vector3(),
  b = new T.Vector3(),
  c = new T.Vector3();
const axis = new T.Vector3(),
  bend = new T.Vector3(),
  knee = new T.Vector3();

export class AnimalRig {
  readonly root = new T.Group();
  readonly mesh: T.SkinnedMesh;
  readonly bones: T.Bone[];
  readonly byName: Record<string, T.Bone> = {};
  readonly legs: Leg[] = [];
  readonly eyes = new T.Group();
  readonly jaw = new T.Group();
  readonly tongue: T.Mesh;
  readonly fangs = new T.Group();
  readonly cat: boolean;
  private data: Asset;
  private weights = {
    sit: 0,
    sleep: 0,
    stretch: 0,
    dig: 0,
    carry: 0,
    paw: 0,
    groom: 0,
    nip: 0,
  };
  private materials: T.Material[] = [];
  private eyeMaterials: T.ShaderMaterial[] = [];
  private details: T.BufferGeometry[] = [];

  constructor(pet: Companion) {
    this.cat = pet === "jew";
    this.data = this.cat ? jew : bo;
    const data = this.data;
    this.root.name = pet + "-skeletal-companion";
    this.bones = data.bones.map((def) => {
      const bone = new T.Bone();
      bone.name = def.name;
      this.byName[def.name] = bone;
      return bone;
    });
    data.bones.forEach((def, i) => {
      const parent = def.parent;
      this.bones[i].position.copy(v(def.position));
      if (parent >= 0) {
        this.bones[i].position.sub(v(data.bones[parent].position));
        this.bones[parent].add(this.bones[i]);
      }
    });
    let geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(data.positions, 3),
    );
    geometry.setAttribute(
      "skinIndex",
      new T.Uint16BufferAttribute(data.skinIndex, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new T.Float32BufferAttribute(data.skinWeight, 4),
    );
    geometry.setIndex(data.indices);
    geometry = geometry.toNonIndexed();
    const colors: number[] = [];
    const palette = this.cat
      ? ["#0b0c0e", "#0b0c0e", "#0b0c0e", "#0b0c0e"]
      : ["#ce9845", "#edd3a3", "#bd8337", "#e4c48e"];
    for (const region of data.regions) {
      const rgb = new T.Color(palette[region]);
      for (let j = 0; j < 3; j++) colors.push(...rgb.toArray());
    }
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.88,
    });
    this.materials.push(material);
    this.mesh = new T.SkinnedMesh(geometry, material);
    this.mesh.name = pet + "-continuous-surface";
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    this.mesh.add(this.bones[0]);
    this.mesh.bind(new T.Skeleton(this.bones));
    this.mesh.normalizeSkinWeights();

    for (const side of [-1, 1])
      for (const front of [true, false]) {
        const prefix = (front ? "front" : "hind") + (side < 0 ? "L" : "R");
        const upper = this.byName[prefix],
          lower = this.byName[prefix + "Lower"],
          paw = this.byName[prefix + "Paw"];
        const foot = v(
          data.bones.find((b) => b.name === prefix + "Paw")!.position,
        );
        this.legs.push({
          upper,
          lower,
          paw,
          front,
          side,
          upperRest: lower.position.clone(),
          lowerRest: paw.position.clone(),
          foot,
          plant: new T.Vector3(),
          planted: false,
        });
      }
    const headOrigin = v(data.bones.find((b) => b.name === "head")!.position);
    // Sample the actual refined head surface. Facial features conform to the
    // cage instead of hovering on a guessed sphere/plane in front of it.
    const faceSurface = (x: number, y: number) => {
      const px = x + headOrigin.x,
        py = y + headOrigin.y;
      let front = -Infinity;
      for (let i = 0; i < data.indices.length; i += 3) {
        const ia = data.indices[i] * 3,
          ib = data.indices[i + 1] * 3,
          ic = data.indices[i + 2] * 3;
        const ax = data.positions[ia],
          ay = data.positions[ia + 1];
        const bx = data.positions[ib],
          by = data.positions[ib + 1];
        const cx = data.positions[ic],
          cy = data.positions[ic + 1];
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(d) < 1e-9) continue;
        const u = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
        const v = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
        if (u < -0.00001 || v < -0.00001 || u + v > 1.00001) continue;
        const z =
          u * data.positions[ia + 2] +
          v * data.positions[ib + 2] +
          (1 - u - v) * data.positions[ic + 2];
        front = Math.max(front, z);
      }
      return Number.isFinite(front) ? front - headOrigin.z : 0.3;
    };
    this.byName.head.add(this.eyes, this.jaw);
    for (const side of [-1, 1]) {
      const material = new T.ShaderMaterial({
        uniforms: {
          iris: { value: new T.Color(this.cat ? "#bb812e" : "#55331b") },
          pupil: { value: new T.Color("#090a0c") },
          opening: { value: this.cat ? 0.62 : 1 },
          slant: { value: this.cat ? side * 0.1 : 0 },
          gaze: { value: new T.Vector2() },
        },
        vertexShader: `
          varying vec2 eyeUv;
          void main() {
            eyeUv=uv;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          }
        `,
        fragmentShader: `
          varying vec2 eyeUv;
          uniform vec3 iris;
          uniform vec3 pupil;
          uniform float opening;
          uniform float slant;
          uniform vec2 gaze;
          void main() {
            vec2 p=eyeUv*2.0-1.0;
            float r=length(p);
            float top=mix(-0.67,1.05,opening)+slant*p.x;
            float bottom=-0.85+0.2*(1.0-opening)+0.10*p.x*p.x;
            if(r>1.0 || p.y>top || p.y<bottom) discard;
            float pr=length(p-gaze);
            vec3 color=iris*(0.75+0.25*(1.0-p.y));
            color=mix(color,pupil,1.0-smoothstep(0.66,0.69,pr));
            color=mix(color,pupil,smoothstep(0.89,1.0,r)*0.8);
            vec2 glint=gaze+vec2(-0.21,min(0.29,top-0.14));
            float shine=1.0-smoothstep(0.065,0.10,length(p-glint));
            color=mix(color,vec3(0.94,0.87,0.70),shine);
            gl_FragColor=vec4(color,1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      });
      const eyeGeometry = new T.BufferGeometry(),
        eyePositions: number[] = [],
        uvs: number[] = [],
        indices: number[] = [];
      const resolution = 16,
        cx = side * (this.cat ? 0.3 : 0.235),
        cy = this.cat ? -0.005 : 0.02;
      const rx = (this.cat ? 0.31 : 0.232) / 2,
        ry = (this.cat ? 0.315 : 0.285) / 2;
      for (let y = 0; y <= resolution; y++)
        for (let x = 0; x <= resolution; x++) {
          const u = x / resolution,
            vv = y / resolution,
            px = cx + (u * 2 - 1) * rx,
            py = cy + (vv * 2 - 1) * ry;
          eyePositions.push(px, py, faceSurface(px, py) + 0.007);
          uvs.push(u, vv);
        }
      for (let y = 0; y < resolution; y++)
        for (let x = 0; x < resolution; x++) {
          const i = y * (resolution + 1) + x;
          indices.push(
            i,
            i + 1,
            i + resolution + 2,
            i,
            i + resolution + 2,
            i + resolution + 1,
          );
        }
      eyeGeometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(eyePositions, 3),
      );
      eyeGeometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
      eyeGeometry.setIndex(indices);
      eyeGeometry.computeVertexNormals();
      const eye = new T.Mesh(eyeGeometry, material);
      this.eyeMaterials.push(material);
      this.materials.push(material);
      this.details.push(eye.geometry);
      this.eyes.add(eye);
      if (this.cat) {
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [
              side * -0.105,
              0.025,
              0.09,
              side * 0.105,
              0.025,
              0.037,
              side * 0.125,
              0.355,
              -0.002,
            ],
            3,
          ),
        );
        g.computeVertexNormals();
        this.detail(
          this.byName[side < 0 ? "earL" : "earR"],
          g,
          "#9e5c50",
          [0, 0, 0],
          [1, 1, 1],
        );
      }
    }
    // A small bevelled triangular nose, with a feline philtrum and two quiet mouth curves.
    const nose = new T.BufferGeometry();
    const nx = this.cat ? 0.068 : 0.095,
      ny = this.cat ? 0.047 : 0.06;
    nose.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          -nx,
          ny * 0.5,
          0,
          nx,
          ny * 0.5,
          0,
          0,
          -ny,
          0,
          -nx,
          ny * 0.5,
          0,
          0,
          ny * 0.4,
          0.025,
          nx,
          ny * 0.5,
          0,
          nx,
          ny * 0.5,
          0,
          0,
          ny * 0.4,
          0.025,
          0,
          -ny,
          0,
          0,
          -ny,
          0,
          0,
          ny * 0.4,
          0.025,
          -nx,
          ny * 0.5,
          0,
        ],
        3,
      ),
    );
    nose.computeVertexNormals();
    this.detail(
      this.byName.head,
      nose,
      this.cat ? "#985d57" : "#30231a",
      [
        0,
        this.cat ? -0.176 : -0.178,
        faceSurface(0, this.cat ? -0.176 : -0.178) + 0.009,
      ],
      [1, 1, 1],
    );
    for (const side of [-1, 1]) {
      const curve = new T.CatmullRomCurve3(
        [
          [0, -0.224],
          [side * 0.035, -0.27],
          [side * 0.075, -0.278],
          [side * 0.104, -0.264],
        ].map(([x, y]) => new T.Vector3(x, y, faceSurface(x, y) + 0.009)),
      );
      this.detail(
        this.jaw,
        new T.TubeGeometry(curve, 5, 0.006, 4, false),
        this.cat ? "#050608" : "#594330",
        [0, 0, 0],
        [1, 1, 1],
      );
    }
    this.tongue = this.detail(
      this.jaw,
      new T.SphereGeometry(1, 8, 6),
      "#c98982",
      [0, -0.27, faceSurface(0, -0.27) + 0.025],
      [0.055, 0.06, 0.02],
    );
    this.tongue.visible = false;
    this.jaw.add(this.fangs);
    for (const side of [-1, 1]) {
      const tooth = this.detail(
        this.fangs,
        new T.ConeGeometry(0.01, 0.025, 4),
        "#e9dfc6",
        [side * 0.045, -0.258, faceSurface(side * 0.045, -0.258) + 0.01],
        [1, 1, 1],
      );
      tooth.rotation.z = Math.PI;
    }
    this.fangs.visible = false;
    this.root.updateMatrixWorld(true);
  }

  private detail(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    color: string,
    position: number[],
    scale: number[],
    roughness = 0.85,
  ) {
    const material = new T.MeshStandardMaterial({
      color,
      roughness,
      flatShading: true,
      side: T.DoubleSide,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.position.copy(v(position));
    mesh.scale.copy(v(scale));
    parent.add(mesh);
    this.materials.push(material);
    this.details.push(geometry);
    return mesh;
  }
  private rotate(name: string, x: number, y: number, z: number, alpha: number) {
    q.setFromEuler(euler.set(x, y, z, "XYZ"));
    this.byName[name].quaternion.slerp(q, alpha);
  }
  private positionInRig(object: T.Object3D, out: T.Vector3) {
    object.getWorldPosition(out);
    return this.root.worldToLocal(out);
  }
  private worldOrientation(bone: T.Bone, orientation: T.Quaternion) {
    this.root.getWorldQuaternion(rootQ);
    bone.parent!.getWorldQuaternion(parentQ).invert();
    bone.quaternion.copy(parentQ).multiply(rootQ).multiply(orientation);
    bone.updateWorldMatrix(false, true);
  }
  private solve(leg: Leg, target: T.Vector3) {
    this.positionInRig(leg.upper, a);
    axis.copy(target).sub(a);
    const l1 = leg.upperRest.length(),
      l2 = leg.lowerRest.length();
    const distance = clamp(
      axis.length(),
      Math.abs(l1 - l2) + 0.002,
      (l1 + l2) * 0.995,
    );
    axis.normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    bend
      .set(0, 0, leg.front ? -1 : 1)
      .addScaledVector(axis, -axis.z * (leg.front ? -1 : 1))
      .normalize();
    knee.copy(a).addScaledVector(axis, along).addScaledVector(bend, height);
    b.copy(leg.upperRest).normalize();
    c.copy(knee).sub(a).normalize();
    q.setFromUnitVectors(b, c);
    this.worldOrientation(leg.upper, q);
    b.copy(leg.lowerRest).normalize();
    c.copy(a).addScaledVector(axis, distance).sub(knee).normalize();
    q.setFromUnitVectors(b, c);
    this.worldOrientation(leg.lower, q);
    q.identity();
    this.worldOrientation(leg.paw, q);
  }

  moveTo(x: number, z: number, heading: number, delta: number) {
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 12);
    this.root.position.x = mix(this.root.position.x, x, alpha);
    this.root.position.z = mix(this.root.position.z, z, alpha);
    const turn = Math.atan2(
      Math.sin(heading - this.root.rotation.y),
      Math.cos(heading - this.root.rotation.y),
    );
    this.root.rotation.y += turn * alpha;
  }
  update(input: AnimalInput) {
    const dt = clamp(input.delta, 0, 0.05),
      t = input.time,
      state = input.state;
    const alpha = 1 - Math.exp(-dt * (state === "sleeping" ? 4 : 8));
    const w = this.weights,
      carrying = input.dragging && !input.reduced;
    const desired = {
      sleep: state === "sleeping" ? 1 : 0,
      stretch: state === "stretch" ? 1 : 0,
      dig: state === "digging" ? 1 : 0,
      carry: carrying ? 1 : 0,
      paw: state === "paw" ? 1 : 0,
      groom: state === "groom" ? 1 : 0,
      nip: ["bite", "boop", "lick", "pounce"].includes(state) ? 1 : 0,
      sit: 1 - clamp(input.stand, 0, 1),
    };
    if (
      desired.sleep ||
      desired.stretch ||
      desired.dig ||
      desired.carry ||
      desired.nip
    )
      desired.sit = 0;
    for (const key of Object.keys(w) as (keyof typeof w)[])
      w[key] = mix(w[key], desired[key], alpha);
    const breath = input.reduced
      ? 0
      : Math.sin(t * (state === "breathing" ? Math.PI / 4 : 1.7)) * 0.009;
    const hip = this.byName.pelvis,
      rest = this.data.bones[0].position;
    hip.position.set(
      0,
      rest[1] -
        (this.cat ? 0.46 : 0.54) * w.sit -
        (this.cat ? 0.4 : 0.51) * w.sleep -
        0.12 * w.dig +
        0.48 * w.carry +
        breath,
      rest[2] - 0.07 * w.sit,
    );
    // Tilt the torso as one mass when sitting: splitting the bend across the
    // belly bones compressed the chest into sharp folds.
    this.rotate(
      "pelvis",
      -0.55 * w.sit + 0.06 * w.carry,
      0.14 * w.sleep,
      carrying ? Math.sin(t * 2) * 0.035 : 0,
      alpha,
    );
    this.rotate(
      "spine",
      0.22 * w.stretch + 0.1 * w.dig,
      0.1 * w.sleep,
      0,
      alpha,
    );
    this.rotate(
      "chest",
      0.16 * w.stretch + 0.4 * w.sleep,
      0.12 * w.sleep,
      0,
      alpha,
    );
    this.rotate(
      "neck",
      0.2 * w.sit + 0.25 * w.stretch + 0.2 * w.dig,
      0.25 * w.sleep,
      0,
      alpha,
    );
    this.root.updateMatrixWorld(true);
    // Derive a comfortable seated shoulder height from this character's leg lengths.
    // This keeps the front paws below the shoulders after torso proportions change.
    if (w.sit > 0.001) {
      const leg = this.legs[0];
      this.positionInRig(leg.upper, a);
      const height =
        0.14 + (leg.upperRest.length() + leg.lowerRest.length()) * 0.965;
      hip.position.y += (height - a.y) * w.sit;
      this.root.updateMatrixWorld(true);
    }
    if (w.sleep > 0.001) {
      const curledNeck = new T.Quaternion().setFromEuler(
        new T.Euler(1.45, 0.15, 0, "YXZ"),
      );
      this.byName.neck.getWorldQuaternion(parentQ);
      this.root.getWorldQuaternion(rootQ).invert();
      const neckOrientation = rootQ
        .multiply(parentQ)
        .slerp(curledNeck, w.sleep)
        .clone();
      this.worldOrientation(this.byName.neck, neckOrientation);
    }
    // Keep gaze independent of spine curvature; a seated head stays upright.
    const headPitch =
      0.32 * w.sleep +
      0.36 * w.stretch +
      0.3 * w.dig +
      0.5 * w.groom -
      0.13 * w.nip;
    const headYaw =
      0.35 * w.sleep + clamp(input.target.x, -1, 1) * 0.15 * (1 - w.sleep);
    q.setFromEuler(
      euler.set(
        headPitch,
        headYaw,
        state === "curious" ? 0.12 : this.cat ? 0.04 : 0,
        "YXZ",
      ),
    );
    const desiredHead = q.clone();
    this.byName.head.getWorldQuaternion(parentQ);
    this.root.getWorldQuaternion(rootQ).invert();
    const currentHead = rootQ
      .multiply(parentQ)
      .slerp(desiredHead, alpha)
      .clone();
    this.worldOrientation(this.byName.head, currentHead);
    for (const side of [-1, 1])
      this.rotate(
        side < 0 ? "earL" : "earR",
        -0.12 * w.nip,
        0,
        side *
          (0.12 * w.carry +
            (this.cat
              ? -0.12 * w.nip
              : Math.sin(t * 4) * 0.035 * (input.walking ? 1 : 0))),
        alpha,
      );
    const tails = this.data.bones.filter((bone) =>
      bone.name.startsWith("tail"),
    );
    const tailCurl = smooth(Math.max(w.sleep, w.sit));
    this.root.updateMatrixWorld(true);
    tails.forEach((def, i) => {
      const wag = input.reduced
        ? 0
        : Math.sin(t * (this.cat ? 1.7 : 5.5) - i * 0.5) *
          (this.cat ? 0.07 : 0.14) *
          (state === "happy" ? 1.7 : 1);
      const target = new T.Quaternion().setFromEuler(
        new T.Euler(0.06 * w.carry, wag * (i + 1) * 0.6, 0.04 * w.carry),
      );
      if (i < tails.length - 1) {
        const next = this.byName[tails[i + 1].name];
        this.positionInRig(this.byName[def.name], a);
        const dy = clamp((0.13 - a.y) / next.position.length(), -0.8, 0.3);
        const horizontal = Math.sqrt(1 - dy * dy);
        const direction = new T.Vector3(
          Math.sin(-1.45 + i * 0.42) * horizontal,
          dy,
          Math.cos(-1.45 + i * 0.42) * horizontal,
        );
        const curled = new T.Quaternion().setFromUnitVectors(
          next.position.clone().normalize(),
          direction,
        );
        target.slerp(curled, tailCurl);
      }
      this.byName[def.name].getWorldQuaternion(parentQ);
      this.root.getWorldQuaternion(rootQ).invert();
      const orientation = rootQ
        .multiply(parentQ)
        .rotateTowards(target, dt * 4)
        .clone();
      this.worldOrientation(this.byName[def.name], orientation);
    });
    this.root.updateMatrixWorld(true);
    const moving = input.walking && !input.reduced && !carrying;
    for (const leg of this.legs) {
      const restP = this.data.bones.find(
        (b) => b.name === leg.paw.name,
      )!.position;
      const foot = v(restP);
      foot.y = 0.14;
      if (!leg.front) {
        foot.z += 0.16 * w.sit;
        foot.x += leg.side * 0.055 * w.sit;
      }
      if (leg.front && w.sit > 0.001) {
        this.positionInRig(leg.upper, b);
        foot.z = mix(foot.z, b.z + 0.025, w.sit);
        foot.x = mix(foot.x, b.x * 0.86, w.sit);
      }
      foot.z += (leg.front ? 0.4 : -0.1) * w.stretch;
      if (w.sleep > 0.001) {
        if (leg.front) {
          this.positionInRig(this.byName.head, b);
          foot.lerp(
            new T.Vector3(
              b.x + leg.side * (this.cat ? 0.23 : 0.29),
              0.14,
              b.z + 0.16,
            ),
            w.sleep,
          );
        } else {
          this.positionInRig(leg.upper, b);
          foot.lerp(
            new T.Vector3(b.x + leg.side * 0.08, 0.14, b.z + 0.18),
            w.sleep,
          );
        }
      }
      if (leg.front) {
        const phase = t * 10 + (leg.side < 0 ? 0 : Math.PI);
        foot.y += Math.max(0, Math.sin(phase)) * 0.2 * w.dig;
        foot.z += (0.2 + Math.cos(phase) * 0.16) * w.dig;
        if (leg.side < 0) {
          foot.y += 0.36 * w.paw + 0.82 * w.groom;
          foot.z += 0.18 * w.paw + 0.2 * w.groom;
          foot.x *= 1 - 0.65 * w.groom;
        }
        foot.y += 0.12 * w.nip;
        foot.z += 0.15 * w.nip;
      }
      if (w.carry > 0.001) {
        this.positionInRig(leg.upper, b);
        foot.lerp(
          new T.Vector3(
            b.x,
            b.y - (leg.upperRest.length() + leg.lowerRest.length()) * 0.87,
            b.z + 0.13,
          ),
          w.carry,
        );
      }
      const phase =
        (((input.stride / tau +
          (leg.front ? (leg.side < 0 ? 0 : 0.5) : leg.side < 0 ? 0.75 : 0.25)) %
          1) +
          1) %
        1;
      if (moving) {
        const reach = this.cat ? 0.165 : 0.195;
        if (phase < 0.62) {
          foot.z += reach - (phase / 0.62) * reach * 2;
          if (!leg.planted && input.stand > 0.85) {
            leg.plant.copy(foot);
            this.root.localToWorld(leg.plant);
            leg.planted = true;
          }
          if (leg.planted) {
            b.copy(leg.plant);
            this.root.worldToLocal(b);
            foot.copy(b);
          }
        } else {
          leg.planted = false;
          const swing = (phase - 0.62) / 0.38;
          foot.z += -reach + smooth(swing) * reach * 2;
          foot.y += Math.sin(swing * Math.PI) * (this.cat ? 0.13 : 0.16);
        }
      } else leg.planted = false;
      leg.foot.lerp(foot, 1 - Math.exp(-dt * (moving ? 22 : 9)));
      this.solve(leg, leg.foot);
    }
    const affectionate = ["blink", "petting", "happy", "breathing"].includes(
      state,
    );
    const blink = !input.reduced && (t + (this.cat ? 1.3 : 3.1)) % 4.9 < 0.12;
    // Eyelids occlude a fixed-size iris; they never squash the eye or the skull.
    const staring = this.cat && ["watching", "curious"].includes(state);
    const deliberateSquint =
      this.cat && !input.reduced && Math.sin(t * 0.32) > 0.95;
    for (let i = 0; i < this.eyeMaterials.length; i++) {
      const uniforms = this.eyeMaterials[i].uniforms;
      const resting = this.cat ? (i === 0 ? 0.56 : 0.72) : 1;
      const target =
        w.sleep > 0.5 || blink
          ? 0.015
          : affectionate
            ? 0.24
            : staring || deliberateSquint
              ? 0.28
              : resting;
      uniforms.opening.value = mix(uniforms.opening.value, target, alpha * 1.5);
      (uniforms.gaze.value as T.Vector2).lerp(
        new T.Vector2(
          clamp(input.target.x, -1, 1) * 0.15,
          clamp(input.target.y, -1, 1) * 0.06,
        ),
        alpha,
      );
    }
    this.jaw.rotation.x = mix(
      this.jaw.rotation.x,
      state === "bite" ? 0.06 : state === "lick" ? 0.04 : 0,
      alpha,
    );
    this.tongue.visible = !this.cat && state === "lick";
    this.tongue.scale.y = 0.06 + (input.reduced ? 0 : Math.sin(t * 16) * 0.018);
    this.fangs.visible = this.cat && state === "bite";
    this.root.updateMatrixWorld(true);
    this.mesh.skeleton.update();
  }
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.skeleton.dispose();
    this.materials.forEach((m) => m.dispose());
    this.details.forEach((g) => g.dispose());
  }
}
