import { useTexture } from '@react-three/drei';

interface Props {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
}

// Erb Albionu (existující /logo.png z Express public/) vyrytý na kovové/dřevěné destičce.
export function CrestPlaque({ position, rotation = [0, 0, 0], size = 0.5 }: Props) {
  const texture = useTexture('/logo.png');
  return (
    <group position={position} rotation={rotation}>
      {/* rám destičky */}
      <mesh>
        <boxGeometry args={[size * 1.25, size * 1.25, 0.04]} />
        <meshStandardMaterial color="#0c0c0c" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* erb */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          map={texture}
          transparent
          metalness={0.6}
          roughness={0.3}
          emissive="#3a2a12"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}
