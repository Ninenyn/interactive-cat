"use client";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Companion } from "@/interactions/companionStateMachine";
import { RoomRuntime, type HitCircle } from "@/interactions/roomRuntime";
import {
  CAMERA_TARGET_Y,
  roomZoom,
  roomBounds,
  groundToScreen,
} from "@/interactions/roomCoordinates";

type Vec3 = [number, number, number];
type SceneProps = {
  runtime: RoomRuntime;
  pet: Companion;
  reduced: boolean;
  visible: boolean;
  dark: boolean;
};
const roamingStates = new Set([
  "idle",
  "watching",
  "curious",
  "blink",
  "happy",
  "entering",
]);
function Facet({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  color,
  detail = 0,
  seed = 1,
  meshRef,
}: {
  position?: Vec3;
  scale?: Vec3;
  rotation?: Vec3;
  color: string;
  detail?: number;
  seed?: number;
  meshRef?: RefObject<THREE.Mesh | null>;
}) {
  const geometry = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const count = geometry.getAttribute("position").count;
    const colors = new Float32Array(count * 3),
      base = new THREE.Color(color);
    for (let i = 0; i < count; i += 3) {
      const shade =
        0.91 + (Math.sin(i * 17.17 + seed * 7.13) * 0.5 + 0.5) * 0.19;
      for (let j = 0; j < 3; j++)
        base
          .clone()
          .multiplyScalar(shade)
          .toArray(colors, (i + j) * 3);
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [color, detail, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      rotation={rotation}
      geometry={geometry}
    >
      <meshStandardMaterial vertexColors flatShading roughness={0.94} />
    </mesh>
  );
}
function CatEar({ side }: { side: number }) {
  const geometry = useMemo(() => {
    const vertices = [
      [-0.25, 0, 0.07],
      [0.25, 0, 0.07],
      [-0.06, 0.62, -0.06],
      [-0.2, 0, -0.23],
      [0.2, 0, -0.23],
    ];
    const faces = [0, 1, 2, 1, 4, 2, 4, 3, 2, 3, 0, 2, 0, 3, 4, 0, 4, 1];
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        faces.flatMap((i) => vertices[i]),
        3,
      ),
    );
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group
      position={[side * 0.43, 0.34, -0.04]}
      rotation={[0, 0, side * -0.17]}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#24242b" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 0.22, 0.048]} rotation={[0.19, 0, Math.PI / 2]}>
        <circleGeometry args={[0.18, 3]} />
        <meshStandardMaterial
          color="#6d565a"
          flatShading
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
function Tail({ cat }: { cat: boolean }) {
  const geometry = useMemo(() => {
    const points = (
      cat
        ? [
            [0, 0, 0],
            [0.06, 0.24, -0.3],
            [0.22, 0.67, -0.42],
            [0.19, 1.03, -0.38],
            [-0.05, 1.13, -0.3],
          ]
        : [
            [0, 0, 0],
            [0.04, 0.16, -0.25],
            [0.08, 0.38, -0.58],
            [0.02, 0.61, -0.81],
          ]
    ).map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(
      curve,
      10,
      cat ? 0.115 : 0.2,
      5,
      false,
    );
    const positions = geometry.getAttribute("position");
    for (let ring = 0; ring <= 10; ring++) {
      const center = curve.getPointAt(ring / 10);
      const taper = cat
        ? 1 - (ring / 10) * 0.55
        : Math.sin(((ring / 10) * 0.85 + 0.12) * Math.PI) * 0.8 + 0.16;
      for (let j = 0; j <= 5; j++) {
        const i = ring * 6 + j;
        positions.setXYZ(
          i,
          center.x + (positions.getX(i) - center.x) * taper,
          center.y + (positions.getY(i) - center.y) * taper,
          center.z + (positions.getZ(i) - center.z) * taper,
        );
      }
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [cat]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={cat ? "#25252c" : "#c58d43"}
        flatShading
        roughness={1}
      />
    </mesh>
  );
}
function PetEyes({ cat }: { cat: boolean }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * (cat ? 0.265 : 0.28), 0.025, cat ? 0.49 : 0.515]}
          rotation={[0, side * 0.22, 0]}
        >
          {cat && (
            <Facet
              scale={[0.15, 0.18, 0.086]}
              color="#d4b467"
              seed={side + 3}
            />
          )}
          <Facet
            position={[0, 0, cat ? 0.046 : 0]}
            scale={[cat ? 0.098 : 0.128, cat ? 0.142 : 0.168, 0.075]}
            color="#101215"
          />
          <Facet
            position={[-0.037, 0.052, cat ? 0.115 : 0.069]}
            scale={[0.028, 0.034, 0.015]}
            color="#fff7df"
            detail={0}
          />
        </group>
      ))}
    </>
  );
}
function Pet({
  runtime,
  pet,
  reduced,
}: {
  runtime: RoomRuntime;
  pet: Companion;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    pose = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Mesh>(null),
    chest = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null),
    ears = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null),
    fangs = useRef<THREE.Group>(null),
    tongue = useRef<THREE.Mesh>(null);
  const front = useRef<(THREE.Group | null)[]>([]),
    back = useRef<(THREE.Group | null)[]>([]);
  const thighs = useRef<(THREE.Mesh | null)[]>([]),
    backFeet = useRef<(THREE.Group | null)[]>([]);
  const shadow = useRef<THREE.Mesh>(null);
  const { size, camera } = useThree();
  const pointRef = useRef(new THREE.Vector3());
  const cat = pet === "jew",
    fur = cat ? "#25262d" : "#d2a052",
    light = cat ? "#303139" : "#e6bb75";
  const pawColor = cat ? "#292a31" : "#ebc888";
  const texture = useMemo(() => {
    const data = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const r = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
        const i = (y * 64 + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 32;
        data[i + 3] = Math.round(
          Math.max(0, Math.exp(-r * r * 5) - Math.exp(-5)) * 100,
        );
      }
    const t = new THREE.DataTexture(data, 64, 64);
    t.needsUpdate = true;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((frame, delta) => {
    if (size.width <= 0 || size.height <= 0) return;
    if (
      !root.current ||
      !pose.current ||
      !head.current ||
      !torso.current ||
      !chest.current ||
      !eyes.current ||
      !ears.current ||
      !tail.current ||
      !jaw.current
    )
      return;
    const point = pointRef.current;
    const entry = runtime.pets[pet];
    const machine = entry.machine,
      motion = entry.motion,
      s = machine.getSnapshot();
    motion.step(
      delta,
      roomBounds(size.width, size.height),
      { x: 99, z: 99 },
      roamingStates.has(s.state) && !runtime.paused,
      reduced,
    );
    const t = frame.clock.elapsedTime,
      elapsed = (machine.clock - s.since) / 1000;
    const smooth = 1 - Math.exp(-Math.min(delta, 0.05) * 12),
      stand = reduced ? 0 : motion.stand;
    const contact = ["pounce", "bite", "boop", "lick"].includes(s.state),
      hunting = s.state === "hunting";
    const sleeping = s.state === "sleeping",
      digging = s.state === "digging";
    const affectionate = ["happy", "petting", "blink", "breathing"].includes(
      s.state,
    );
    const moving = motion.walking && !reduced,
      stride = motion.stride;
    const bob = moving ? Math.abs(Math.sin(stride)) * 0.045 : 0;
    const headY = THREE.MathUtils.lerp(
      cat ? 1.84 : 1.9,
      cat ? 1.48 : 1.61,
      stand,
    );
    const z = motion.z,
      x = motion.x,
      y = bob;
    root.current.position.lerp(point.set(x, y, z), smooth);
    const desiredHeading = contact || hunting || digging ? 0 : motion.heading;
    const difference = Math.atan2(
      Math.sin(desiredHeading - root.current.rotation.y),
      Math.cos(desiredHeading - root.current.rotation.y),
    );
    root.current.rotation.y += difference * smooth;
    pose.current.scale.y = THREE.MathUtils.lerp(
      pose.current.scale.y,
      sleeping ? 0.68 : hunting ? 0.84 : s.state === "stretch" ? 0.82 : 1,
      smooth,
    );
    const breath = !reduced
      ? Math.sin(s.state === "breathing" ? (elapsed * Math.PI) / 4 : t * 1.6) *
        (s.state === "breathing" ? 0.025 : 0.009)
      : 0;
    torso.current.position.set(0, 0.85 + stand * 0.06, -0.22 + stand * 0.08);
    torso.current.scale.set(
      (cat ? 0.48 : 0.55) + breath,
      THREE.MathUtils.lerp(0.7, 0.47, stand),
      THREE.MathUtils.lerp(0.49, cat ? 0.74 : 0.81, stand),
    );
    chest.current.position.set(
      0,
      THREE.MathUtils.lerp(1.22, 1.04, stand),
      THREE.MathUtils.lerp(0.17, 0.4, stand),
    );
    chest.current.scale.set(
      cat ? 0.35 : 0.39,
      THREE.MathUtils.lerp(0.5, 0.37, stand),
      0.34,
    );
    head.current.position.set(
      0,
      headY +
        (moving ? Math.cos(stride * 2) * 0.025 : 0) -
        (digging ? 0.25 : 0),
      THREE.MathUtils.lerp(0.3, 0.72, stand),
    );
    const engaged = ["watching", "curious", "petting", "happy", "paw"].includes(
      s.state,
    );
    head.current.rotation.y = THREE.MathUtils.lerp(
      head.current.rotation.y,
      engaged
        ? Math.max(-0.28, Math.min(0.28, machine.target.x * 0.3))
        : Math.sin(t * 0.42 + (cat ? 0 : 3)) * 0.05,
      smooth,
    );
    head.current.rotation.x = THREE.MathUtils.lerp(
      head.current.rotation.x,
      sleeping ? 0.18 : digging ? 0.2 : affectionate ? -0.08 : 0,
      smooth,
    );
    head.current.rotation.z = THREE.MathUtils.lerp(
      head.current.rotation.z,
      s.state === "curious"
        ? cat
          ? -0.12
          : 0.2
        : affectionate && !reduced
          ? Math.sin(t * 1.5) * 0.07
          : 0,
      smooth,
    );
    const blink = (t + (cat ? 1.1 : 3.4)) % (cat ? 5.1 : 4.7) < 0.14;
    eyes.current.scale.y = THREE.MathUtils.lerp(
      eyes.current.scale.y,
      sleeping ? 0.06 : affectionate ? 0.17 : blink ? 0.08 : 1,
      smooth,
    );
    tail.current.position.set(
      0,
      THREE.MathUtils.lerp(0.55, 0.99, stand),
      THREE.MathUtils.lerp(-0.56, -0.82, stand),
    );
    tail.current.rotation.z = reduced
      ? 0
      : Math.sin(
          t *
            (cat ? (s.state === "annoyed" ? 11 : 1.8) : affectionate ? 12 : 7),
        ) * (cat ? 0.14 : 0.43);
    tail.current.rotation.y = reduced
      ? 0
      : Math.sin(t * (cat ? 1.4 : 7)) * (cat ? 0.13 : 0.32);
    tail.current.rotation.x = cat ? 0 : -0.1;
    ears.current.rotation.z =
      !cat && moving
        ? Math.sin(stride) * 0.08
        : cat && s.state === "curious"
          ? Math.sin(t * 7) * 0.025
          : 0;
    for (let i = 0; i < 2; i++) {
      const f = front.current[i],
        b = back.current[i],
        thigh = thighs.current[i],
        foot = backFeet.current[i];
      const phase = stride + i * Math.PI;
      if (f) {
        f.position.set(
          (i === 0 ? -1 : 1) * (cat ? 0.3 : 0.34),
          0.8,
          THREE.MathUtils.lerp(0.34, 0.53, stand),
        );
        f.rotation.x = moving ? Math.sin(phase) * 0.48 : 0;
        if (digging && !reduced) {
          f.rotation.x = -0.25 + Math.sin(t * 15 + i * Math.PI) * 0.6;
          f.position.y += 0.1;
        }
        if (
          (s.state === "paw" && i === 0) ||
          contact ||
          (s.state === "groom" && i === 0)
        ) {
          f.position.y += 0.3;
          f.rotation.x = -0.95;
        }
      }
      if (b) {
        b.position.set(
          (i === 0 ? -1 : 1) * THREE.MathUtils.lerp(0.44, 0.34, stand),
          THREE.MathUtils.lerp(0.61, 0.8, stand),
          THREE.MathUtils.lerp(-0.3, -0.7, stand),
        );
        b.rotation.x = moving
          ? Math.sin(phase + (cat ? Math.PI * 0.7 : Math.PI)) * 0.43
          : 0;
      }
      if (thigh)
        thigh.scale.set(
          THREE.MathUtils.lerp(0.3, 0.2, stand),
          THREE.MathUtils.lerp(0.37, 0.27, stand),
          THREE.MathUtils.lerp(0.35, 0.25, stand),
        );
      if (foot)
        foot.position.set(
          0,
          THREE.MathUtils.lerp(-0.47, -0.64, stand),
          THREE.MathUtils.lerp(0.19, 0.08, stand),
        );
    }
    jaw.current.position.y = THREE.MathUtils.lerp(
      jaw.current.position.y,
      s.state === "pounce" ? -0.09 : 0,
      smooth,
    );
    if (fangs.current) fangs.current.visible = cat && s.state === "bite";
    if (tongue.current) {
      tongue.current.visible = !cat && s.state === "lick";
      tongue.current.scale.y = 0.2 + Math.sin(t * 18) * 0.06;
    }
    if (shadow.current) {
      shadow.current.position.set(motion.x, 0.008, motion.z);
      shadow.current.rotation.z = -motion.heading;
      shadow.current.scale.set(
        cat ? 1.7 : 1.9,
        THREE.MathUtils.lerp(1.35, 1.85, stand),
        1,
      );
    }
    root.current.updateWorldMatrix(true, true);
    const zoom = roomZoom(size.width, size.height);
    const project = (
      object: THREE.Object3D,
      radius: number,
      zone: HitCircle["zone"],
      offsetY = 0,
    ): HitCircle => {
      object.getWorldPosition(point);
      point.y += offsetY;
      point.project(camera);
      return {
        x: ((point.x + 1) * size.width) / 2,
        y: ((1 - point.y) * size.height) / 2,
        rx: radius * zoom,
        ry: radius * zoom,
        zone,
      };
    };
    const hits: HitCircle[] = [
      project(head.current, cat ? 0.69 : 0.75, "head"),
    ];
    for (const leg of front.current)
      if (leg) hits.push(project(leg, 0.25, "paw", -0.58));
    hits.push(
      project(chest.current, 0.46, "chin"),
      project(torso.current, 0.63, "body"),
      project(tail.current, 0.28, "tail", 0.5),
    );
    runtime.project(pet, hits);
  });
  return (
    <>
      <mesh
        ref={shadow}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group
        ref={root}
        position={[runtime.pets[pet].motion.x, 0, runtime.pets[pet].motion.z]}
      >
        <group ref={pose}>
          <Facet
            meshRef={torso}
            position={[0, 0.85, -0.22]}
            scale={[0.5, 0.7, 0.5]}
            color={fur}
            seed={3}
          />
          <Facet
            meshRef={chest}
            position={[0, 1.22, 0.17]}
            scale={[0.36, 0.5, 0.34]}
            color={cat ? light : "#edcf93"}
            seed={8}
          />
          <group ref={tail} position={[0, 0.55, -0.56]}>
            <Tail cat={cat} />
          </group>
          {[-1, 1].map((side, i) => (
            <group
              key={"back" + side}
              ref={(node) => {
                back.current[i] = node;
              }}
              position={[side * 0.44, 0.61, -0.3]}
            >
              <mesh
                ref={(node) => {
                  thighs.current[i] = node;
                }}
                position={[0, -0.13, 0]}
                scale={[0.3, 0.37, 0.35]}
              >
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color={fur} flatShading roughness={1} />
              </mesh>
              <Facet
                position={[0, -0.32, 0.02]}
                scale={[0.17, 0.23, 0.18]}
                color={fur}
              />
              <group
                ref={(node) => {
                  backFeet.current[i] = node;
                }}
                position={[0, -0.47, 0.19]}
              >
                <Facet
                  scale={[0.23, 0.16, 0.3]}
                  color={pawColor}
                  seed={side + 3}
                />
              </group>
            </group>
          ))}
          {[-1, 1].map((side, i) => (
            <group
              key={"front" + side}
              ref={(node) => {
                front.current[i] = node;
              }}
              position={[side * 0.3, 0.8, 0.34]}
            >
              <Facet
                position={[0, -0.26, 0]}
                scale={[0.16, 0.34, 0.17]}
                color={light}
                seed={side + 2}
              />
              <Facet
                position={[0, -0.64, 0.09]}
                scale={[0.22, 0.16, 0.29]}
                color={pawColor}
                seed={side + 5}
              />
            </group>
          ))}
          <group ref={head} position={[0, cat ? 1.84 : 1.9, 0.3]}>
            <Facet
              scale={[cat ? 0.66 : 0.7, cat ? 0.61 : 0.64, 0.59]}
              color={light}
              seed={5}
              rotation={[0.05, 0.12, -0.03]}
            />
            <group ref={ears}>
              {cat ? (
                <>
                  <CatEar side={-1} />
                  <CatEar side={1} />
                </>
              ) : (
                [-1, 1].map((side) => (
                  <group
                    key={side}
                    position={[side * 0.61, 0.17, -0.08]}
                    rotation={[0, side * 0.12, side * 0.15]}
                  >
                    <Facet
                      position={[0, -0.32, 0]}
                      scale={[0.255, 0.53, 0.24]}
                      color="#bd853c"
                      rotation={[0.08, 0, side * -0.08]}
                      seed={side + 5}
                    />
                  </group>
                ))
              )}
            </group>
            <group ref={eyes}>
              <PetEyes cat={cat} />
            </group>
            <group ref={jaw}>
              {!cat && (
                <Facet
                  position={[0, -0.34, 0.57]}
                  scale={[0.24, 0.13, 0.14]}
                  color="#3c3027"
                />
              )}
              {cat ? (
                <>
                  {[-1, 1].map((side) => (
                    <Facet
                      key={side}
                      position={[side * 0.14, -0.23, 0.5]}
                      scale={[0.22, 0.18, 0.22]}
                      color="#38383e"
                      seed={side + 4}
                    />
                  ))}
                  <Facet
                    position={[0, -0.16, 0.696]}
                    scale={[0.093, 0.059, 0.061]}
                    color="#7e626a"
                    detail={0}
                    rotation={[0, 0, Math.PI]}
                  />
                  <Facet
                    position={[0, -0.34, 0.49]}
                    scale={[0.19, 0.1, 0.13]}
                    color="#292a30"
                  />
                </>
              ) : (
                <>
                  <Facet
                    position={[0, -0.19, 0.48]}
                    scale={[0.36, 0.245, 0.34]}
                    color="#f0d9a5"
                    seed={8}
                  />
                  <Facet
                    position={[0, -0.13, 0.79]}
                    scale={[0.155, 0.11, 0.105]}
                    color="#352c26"
                    detail={0}
                    rotation={[0, 0, Math.PI]}
                  />
                  <Facet
                    meshRef={tongue}
                    position={[0, -0.425, 0.676]}
                    scale={[0.108, 0.115, 0.046]}
                    color="#d99088"
                  />
                </>
              )}
              <group ref={fangs} visible={false}>
                <Facet
                  position={[0, -0.29, 0.68]}
                  scale={[0.14, 0.12, 0.06]}
                  color="#16151b"
                />
                {[-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[side * 0.09, -0.26, 0.729]}
                    rotation={[0, 0, Math.PI]}
                  >
                    <coneGeometry args={[0.031, 0.1, 3]} />
                    <meshStandardMaterial color="#f8ead3" flatShading />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}
function FrameDriver({
  visible,
  reduced,
}: {
  visible: boolean;
  reduced: boolean;
}) {
  const { invalidate, camera, size } = useThree();
  useLayoutEffect(() => {
    if (
      camera instanceof THREE.OrthographicCamera &&
      size.width > 0 &&
      size.height > 0
    ) {
      // eslint-disable-next-line react-hooks/immutability -- Three owns this mutable camera.
      camera.zoom = roomZoom(size.width, size.height);
      camera.lookAt(0, CAMERA_TARGET_Y, 0);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    if (!visible) return;
    let id = 0,
      last = 0,
      average = 16,
      previous = 0;
    const cores = navigator.hardwareConcurrency || 4;
    const loop = (now: number) => {
      if (previous) average = average * 0.95 + (now - previous) * 0.05;
      previous = now;
      const fps = reduced ? 12 : cores <= 4 || average > 28 ? 30 : 60;
      if (now - last >= 1000 / fps - 1) {
        invalidate();
        last = now;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [visible, reduced, invalidate]);
  return null;
}
function FlatRoom({
  runtime,
  pet: selectedPet,
  visible,
  reduced,
}: Pick<SceneProps, "runtime" | "pet" | "visible" | "reduced">) {
  const room = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible || !room.current) return;
    const element = room.current;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const { width, height } = element.getBoundingClientRect();
      // Canvas fallback children can be mounted without being displayed.
      if (width <= 0 || height <= 0) {
        frame = 0;
        last = 0;
        return;
      }
      const zoom = roomZoom(width, height);
      for (const pet of [selectedPet]) {
        const entry = runtime.pets[pet];
        entry.motion.step(
          dt,
          roomBounds(width, height),
          { x: 99, z: 99 },
          roamingStates.has(entry.machine.getSnapshot().state),
          reduced,
        );
        const p = groundToScreen(entry.motion.x, entry.motion.z, width, height);
        const svg = element.querySelector<SVGElement>(
          '[data-flat="' + pet + '"]',
        );
        if (svg) {
          svg.style.width = zoom * 2.1 + "px";
          svg.style.transform =
            "translate(" +
            (p.x - zoom * 1.05) +
            "px," +
            (p.y - zoom * 2.7) +
            "px)";
          svg.dataset.state = entry.machine.getSnapshot().state;
        }
        runtime.project(pet, [
          {
            x: p.x,
            y: p.y - zoom * 1.9,
            rx: zoom * 0.7,
            ry: zoom * 0.7,
            zone: "head",
          },
          {
            x: p.x,
            y: p.y - zoom * 0.7,
            rx: zoom * 0.65,
            ry: zoom * 0.7,
            zone: "body",
          },
          {
            x: p.x,
            y: p.y - zoom * 0.16,
            rx: zoom * 0.7,
            ry: zoom * 0.2,
            zone: "paw",
          },
        ]);
      }
      frame = requestAnimationFrame(tick);
    };
    const observer = new ResizeObserver(() => {
      const size = element.getBoundingClientRect();
      if (size.width > 0 && size.height > 0 && !frame)
        frame = requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [runtime, selectedPet, visible, reduced]);
  return (
    <div
      ref={room}
      className="flat-room"
      data-fallback="true"
      aria-hidden="true"
    >
      {[selectedPet].map((pet) => (
        <svg key={pet} data-flat={pet} viewBox="0 0 200 260">
          <ellipse
            cx="100"
            cy="238"
            rx="69"
            ry="13"
            fill="#000"
            opacity=".09"
          />
          <path
            d="M143 215Q190 192 170 149"
            fill="none"
            stroke={pet === "jew" ? "#2b2b34" : "#bc8c48"}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="m57 230-6-78 38-34 53 22 12 88Z"
            fill={pet === "jew" ? "#303139" : "#d5a85c"}
          />
          <path
            d="m80 133 22 85 37-75-34-17Z"
            fill={pet === "jew" ? "#3f4047" : "#ebce94"}
          />
          {pet === "jew" ? (
            <path d="m37 90 3-70 45 36 39-3 38-35 7 71Z" fill="#282931" />
          ) : (
            <path
              d="M33 54 19 112 47 133 61 61 144 60 156 133 184 111 167 51Z"
              fill="#b98540"
            />
          )}
          <path
            d="m41 61 43-22 45 5 37 24 8 51-34 33-76-1-32-38Z"
            fill={pet === "jew" ? "#35363e" : "#dfb469"}
          />
          <path
            d="m41 61 43-22 16 64-68 10Z"
            fill={pet === "jew" ? "#44454e" : "#edc681"}
          />
          <path
            d="m100 103 29-59 37 24 8 51-34 33Z"
            fill={pet === "jew" ? "#2c2d34" : "#cc9d54"}
          />
          <path
            d="m67 130 31-22 34 21-29 27Z"
            fill={pet === "jew" ? "#4d4850" : "#f2dcb0"}
          />
          <ellipse
            cx="69"
            cy="99"
            rx="10"
            ry="15"
            fill={pet === "jew" ? "#d6b76d" : "#292621"}
          />
          <ellipse
            cx="135"
            cy="99"
            rx="10"
            ry="15"
            fill={pet === "jew" ? "#d6b76d" : "#292621"}
          />
          <circle cx="67" cy="95" r="3" fill="white" />
          <circle cx="133" cy="95" r="3" fill="white" />
          <path d="m91 122 21 0-10 12Z" fill="#3b3032" />
          <path
            d="m57 224 31-5 5 20-40 0Zm57-4 31 4 7 15-40 0Z"
            fill={pet === "jew" ? "#404149" : "#efd09a"}
          />
        </svg>
      ))}
    </div>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function CompanionScene(props: SceneProps) {
  const [supported] = useState(() => {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      if (!context) return false;
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  });
  const { runtime, pet, reduced, visible, dark } = props;
  const fallback = (
    <FlatRoom runtime={runtime} pet={pet} reduced={reduced} visible={visible} />
  );
  if (!supported) return fallback;
  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        orthographic
        camera={{ position: [0, 7.5, 12], zoom: 100, near: 0.1, far: 50 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          stencil: false,
        }}
        fallback={fallback}
        aria-hidden="true"
      >
        <FrameDriver visible={visible} reduced={reduced} />
        <ambientLight intensity={0.85} />
        <hemisphereLight
          args={[dark ? "#ebeced" : "#fff4dc", "#8b8172", 1.45]}
        />
        <directionalLight
          position={[-3, 7, 6]}
          intensity={3.1}
          color={dark ? "#f3f1e8" : "#fff2d9"}
        />
        <directionalLight
          position={[4, 4, -3]}
          intensity={dark ? 3.4 : 2.6}
          color={dark ? "#c6d7e2" : "#ffe3ac"}
        />
        <directionalLight
          position={[2, 2, 5]}
          intensity={0.5}
          color="#f5e7d5"
        />
        <Pet runtime={runtime} pet={pet} reduced={reduced} />
      </Canvas>
    </SceneBoundary>
  );
}
