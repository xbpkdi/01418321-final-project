"use client";

// ฉากกล่องพัสดุ 3D ลอยอยู่หลังหน้า Login (three.js ผ่าน @react-three/fiber)
// - ทั้งฉากเอียงตามเมาส์เล็กน้อย
// - ชี้ที่กล่องแล้วกล่องขยาย กดแล้วกล่องหมุน
// - ผู้ใช้ที่ตั้ง prefers-reduced-motion จะเห็นภาพนิ่ง
// โหลดผ่าน next/dynamic แบบ ssr: false เพราะ WebGL มีแค่ฝั่ง client

import { useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

type Vec3 = [number, number, number];

type ParcelSpec = {
  position: Vec3;
  size: Vec3;
  color: string;
  tape: string;
};

// สีตาม token ใน globals.css: cobalt, sky, amber, navy, กระดาษ
// วางให้เลี่ยงหัวข้อซ้ายมือ: ช่องว่างกลางจอ, ขอบขวา, ใต้หัวข้อ และ 1 ใบหลังการ์ดกระจก
const PARCELS: ParcelSpec[] = [
  { position: [0.4, 2.3, -1], size: [1, 0.7, 0.8], color: "#2448ff", tape: "#ffb020" },
  { position: [0.9, -2.1, 0.5], size: [0.9, 0.6, 0.7], color: "#ffffff", tape: "#2448ff" },
  { position: [4.9, -2.4, -0.5], size: [1.1, 0.8, 0.9], color: "#38bdf8", tape: "#ffffff" },
  { position: [5.6, 2.6, -2.5], size: [1.3, 0.9, 1], color: "#13235e", tape: "#38bdf8" },
  { position: [-3.6, -2.7, -1], size: [0.7, 0.7, 0.7], color: "#ffb020", tape: "#13235e" },
  { position: [2.4, 0.2, -3.5], size: [1.2, 0.9, 1], color: "#ffffff", tape: "#ffb020" },
  { position: [-6, -3.6, -3], size: [0.8, 0.6, 0.7], color: "#2448ff", tape: "#ffffff" },
];

const scaleTarget = new THREE.Vector3();

function Parcel({ spec, still }: { spec: ParcelSpec; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [w, h, d] = spec.size;

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g || still) return;
    spin.current *= 0.94;
    g.rotation.y += delta * (0.12 + spin.current);
    g.rotation.x += delta * spin.current * 0.3;
    const s = hovered ? 1.18 : 1;
    g.scale.lerp(scaleTarget.set(s, s, s), 0.12);
  });

  return (
    <Float
      speed={still ? 0 : 1.4}
      rotationIntensity={0.6}
      floatIntensity={1.1}
    >
      <group
        ref={ref}
        position={spec.position}
        rotation={[0.35, 0.6, 0.1]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          spin.current += 9;
        }}
      >
        <RoundedBox args={spec.size} radius={0.07} smoothness={4}>
          <meshStandardMaterial color={spec.color} roughness={0.5} />
        </RoundedBox>
        {/* เทปกาวคาดรอบกล่อง */}
        <mesh>
          <boxGeometry args={[w * 0.22, h + 0.012, d + 0.012]} />
          <meshStandardMaterial color={spec.tape} roughness={0.3} />
        </mesh>
      </group>
    </Float>
  );
}

function Rig({ children, still }: { children: React.ReactNode; still: boolean }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g || still) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, state.pointer.x * 0.22, 0.04);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -state.pointer.y * 0.14, 0.04);
  });

  return <group ref={ref}>{children}</group>;
}

export function ParcelScene({
  eventSource,
  still,
}: {
  /** element ที่รับเมาส์แทน canvas เพราะ canvas อยู่ใต้เนื้อหาอื่น */
  eventSource: RefObject<HTMLElement | null>;
  still: boolean;
}) {
  return (
    <Canvas
      aria-hidden
      className="pointer-events-none"
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      frameloop={still ? "demand" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#dfe8ff", "#13235e", 0.6]} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} />
      <directionalLight position={[-6, -2, 2]} intensity={0.4} color="#38bdf8" />
      <Rig still={still}>
        {PARCELS.map((spec, i) => (
          <Parcel key={i} spec={spec} still={still} />
        ))}
      </Rig>
    </Canvas>
  );
}
