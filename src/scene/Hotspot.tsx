import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { HotspotDef } from '../types';
import { useAlbionStore } from '../store/useAlbionStore';

interface Props {
  def: HotspotDef;
  dimmed: boolean;
}

export function Hotspot({ def, dimmed }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const openFocus = useAlbionStore((s) => s.openFocus);
  const setHoveredGlobal = useAlbionStore((s) => s.setHovered);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = hovered ? 1.9 : 1 + Math.sin(t * 2 + def.position[0]) * 0.18;
    meshRef.current.scale.setScalar(pulse * (dimmed ? 0.4 : 1));
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = dimmed ? 0.08 : hovered ? 1 : 0.65;
  });

  if (!def.items.length) return null;

  return (
    <group position={def.position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredGlobal(def.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          setHoveredGlobal(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (dimmed) return;
          openFocus({ hotspotId: def.id, title: def.label, items: def.items });
        }}
      >
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshBasicMaterial color="#e0bd7f" transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <pointLight color="#e0bd7f" intensity={hovered ? 0.6 : 0.15} distance={0.6} decay={2} />

      {hovered && !dimmed && (
        <Html center distanceFactor={4} style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
          <div className="a3d-tooltip">
            <div className="a3d-tooltip-title">{def.label}</div>
            <div className="a3d-tooltip-sub">{def.sub}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
