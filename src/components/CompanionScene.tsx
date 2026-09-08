"use client";
import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AnimalRig } from "@/companions/animalRig";
import type { Companion } from "@/interactions/companionStateMachine";
import { RoomRuntime, type HitCircle } from "@/interactions/roomRuntime";
import {
  CAMERA_TARGET_Y,
  roomZoom,
  roomBounds,
  groundToScreen,
} from "@/interactions/roomCoordinates";

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
function Pet({
  runtime,
  pet,
  reduced,
}: {
  runtime: RoomRuntime;
  pet: Companion;
  reduced: boolean;
}) {
  const rig = useMemo(() => new AnimalRig(pet), [pet]);
  const shadow = useRef<THREE.Mesh>(null);
  const { size, camera } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  const texture = useMemo(() => {
    const data = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const r = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5),
          i = (y * 64 + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 24;
        data[i + 3] = Math.round(
          Math.max(0, Math.exp(-r * r * 5) - Math.exp(-5)) * 110,
        );
      }
    const result = new THREE.DataTexture(data, 64, 64);
    result.needsUpdate = true;
    result.magFilter = THREE.LinearFilter;
    result.minFilter = THREE.LinearFilter;
    return result;
  }, []);
  useEffect(
    () => () => {
      rig.dispose();
    },
    [rig],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((frame, delta) => {
    if (size.width <= 0 || size.height <= 0) return;
    const entry = runtime.pets[pet],
      motion = entry.motion,
      machine = entry.machine,
      state = machine.getSnapshot().state;
    const dragging = entry.anchor?.dataset.dragging === "true";
    motion.step(
      delta,
      roomBounds(size.width, size.height),
      { x: 99, z: 99 },
      roamingStates.has(state) && !runtime.paused && !dragging,
      reduced,
    );
    rig.moveTo(motion.x, motion.z, dragging ? 0 : motion.heading, delta);
    rig.update({
      state,
      delta,
      time: machine.clock / 1000,
      stride: motion.stride,
      stand: motion.stand,
      walking: motion.walking,
      dragging,
      reduced,
      target: machine.target,
    });
    if (shadow.current) {
      shadow.current.position.set(
        rig.root.position.x,
        0.008,
        rig.root.position.z,
      );
      shadow.current.rotation.z = -rig.root.rotation.y;
      shadow.current.scale.set(pet === "jew" ? 1.25 : 1.55, 2.7, 1);
      const material = shadow.current.material as THREE.MeshBasicMaterial;
      material.opacity = dragging ? 0.55 : 1;
    }
    const zoom = roomZoom(size.width, size.height);
    const project = (
      object: THREE.Object3D,
      radius: number,
      zone: HitCircle["zone"],
    ): HitCircle => {
      object.getWorldPosition(point);
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
      project(rig.byName.head, pet === "jew" ? 0.43 : 0.5, "head"),
    ];
    for (const leg of rig.legs) hits.push(project(leg.paw, 0.22, "paw"));
    hits.push(
      project(rig.byName.neck, 0.28, "chin"),
      project(rig.byName.chest, 0.44, "body"),
      project(rig.byName.spine, 0.47, "body"),
      project(rig.byName.pelvis, 0.4, "body"),
      project(rig.byName.tail2, 0.2, "tail"),
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
      <primitive object={rig.root} />
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
        <ambientLight intensity={0.3} />
        <hemisphereLight
          args={[dark ? "#ebeced" : "#fff4dc", "#8b8172", 1.45]}
        />
        <directionalLight
          position={[-3, 7, 6]}
          intensity={1.8}
          color={dark ? "#f3f1e8" : "#fff2d9"}
        />
        <directionalLight
          position={[4, 4, -3]}
          intensity={dark ? 2.7 : 2.1}
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
