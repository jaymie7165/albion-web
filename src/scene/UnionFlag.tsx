import { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function drawUnionJack(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14213a';
  ctx.fillRect(0, 0, 300, 180);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 22;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, 180); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(0, 180); ctx.stroke();
  ctx.strokeStyle = '#a3304a';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, 180); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(300, 0); ctx.lineTo(0, 180); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(120, 0, 60, 180);
  ctx.fillRect(0, 66, 300, 48);
  ctx.fillStyle = '#a3304a';
  ctx.fillRect(134, 0, 32, 180);
  ctx.fillRect(0, 76, 300, 28);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function UnionFlag({ position, rotation = [0, 0, 0], scale = 1 }: Props) {
  const texture = useMemo(() => drawUnionJack(), []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* žerď */}
      <mesh position={[-0.32, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 8]} />
        <meshStandardMaterial color="#2b2118" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <planeGeometry args={[0.62, 0.4]} />
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
    </group>
  );
}
