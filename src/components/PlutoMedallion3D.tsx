import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { PlutoMark } from "./PlutoLogo";

class ThreeErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return this.props.fallback ?? null;
    return this.props.children;
  }
}

const RADIUS = 1;
const THICKNESS = 0.26;
const FACETS = 10;

/** The medallion body — a low-poly (flat-faceted) coin, same "gem in three
 *  dimensions" trick as Kairos' kite: few enough facets that the geometry
 *  itself reads as cut, not modeled. */
function useCoinGeometry(radius: number, thickness: number) {
  return useMemo(() => {
    const geometry = new THREE.CylinderGeometry(radius, radius, thickness, FACETS, 1, false);
    geometry.computeVertexNormals();
    return geometry;
  }, [radius, thickness]);
}

function Medallion() {
  const outer = useCoinGeometry(RADIUS, THICKNESS);
  const inner = useCoinGeometry(RADIUS * 0.55, THICKNESS * 1.4);
  const spin = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * 0.28;
  });

  return (
    <group position={[0, 0, 0]} rotation={[0.32, 0, 0.08]}>
      <Float speed={0.9} rotationIntensity={0} floatIntensity={0.28}>
        <group ref={spin}>
          {/* Vault glass — the coin's body, deep green, faceted */}
          <mesh geometry={outer} castShadow>
            <meshPhysicalMaterial
              color="#1F4A36"
              transmission={0.82}
              thickness={0.7}
              roughness={0.08}
              ior={1.5}
              clearcoat={1}
              clearcoatRoughness={0.06}
              attenuationColor="#0E2218"
              attenuationDistance={2}
              flatShading
              transparent
              opacity={0.78}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Inner core — the coin face, glowing gold */}
          <mesh geometry={inner}>
            <meshStandardMaterial color="#E6C06C" emissive="#C49A3A" emissiveIntensity={0.75} roughness={0.35} metalness={0.4} flatShading />
          </mesh>
          {/* Rim ring, gold metal — the mint edge */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[RADIUS + 0.03, 0.05, 14, FACETS * 2]} />
            <meshStandardMaterial color="#C49A3A" metalness={0.92} roughness={0.18} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

interface Props { className?: string; compact?: boolean; quiet?: boolean; }

export default function PlutoMedallion3D({ className, compact = false, quiet = false }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  const fallback = (
    <div className="grid h-full w-full place-items-center">
      <PlutoMark className="h-32 w-32 text-secondary-soft" />
    </div>
  );

  return (
    <div className={`${className ?? ""} relative h-full w-full`}>
      {!ready && !quiet && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-vault/70 backdrop-blur-sm transition-opacity duration-300">
          <div className="flex flex-col items-center gap-3 text-primary-foreground/85">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-secondary-soft">Loading Pluto</span>
          </div>
        </div>
      )}
      <ThreeErrorBoundary fallback={fallback}>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.15, 5.6], fov: 30 }}
          gl={{ antialias: true, alpha: true }}
          onCreated={() => setReady(true)}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
            <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#E6C06C" />
            <pointLight position={[0, 0.4, 2.5]} intensity={0.3} color="#F0DDA0" />
            <Medallion />
            {!compact && (
              <ContactShadows position={[0, -1.4, 0]} opacity={0.26} scale={5} blur={2.2} far={2} />
            )}
            <Environment preset="studio" />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
