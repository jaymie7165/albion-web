import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAlbionStore } from '../store/useAlbionStore';

const BUILDING_COUNT = 90;

function useBuildings() {
  return useMemo(() => {
    const items: { pos: [number, number, number]; size: [number, number, number]; blink: number }[] = [];
    for (let i = 0; i < BUILDING_COUNT; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = -18 - Math.random() * 30;
      const h = 2 + Math.random() * 14;
      const w = 0.8 + Math.random() * 1.6;
      items.push({ pos: [x, h / 2, z], size: [w, h, w], blink: Math.random() });
    }
    return items;
  }, []);
}

export function CityBackdrop() {
  const buildings = useBuildings();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windowRef = useRef<THREE.InstancedMesh>(null);
  const timeOfDay = useAlbionStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'night' || timeOfDay === 'deepNight';

  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((b, i) => {
      dummy.position.set(...b.pos);
      dummy.scale.set(...b.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [buildings]);

  useFrame(({ clock }) => {
    if (!windowRef.current) return;
    const t = clock.getElapsedTime();
    const dummy = new THREE.Object3D();
    buildings.forEach((b, i) => {
      const flicker = isNight ? (Math.sin(t * 2 + b.blink * 50) > 0.85 ? 1 : 0.55) : 0.15;
      dummy.position.set(b.pos[0], b.pos[1], b.pos[2] + b.size[2] / 2 + 0.01);
      dummy.scale.set(b.size[0] * 0.85 * flicker, b.size[1] * 0.9, 0.02);
      dummy.updateMatrix();
      windowRef.current!.setMatrixAt(i, dummy.matrix);
    });
    windowRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, BUILDING_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#050810" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={windowRef} args={[undefined, undefined, BUILDING_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={isNight ? '#f2c98a' : '#9fd0ff'}
          emissive={isNight ? '#f2c98a' : '#9fd0ff'}
          emissiveIntensity={isNight ? 1.4 : 0.3}
          toneMapped={false}
        />
      </instancedMesh>
      {/* vzdálená hlavní věž — akcent skyline */}
      <mesh position={[10, 9, -30]}>
        <coneGeometry args={[0.5, 3, 4]} />
        <meshStandardMaterial color="#0a0d16" emissive="#f2c98a" emissiveIntensity={isNight ? 0.8 : 0.1} />
      </mesh>
    </group>
  );
}
