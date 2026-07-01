import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAlbionStore } from '../store/useAlbionStore';

const COUNT = 1400;

function useDrops() {
  return useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = -25 + Math.random() * 20;
    }
    return positions;
  }, []);
}

export function Weather() {
  const weather = useAlbionStore((s) => s.weather);
  const timeOfDay = useAlbionStore((s) => s.timeOfDay);
  const { scene } = useThree();
  const positions = useDrops();
  const pointsRef = useRef<THREE.Points>(null);
  const stormFlashRef = useRef(0);

  const isRain = weather === 'rain' || weather === 'heavyRain' || weather === 'storm';
  const isSnow = weather === 'snow';
  const speed = weather === 'heavyRain' ? 22 : weather === 'storm' ? 26 : isSnow ? 1.4 : 9;

  useFrame((state, delta) => {
    // fog reaguje na počasí i denní dobu
    const isNight = timeOfDay === 'night' || timeOfDay === 'deepNight';
    const fogColor = new THREE.Color(isNight ? '#05070c' : '#3b4658');
    let fogDensity = 0.018;
    if (weather === 'fog') fogDensity = 0.055;
    if (weather === 'storm') fogDensity = 0.03;
    if (weather === 'heavyRain') fogDensity = 0.026;
    if (!scene.fog) scene.fog = new THREE.FogExp2(fogColor.getHex(), fogDensity);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.lerp(fogColor, 0.02);
    fog.density += (fogDensity - fog.density) * 0.02;

    if ((isRain || isSnow) && pointsRef.current) {
      const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] -= (isSnow ? speed * 0.4 : speed) * delta;
        if (isSnow) arr[i * 3] += Math.sin(state.clock.elapsedTime + i) * 0.002;
        if (arr[i * 3 + 1] < -2) arr[i * 3 + 1] = 16 + Math.random() * 4;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (weather === 'storm') {
      stormFlashRef.current -= delta;
      if (stormFlashRef.current <= 0) {
        stormFlashRef.current = 4 + Math.random() * 6;
      }
    }
  });

  if (!isRain && !isSnow) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={isSnow ? 0.05 : 0.02}
        color={isSnow ? '#ffffff' : '#9fc2e8'}
        transparent
        opacity={isSnow ? 0.85 : 0.55}
        sizeAttenuation
      />
    </points>
  );
}
