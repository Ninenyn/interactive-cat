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
    const colors: number[] = [],
      positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 3) {
      const center = new T.Vector3();
      for (let j = 0; j < 3; j++)
        center.add(new T.Vector3().fromBufferAttribute(positions, i + j));
      center.divideScalar(3);
      let color = this.cat ? "#33343b" : "#c59451";
      if (!this.cat) {
        if (center.z > 1.2 && center.y < 1.43) color = "#e5c797";
        else if (
          center.z > 0.35 &&
          center.z < 0.83 &&
          center.y < 1.2 &&
          center.y > 0.7 &&
          Math.abs(center.x) < 0.29
        )
          color = "#d1ad72";
        else if (Math.abs(center.x) > 0.3 && center.y > 1.35 && center.z > 0.8)
          color = "#a97437";
      }
      const rgb = new T.Color(color);
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
    this.byName.head.add(this.eyes, this.jaw);
    for (const side of [-1, 1]) {
      const eye = new T.Group();
      eye.position.set(side * 0.255, 0.035, this.cat ? 0.353 : 0.372);
      eye.rotation.y = side * 0.45;
      // Rounded, mostly dark eyes; a narrow warm iris avoids the old fixed stare.
      this.detail(
        eye,
        new T.SphereGeometry(1, 16, 12),
        this.cat ? "#c1a56b" : "#755034",
        [0, 0, 0],
        [0.094, 0.105, 0.027],
        0.5,
      );
      this.detail(
        eye,
        new T.SphereGeometry(1, 16, 12),
        "#15181b",
        [0, 0.004, 0.021],
        [0.076, 0.089, 0.019],
        0.3,
      );
      this.detail(
        eye,
        new T.SphereGeometry(1, 8, 6),
        "#fff2d8",
        [-0.026, 0.039, 0.038],
        [0.019, 0.023, 0.008],
        0.4,
      );
      this.detail(
        eye,
        new T.SphereGeometry(1, 6, 4),
        "#c9bca3",
        [0.029, -0.029, 0.038],
        [0.008, 0.01, 0.004],
        0.5,
      );
      this.eyes.add(eye);
      if (this.cat) {
        const ear = this.byName[side < 0 ? "earL" : "earR"];
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [
              -0.06,
              0.015,
              0.087,
              0.065,
              0.015,
              0.087,
              side * 0.028,
              0.21,
              0.032,
            ],
            3,
          ),
        );
        g.computeVertexNormals();
        this.detail(ear, g, "#80636c", [0, 0, 0], [1, 1, 1]);
      }
    }
    this.detail(
      this.byName.head,
      new T.IcosahedronGeometry(1, 0),
      this.cat ? "#8b686f" : "#342a27",
      [0, this.cat ? -0.085 : -0.1, this.cat ? 0.515 : 0.667],
      [this.cat ? 0.065 : 0.105, 0.042, 0.037],
    );
    this.detail(
      this.jaw,
      new T.SphereGeometry(1, 8, 6),
      "#30292a",
      [0, -0.19, this.cat ? 0.479 : 0.635],
      [this.cat ? 0.072 : 0.13, 0.009, 0.013],
    );
    this.tongue = this.detail(
      this.jaw,
      new T.SphereGeometry(1, 8, 6),
      "#c98982",
      [0, -0.225, 0.649],
      [0.055, 0.06, 0.027],
    );
    this.tongue.visible = false;
    this.jaw.add(this.fangs);
    for (const side of [-1, 1]) {
      const tooth = this.detail(
        this.fangs,
        new T.ConeGeometry(0.011, 0.025, 4),
        "#e9dfc6",
        [side * 0.046, -0.198, 0.488],
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
    this.rotate("chest", 0.16 * w.stretch, 0.12 * w.sleep, 0, alpha);
    this.rotate(
      "neck",
      0.2 * w.sit + 0.25 * w.stretch + 0.2 * w.dig,
      0.25 * w.sleep,
      0,
      alpha,
    );
    this.root.updateMatrixWorld(true);
    if (w.sleep > 0.001) {
      const curledNeck = new T.Quaternion().setFromEuler(
        new T.Euler(0.8, 0.35, 0, "YXZ"),
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
      0.28 * w.groom -
      0.13 * w.nip;
    const headYaw =
      0.35 * w.sleep + clamp(input.target.x, -1, 1) * 0.15 * (1 - w.sleep);
    q.setFromEuler(
      euler.set(headPitch, headYaw, state === "curious" ? 0.12 : 0, "YXZ"),
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
    const tailCurl = smooth(Math.max(w.sleep, w.sit * 0.92));
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
        const direction = new T.Vector3(
          Math.sin(-1.45 + i * 0.42),
          i === 0 ? -0.3 : 0,
          Math.cos(-1.45 + i * 0.42),
        ).normalize();
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
      if (leg.front) foot.z -= 0.24 * w.sit;
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
          foot.y += 0.36 * w.paw + 0.47 * w.groom;
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
    this.eyes.scale.y = mix(
      this.eyes.scale.y,
      w.sleep > 0.5 ? 0.06 : blink ? 0.08 : affectionate ? 0.42 : 1,
      alpha * 1.5,
    );
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
