import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAlbionStore } from '../store/useAlbionStore';
import type { TimeOfDay } from '../types';

const MOON_COLOR: Record<TimeOfDay, string> = {
  sunrise: '#ffcf9e',
  day: '#dfe9ff',
  golden: '#ffb066',
  sunset: '#ff8a4d',
  night: '#4d5b8c',
  deepNight: '#2a3358',
};

const MOON_INTENSITY: Record<TimeOfDay, number> = {
  sunrise: 0.9,
  day: 1.3,
  golden: 1.1,
  sunset: 0.8,
  night: 0.35,
  deepNight: 0.18,
};

const LAMP_INTENSITY: Record<TimeOfDay, number> = {
  sunrise: 0.5,
  day: 0.3,
  golden: 0.6,
  sunset: 0.75,
  night: 1.0,
  deepNight: 1.15,
};

export function Lighting() {
  const timeOfDay = useAlbionStore((s) => s.timeOfDay);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const lampRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const targetColor = new THREE.Color(MOON_COLOR[timeOfDay]);
    const targetMoonI = MOON_INTENSITY[timeOfDay];
    const targetLampI = LAMP_INTENSITY[timeOfDay];

    if (moonRef.current) {
      moonRef.current.color.lerp(targetColor, 0.03);
      moonRef.current.intensity += (targetMoonI - moonRef.current.intensity) * 0.03;
    }
    if (lampRef.current) {
      lampRef.current.intensity += (targetLampI - lampRef.current.intensity) * 0.03;
    }
    if (rimRef.current) {
      rimRef.current.intensity += (targetLampI * 0.5 - rimRef.current.intensity) * 0.03;
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} color="#1a2233" />
      {/* Měsíční / denní světlo skrze okno */}
      <directionalLight ref={moonRef} position={[6, 8, -10]} intensity={0.4} color="#4d5b8c" castShadow />
      {/* Teplá stolní lampa */}
      <pointLight ref={lampRef} position={[-2.6, 1.6, 1.4]} intensity={1} color="#e8a45c" distance={9} decay={2} />
      {/* Jemné doplňkové teplé světlo (krb / police) */}
      <pointLight ref={rimRef} position={[3.2, 1.2, 2.6]} intensity={0.5} color="#c97a3a" distance={7} decay={2} />
      {/* Studené podsvícení monitoru notebooku */}
      <pointLight position={[0, 1.15, 0.4]} intensity={0.25} color="#8fb4ff" distance={2.4} decay={2} />
    </>
  );
}
