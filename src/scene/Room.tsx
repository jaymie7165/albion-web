import { CrestPlaque } from './CrestPlaque';
import { UnionFlag } from './UnionFlag';
import { PortraitFrame } from './PortraitFrame';

const WOOD = '#241811';
const WOOD_DESK = '#1c130c';
const LEATHER = '#0d0a08';
const METAL = '#2a2a2e';

interface Props {
  photo: string;
}

export function Room({ photo }: Props) {
  return (
    <group>
      {/* PODLAHA */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0c0906" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* ZADNÍ STĚNA S OKNEM */}
      <mesh position={[0, 2.5, -3.05]}>
        <boxGeometry args={[8, 5, 0.1]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.9} />
      </mesh>
      {/* skleněná tabule okna */}
      <mesh position={[0, 2.3, -3]}>
        <planeGeometry args={[6.4, 3.6]} />
        <meshPhysicalMaterial
          color="#0e1420"
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0}
          transmission={0.6}
          reflectivity={0.6}
        />
      </mesh>
      {/* rám okna - mřížka */}
      {[-2.1, -0.7, 0.7, 2.1].map((x) => (
        <mesh key={x} position={[x, 2.3, -2.98]}>
          <boxGeometry args={[0.04, 3.6, 0.04]} />
          <meshStandardMaterial color="#050505" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* BOČNÍ STĚNY */}
      <mesh position={[-4, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#0e0b08" roughness={0.95} />
      </mesh>
      <mesh position={[4, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#0e0b08" roughness={0.95} />
      </mesh>

      {/* KNIHOVNA vpravo */}
      <group position={[3.6, 2.2, 1]}>
        {[0, 0.5, 1, 1.5].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.55, 0.06, 0.9]} />
            <meshStandardMaterial color={WOOD} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* rostlina vlevo */}
      <mesh position={[-3.5, 0.5, 2]}>
        <cylinderGeometry args={[0.22, 0.28, 0.4, 10]} />
        <meshStandardMaterial color="#1a1310" roughness={0.8} />
      </mesh>

      {/* SEDAČKA (kůže) vlevo */}
      <group position={[-3.1, 0.32, 0.4]} rotation={[0, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[1.7, 0.4, 0.7]} />
          <meshStandardMaterial color={LEATHER} roughness={0.4} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.35, -0.32]}>
          <boxGeometry args={[1.7, 0.7, 0.12]} />
          <meshStandardMaterial color={LEATHER} roughness={0.4} metalness={0.15} />
        </mesh>
      </group>

      {/* PRACOVNÍ STŮL */}
      <mesh position={[0, 0.72, 0.5]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.06, 1.3]} />
        <meshStandardMaterial color={WOOD_DESK} roughness={0.35} metalness={0.15} />
      </mesh>
      {[[-1.2, -1.15, 0.9], [1.2, -1.15, 0.9], [-1.2, 1.15, 0.9], [1.2, 1.15, 0.9]].map((_, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -1.2 : 1.2, 0.36, i < 2 ? 0 : 1]} />
      ))}
      <mesh position={[-1.2, 0.36, 0]}>
        <boxGeometry args={[0.06, 0.72, 0.06]} />
        <meshStandardMaterial color={WOOD_DESK} roughness={0.4} />
      </mesh>
      <mesh position={[1.2, 0.36, 0]}>
        <boxGeometry args={[0.06, 0.72, 0.06]} />
        <meshStandardMaterial color={WOOD_DESK} roughness={0.4} />
      </mesh>

      {/* KŘESLO */}
      <group position={[0, 0.4, 1.35]}>
        <mesh>
          <boxGeometry args={[0.7, 0.1, 0.6]} />
          <meshStandardMaterial color={LEATHER} roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.4, 0.28]}>
          <boxGeometry args={[0.7, 0.8, 0.1]} />
          <meshStandardMaterial color={LEATHER} roughness={0.35} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={METAL} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* NOTEBOOK */}
      <group position={[0, 0.75, 0.35]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.02, 0.24]} />
          <meshStandardMaterial color="#3a3d42" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.13, -0.11]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.34, 0.22, 0.01]} />
          <meshStandardMaterial color="#3a3d42" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.155, -0.095]} rotation={[-0.35, 0, 0]}>
          <planeGeometry args={[0.3, 0.18]} />
          <meshStandardMaterial color="#0a0d16" emissive="#3f6fb0" emissiveIntensity={0.35} />
        </mesh>
      </group>

      {/* TABLET */}
      <mesh position={[-0.85, 0.755, 0.55]} rotation={[-0.15, 0.1, 0]}>
        <boxGeometry args={[0.22, 0.015, 0.3]} />
        <meshStandardMaterial color="#101214" emissive="#2a3a55" emissiveIntensity={0.3} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* KLÍČE */}
      <group position={[0.95, 0.755, 0.55]} rotation={[0, 0.4, 0]}>
        <mesh>
          <torusGeometry args={[0.035, 0.008, 8, 16]} />
          <meshStandardMaterial color="#c9a256" metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0.05, -0.03, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.09, 0.02, 0.005]} />
          <meshStandardMaterial color="#c9a256" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>

      {/* GROW BOX (weed sázení) */}
      <mesh position={[1.15, 0.78, -0.35]}>
        <boxGeometry args={[0.32, 0.1, 0.22]} />
        <meshStandardMaterial color="#182a12" roughness={0.6} />
      </mesh>

      {/* NOTES + PERO */}
      <mesh position={[-1.15, 0.755, 0.85]} rotation={[-Math.PI / 2, 0, 0.05]}>
        <planeGeometry args={[0.24, 0.3]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.9} />
      </mesh>

      {/* ERB — vyrytý na koženém panelu vlevo od okna */}
      <CrestPlaque position={[-2.35, 1.5, -1.4]} rotation={[0, 0.5, 0]} size={0.55} />
      {/* skleněný panel — Hierarchie / Kodex */}
      <mesh position={[-1.55, 1.5, -1.7]} rotation={[0, 0.5, 0]}>
        <planeGeometry args={[0.5, 0.65]} />
        <meshPhysicalMaterial color="#0e1420" transparent opacity={0.4} roughness={0.05} transmission={0.5} />
      </mesh>

      {/* digitální nástěnka */}
      <mesh position={[-1.75, 1.65, 0.9]} rotation={[0, 0.55, 0]}>
        <planeGeometry args={[0.5, 0.6]} />
        <meshStandardMaterial color="#0a0d10" emissive="#233042" emissiveIntensity={0.5} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* britská vlajka — decentní, na polici */}
      <UnionFlag position={[3.3, 2.1, -1.6]} rotation={[0, -0.7, 0]} scale={0.9} />

      {/* portrét na stole — automaticky fotka uživatele */}
      <PortraitFrame photo={photo} position={[1.7, 0.95, -1.15]} rotation={[0, -0.5, 0]} />
    </group>
  );
}
