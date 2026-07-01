import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';

interface Props {
  photo: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}

function Portrait({ photo }: { photo: string }) {
  const texture = useTexture(photo);
  return (
    <mesh position={[0, 0, 0.021]}>
      <planeGeometry args={[0.34, 0.44]} />
      <meshStandardMaterial map={texture} roughness={0.6} />
    </mesh>
  );
}

// Rám na stole — fotografie se automaticky synchronizuje s profilem uživatele
// (card_photo / avatar_url ze stávající DB, viz api/albionApi.ts).
export function PortraitFrame({ photo, position, rotation = [0, 0, 0] }: Props) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.4, 0.5, 0.03]} />
        <meshStandardMaterial color="#1c140c" metalness={0.5} roughness={0.4} />
      </mesh>
      <Suspense fallback={null}>
        <Portrait key={photo} photo={photo} />
      </Suspense>
    </group>
  );
}
