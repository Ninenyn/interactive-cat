"use client";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CompanionMachine,
  type Companion,
  type Snapshot,
} from "@/interactions/companionStateMachine";
import { pointToWorld } from "@/interactions/gestureClassifier";

type Vec3 = [number, number, number];
type SceneProps = {
  machine: CompanionMachine;
  snapshot: Snapshot;
  reduced: boolean;
  visible: boolean;
};
function Pebble({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color,
  roughness = 0.8,
  rotation = [0, 0, 0],
}: {
  position?: Vec3;
  scale?: Vec3;
  color: string;
  roughness?: number;
  rotation?: Vec3;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}
function Curve({
  points,
  radius,
  color,
}: {
  points: Vec3[];
  radius: number;
  color: string;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh>
      <tubeGeometry args={[curve, 24, radius, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
const whiskers: Vec3[][] = [
  [
    [0.22, -0.22, 0.58],
    [0.52, -0.2, 0.58],
    [0.83, -0.1, 0.53],
  ],
  [
    [0.24, -0.27, 0.6],
    [0.55, -0.28, 0.6],
    [0.88, -0.26, 0.56],
  ],
  [
    [0.24, -0.31, 0.56],
    [0.55, -0.37, 0.59],
    [0.79, -0.43, 0.53],
  ],
];
function CatEar({ side }: { side: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.25, 0);
    s.lineTo(0.25, 0);
    s.lineTo(0, 0.66);
    s.closePath();
    return s;
  }, []);
  return (
    <group position={[side * 0.44, 0.35, -0.16]} rotation={[0, 0, side * -0.2]}>
      <mesh>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.16,
              bevelEnabled: true,
              bevelSegments: 3,
              steps: 1,
              bevelSize: 0.065,
              bevelThickness: 0.05,
            },
          ]}
        />
        <meshStandardMaterial color="#192027" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.07, 0.225]} scale={[0.58, 0.66, 1]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color="#795f6a"
          roughness={0.95}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
function Eyes({
  pet,
  group,
}: {
  pet: Companion;
  group: React.RefObject<THREE.Group | null>;
}) {
  const cat = pet === "jew";
  return (
    <group ref={group}>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.265, 0.07, 0.455]}
          rotation={[0, side * 0.13, side * 0.035]}
        >
          <Pebble
            scale={[cat ? 0.205 : 0.125, cat ? 0.145 : 0.15, 0.083]}
            color={cat ? "#cedd99" : "#221a13"}
            roughness={0.26}
          />
          <Pebble
            position={[0, 0, 0.07]}
            scale={[cat ? 0.052 : 0.075, cat ? 0.132 : 0.118, 0.024]}
            color={cat ? "#172327" : "#100f0d"}
            roughness={0.16}
          />
          <Pebble
            position={[-0.033, 0.044, 0.098]}
            scale={[0.029, 0.035, 0.012]}
            color="#fff9e8"
            roughness={0.05}
          />
          <Pebble
            position={[0.042, -0.03, 0.092]}
            scale={[0.011, 0.014, 0.008]}
            color={cat ? "#ffffff" : "#d2ac70"}
            roughness={0.08}
          />
        </group>
      ))}
    </group>
  );
}
function Pet({
  machine,
  pet,
  reduced,
}: {
  machine: CompanionMachine;
  pet: Companion;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    jaw = useRef<THREE.Group>(null),
    ears = useRef<THREE.Group>(null);
  const leftPaw = useRef<THREE.Group>(null),
    rightPaw = useRef<THREE.Group>(null),
    fangs = useRef<THREE.Group>(null);
  const { size } = useThree();
  const cat = pet === "jew",
    fur = cat ? "#1b2228" : "#c89650",
    highlight = cat ? "#202a32" : "#dfb16b",
    dark = cat ? "#12191f" : "#aa703a";
  const tailPoints = useMemo<Vec3[]>(
    () =>
      cat
        ? [
            [0, 0, 0],
            [0.52, -0.05, -0.02],
            [0.9, 0.12, 0],
            [1.03, 0.61, -0.03],
            [0.85, 0.91, -0.03],
          ]
        : [
            [0, 0, 0],
            [0.42, 0.22, -0.1],
            [0.75, 0.49, -0.13],
            [0.87, 0.64, -0.12],
          ],
    [cat],
  );
  useFrame((_, delta) => {
    if (
      !root.current ||
      !head.current ||
      !body.current ||
      !eyes.current ||
      !tail.current ||
      !jaw.current ||
      !ears.current ||
      !leftPaw.current ||
      !rightPaw.current
    )
      return;
    const s = machine.getSnapshot(),
      state = s.state,
      elapsed = (machine.clock - s.since) / 1000,
      t = machine.clock / 1000;
    const smooth = 1 - Math.exp(-Math.min(delta, 0.1) * 13),
      motion = reduced ? 0.18 : 1;
    if (fangs.current)
      fangs.current.visible = state === "pounce" || state === "bite";
    const asleep = state === "sleeping",
      affectionate = ["petting", "happy", "blink", "breathing"].includes(state);
    const hunt = state === "hunting",
      contact = ["pounce", "bite", "boop", "lick"].includes(state);
    const dig = state === "digging",
      note = state === "heart-note";
    const target = pointToWorld(machine.target, size.width, size.height);
    let rx = 0,
      ry = 0,
      rz = 0;
    if (contact && !reduced) {
      rx = target.x;
      ry = target.y - (cat ? 1.64 : state === "lick" ? 1.59 : 1.8);
      rz = 0.15;
    } else if (dig || note) {
      rx = dig ? 0.45 : -0.3;
      ry = 0;
    } else if (state === "leaving" && !reduced)
      rx = (cat ? -1 : 1) * Math.min(elapsed / 0.43, 1) * 4;
    else if (state === "entering" && !reduced)
      rx = (cat ? -1 : 1) * Math.max(0, 1 - elapsed / 0.65) * 3;
    const snap =
      state === "bite" || state === "boop" || state === "lick" ? 1 : smooth;
    root.current.position.x = THREE.MathUtils.lerp(
      root.current.position.x,
      rx,
      snap,
    );
    root.current.position.y = THREE.MathUtils.lerp(
      root.current.position.y,
      ry,
      snap,
    );
    root.current.position.z = THREE.MathUtils.lerp(
      root.current.position.z,
      rz,
      smooth,
    );
    const squash = hunt ? 0.81 : asleep ? 0.73 : state === "stretch" ? 0.78 : 1;
    body.current.scale.y = THREE.MathUtils.lerp(
      body.current.scale.y,
      squash + Math.sin(t * 1.7) * 0.012 * motion,
      smooth,
    );
    const breathing =
      state === "breathing"
        ? Math.sin((elapsed * Math.PI) / 4) * 0.035 * motion
        : 0;
    body.current.scale.x = 1 + breathing;
    head.current.position.y = THREE.MathUtils.lerp(
      head.current.position.y,
      hunt ? 1.76 : asleep ? 1.49 : dig ? 1.62 : 1.98,
      smooth,
    );
    if (contact) head.current.position.y = 1.98;
    head.current.rotation.z = THREE.MathUtils.lerp(
      head.current.rotation.z,
      contact
        ? 0
        : asleep
          ? -0.13
          : state === "curious"
            ? cat
              ? 0.1
              : 0.24
            : affectionate
              ? Math.sin(t * 1.3) * 0.075 * motion
              : dig
                ? Math.sin(t * 13) * 0.03 * motion
                : -machine.target.x * 0.065,
      smooth,
    );
    head.current.rotation.y = THREE.MathUtils.lerp(
      head.current.rotation.y,
      contact ? 0 : dig ? 0.18 : machine.target.x * 0.22 * motion,
      smooth,
    );
    head.current.rotation.x = THREE.MathUtils.lerp(
      head.current.rotation.x,
      contact
        ? 0
        : asleep
          ? 0.16
          : affectionate
            ? machine.zone === "chin"
              ? -0.25
              : -0.1
            : hunt
              ? 0.12
              : -machine.target.y * 0.09 * motion,
      smooth,
    );
    const blink = (t + s.variant * 7) % 5.8 < 0.15;
    eyes.current.scale.y = THREE.MathUtils.lerp(
      eyes.current.scale.y,
      asleep || affectionate || blink ? 0.08 : hunt ? 0.75 : 1,
      smooth,
    );
    eyes.current.position.x = contact ? 0 : machine.target.x * 0.035;
    tail.current.rotation.z = cat
      ? Math.sin(t * (state === "annoyed" ? 13 : 1.6)) *
        (state === "annoyed" ? 0.38 : 0.12) *
        motion
      : Math.sin(t * (affectionate || hunt ? 15 : 6)) * 0.32 * motion;
    tail.current.rotation.y = cat
      ? Math.sin(t * 1.1) * 0.12 * motion
      : Math.sin(t * (affectionate ? 15 : 6)) * 0.6 * motion;
    ears.current.rotation.z =
      cat && state === "curious"
        ? Math.sin(t * 7) * 0.055 * motion
        : !cat
          ? Math.sin(t * 3.5) * 0.025 * motion
          : 0;
    jaw.current.position.y = THREE.MathUtils.lerp(
      jaw.current.position.y,
      state === "bite"
        ? 0.04
        : state === "pounce"
          ? -0.14
          : !cat && !asleep
            ? -0.09 - Math.sin(t * 5) * 0.016 * motion
            : 0,
      smooth,
    );
    jaw.current.rotation.x =
      state === "bite" ? 0 : state === "pounce" ? 0.3 : 0;
    leftPaw.current.position.y = THREE.MathUtils.lerp(
      leftPaw.current.position.y,
      state === "paw"
        ? 0.53
        : contact
          ? 0.5
          : state === "groom" && cat
            ? 0.96
            : dig
              ? 0.16 + Math.max(0, Math.sin(t * 17)) * 0.3 * motion
              : 0,
      smooth,
    );
    rightPaw.current.position.y = THREE.MathUtils.lerp(
      rightPaw.current.position.y,
      contact
        ? 0.5
        : dig
          ? 0.16 + Math.max(0, Math.sin(t * 17 + Math.PI)) * 0.3 * motion
          : 0,
      smooth,
    );
    leftPaw.current.rotation.x =
      contact || state === "paw" ? -0.55 : state === "groom" ? -0.8 : 0;
    rightPaw.current.rotation.x = contact ? -0.55 : 0;
  });
  return (
    <group ref={root}>
      <group ref={body}>
        <group ref={tail} position={[0.43, 0.33, -0.32]}>
          <Curve points={tailPoints} radius={cat ? 0.105 : 0.16} color={fur} />
          {!cat &&
            [0, 1, 2, 3].map((i) => (
              <Pebble
                key={i}
                position={[0.38 + i * 0.13, 0.18 + i * 0.12, -0.13]}
                scale={[0.23, 0.12, 0.17]}
                rotation={[0, 0, 0.8]}
                color={highlight}
              />
            ))}
        </group>
        <Pebble
          position={[0, 0.91, 0]}
          scale={[cat ? 0.53 : 0.61, 0.81, 0.44]}
          color={fur}
        />
        <Pebble
          position={[-0.46, 0.32, 0.02]}
          scale={[0.31, 0.31, 0.4]}
          color={dark}
        />
        <Pebble
          position={[0.46, 0.32, 0.02]}
          scale={[0.31, 0.31, 0.4]}
          color={dark}
        />
        {!cat && (
          <Pebble
            position={[0, 1.05, 0.29]}
            scale={[0.39, 0.54, 0.23]}
            color="#e6be7e"
          />
        )}
        <group ref={leftPaw} position={[-0.28, 0, 0.24]}>
          <Pebble
            position={[0, 0.6, 0.1]}
            scale={[0.165, 0.55, 0.17]}
            color={highlight}
          />
          <Pebble
            position={[0, 0.16, 0.22]}
            scale={[0.22, 0.15, 0.3]}
            color={fur}
          />
          {[-1, 0, 1].map((i) => (
            <Pebble
              key={i}
              position={[i * 0.1, 0.17, 0.465]}
              scale={[0.045, 0.07, 0.025]}
              color={cat ? "#29323a" : "#bc8a4b"}
            />
          ))}
        </group>
        <group ref={rightPaw} position={[0.28, 0, 0.24]}>
          <Pebble
            position={[0, 0.6, 0.1]}
            scale={[0.165, 0.55, 0.17]}
            color={highlight}
          />
          <Pebble
            position={[0, 0.16, 0.22]}
            scale={[0.22, 0.15, 0.3]}
            color={fur}
          />
          {[-1, 0, 1].map((i) => (
            <Pebble
              key={i}
              position={[i * 0.1, 0.17, 0.465]}
              scale={[0.045, 0.07, 0.025]}
              color={cat ? "#29323a" : "#bc8a4b"}
            />
          ))}
        </group>
        {!cat && (
          <group position={[0, 1.37, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.78, 1]}>
              <torusGeometry args={[0.38, 0.045, 8, 40]} />
              <meshStandardMaterial color="#788578" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.087, 0.087, 0.025, 24]} />
              <meshStandardMaterial
                color="#d5b467"
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
          </group>
        )}
      </group>
      <group ref={head} position={[0, 1.98, 0.06]}>
        <Pebble scale={[cat ? 0.66 : 0.64, 0.57, 0.49]} color={fur} />
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
                position={[side * 0.59, 0.09, -0.02]}
                rotation={[0, side * -0.1, side * 0.19]}
              >
                <Pebble scale={[0.245, 0.53, 0.19]} color="#b17b3e" />
                <Pebble
                  position={[side * 0.03, -0.18, 0.1]}
                  scale={[0.18, 0.32, 0.095]}
                  color="#c68c49"
                />
              </group>
            ))
          )}
        </group>
        {!cat &&
          [-1, 1].map((side) => (
            <Pebble
              key={side}
              position={[side * 0.25, 0.29, 0.37]}
              scale={[0.14, 0.055, 0.045]}
              color="#eac88d"
              rotation={[0, 0, side * 0.1]}
            />
          ))}
        <Eyes pet={pet} group={eyes} />
        <Pebble
          position={[-0.17, -0.22, 0.43]}
          scale={[cat ? 0.245 : 0.29, 0.19, cat ? 0.18 : 0.25]}
          color={cat ? "#263039" : "#e9c68d"}
        />
        <Pebble
          position={[0.17, -0.22, 0.43]}
          scale={[cat ? 0.245 : 0.29, 0.19, cat ? 0.18 : 0.25]}
          color={cat ? "#263039" : "#e9c68d"}
        />
        <Pebble
          position={[0, -0.18, cat ? 0.61 : 0.69]}
          scale={[cat ? 0.094 : 0.143, cat ? 0.06 : 0.105, 0.055]}
          color={cat ? "#9e7d80" : "#302b26"}
          roughness={0.5}
        />
        <Pebble
          position={[0, -0.38, 0.43]}
          scale={[0.23, 0.095, 0.13]}
          color={cat ? "#0c1116" : "#4e352a"}
        />
        <group ref={jaw}>
          <Pebble
            position={[0, -0.39, 0.47]}
            scale={[cat ? 0.21 : 0.29, 0.09, 0.16]}
            color={cat ? highlight : "#dab780"}
          />
          {!cat && (
            <Pebble
              position={[0, -0.39, 0.61]}
              scale={[0.095, 0.15, 0.035]}
              color="#cf8b86"
              rotation={[-0.2, 0, 0]}
            />
          )}
          {cat && (
            <group ref={fangs} visible={false}>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[side * 0.105, -0.325, 0.635]}
                  rotation={[Math.PI, 0, 0]}
                >
                  <coneGeometry args={[0.025, 0.067, 10]} />
                  <meshStandardMaterial color="#e5dece" />
                </mesh>
              ))}
            </group>
          )}
        </group>
        {cat &&
          [-1, 1].map((side) => (
            <group key={side} scale={[side, 1, 1]}>
              {whiskers.map((points, i) => (
                <Curve key={i} points={points} radius={0.005} color="#76818b" />
              ))}
            </group>
          ))}
      </group>
    </group>
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
    // Three.js cameras are mutable objects owned by the renderer.
    if (camera instanceof THREE.OrthographicCamera) {
      // eslint-disable-next-line react-hooks/immutability -- Imperative camera projection update.
      camera.zoom = Math.min(size.width / 3.9, size.height / 3.6);
      camera.lookAt(0, 1.35, 0);
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
function Ground({ pet }: { pet: Companion }) {
  const cat = pet === "jew";
  return (
    <group>
      <mesh position={[0, 0.05, -0.5]} scale={[1.6, 0.18, 1]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color={cat ? "#354047" : "#d6c7a8"}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 0.05, -0.49]} scale={[1.54, 0.17, 1]}>
        <ringGeometry args={[0.96, 1, 64]} />
        <meshStandardMaterial
          color={cat ? "#556067" : "#a99b7f"}
          transparent
          opacity={0.5}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, 0.055, -0.48]} scale={[0.8, 0.115, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial
          color="#060d12"
          transparent
          opacity={cat ? 0.34 : 0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
export function FlatPet({
  pet,
  state = "idle",
}: {
  pet: Companion;
  state?: string;
}) {
  const cat = pet === "jew";
  return (
    <div className="flat-pet" data-fallback="true" data-state={state}>
      <svg
        viewBox="0 0 400 440"
        role="img"
        aria-label={cat ? "Jew the black cat" : "Bo the golden retriever"}
      >
        <defs>
          <radialGradient id="coat">
            <stop stopColor={cat ? "#46505b" : "#eed29a"} />
            <stop offset="1" stopColor={cat ? "#192128" : "#bd8648"} />
          </radialGradient>
        </defs>
        <ellipse
          cx="200"
          cy="394"
          rx="145"
          ry="26"
          fill={cat ? "#35434a" : "#cdb994"}
        />
        <path
          d="M267 352 Q355 388 350 292"
          fill="none"
          stroke={cat ? "#25303a" : "#c28e4c"}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <ellipse cx="200" cy="302" rx="73" ry="95" fill="url(#coat)" />
        {cat ? (
          <path
            d="M115 166 L119 62 L174 122 L224 122 L281 62 L285 166Z"
            fill="#29353f"
          />
        ) : (
          <>
            <ellipse cx="120" cy="190" rx="35" ry="76" fill="#b67f43" />
            <ellipse cx="280" cy="190" rx="35" ry="76" fill="#b67f43" />
          </>
        )}
        <ellipse cx="200" cy="189" rx="91" ry="83" fill="url(#coat)" />
        <ellipse
          cx="164"
          cy="185"
          rx={cat ? 23 : 13}
          ry="16"
          fill={cat ? "#d3dd9e" : "#31231b"}
        />
        <ellipse
          cx="236"
          cy="185"
          rx={cat ? 23 : 13}
          ry="16"
          fill={cat ? "#d3dd9e" : "#31231b"}
        />
        <ellipse cx="164" cy="185" rx="6" ry="14" fill="#17202a" />
        <ellipse cx="236" cy="185" rx="6" ry="14" fill="#17202a" />
        <circle cx="159" cy="180" r="4" fill="white" />
        <circle cx="231" cy="180" r="4" fill="white" />
        <ellipse
          cx="200"
          cy="230"
          rx="37"
          ry="25"
          fill={cat ? "#35414c" : "#f0d8ab"}
        />
        <path
          d="M189 220 Q200 214 211 220L200 232Z"
          fill={cat ? "#aa8587" : "#352b22"}
        />
        {!cat && (
          <path d="M189 248L189 269Q200 283 211 269L211 248" fill="#cf8b86" />
        )}
        <ellipse
          cx="163"
          cy="374"
          rx="27"
          ry="17"
          fill={cat ? "#303c47" : "#dbaf6e"}
        />
        <ellipse
          cx="237"
          cy="374"
          rx="27"
          ry="17"
          fill={cat ? "#303c47" : "#dbaf6e"}
        />
      </svg>
    </div>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode; pet: Companion; state: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <FlatPet pet={this.props.pet} state={this.props.state} />
    ) : (
      this.props.children
    );
  }
}
export default function CompanionScene({
  machine,
  snapshot,
  reduced,
  visible,
}: SceneProps) {
  const cat = snapshot.pet === "jew";
  return (
    <SceneBoundary pet={snapshot.pet} state={snapshot.state}>
      <Canvas
        orthographic
        camera={{ position: [0, 1.35, 8], zoom: 100, near: 0.1, far: 30 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
          stencil: false,
        }}
        fallback={<FlatPet pet={snapshot.pet} state={snapshot.state} />}
        aria-hidden="true"
      >
        <FrameDriver visible={visible} reduced={reduced} />
        <ambientLight intensity={cat ? 0.8 : 1.2} />
        <hemisphereLight
          args={[cat ? "#c0d8f2" : "#fff4d7", cat ? "#19272f" : "#c0a47a", 1.4]}
        />
        <directionalLight
          position={[-3, 5, 5]}
          intensity={cat ? 2.2 : 2.5}
          color={cat ? "#c7e1f6" : "#fff0cf"}
        />
        <directionalLight
          position={[3, 3, -2]}
          intensity={cat ? 4.5 : 2}
          color={cat ? "#9dbfda" : "#ffe0a1"}
        />
        <directionalLight
          position={[2, 1, 4]}
          intensity={0.6}
          color={cat ? "#afbbb9" : "#fff2db"}
        />
        <Ground pet={snapshot.pet} />
        <Pet
          key={snapshot.pet}
          machine={machine}
          pet={snapshot.pet}
          reduced={reduced}
        />
      </Canvas>
    </SceneBoundary>
  );
}
