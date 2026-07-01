import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Room } from './Room';
import { Lighting } from './Lighting';
import { CityBackdrop } from './CityBackdrop';
import { Weather } from './Weather';
import { Hotspot } from './Hotspot';
import { CameraRig } from './CameraRig';
import { HOTSPOT_DEFS } from './hotspotDefs';
import { useAlbionStore } from '../store/useAlbionStore';

interface Props {
  photo: string;
  permissions: string[];
}

export function AlbionScene({ photo, permissions }: Props) {
  const focus = useAlbionStore((s) => s.focus);
  const hoveredHotspot = useAlbionStore((s) => s.hoveredHotspot);

  const visibleHotspots = HOTSPOT_DEFS.map((h) => ({
    ...h,
    items: h.items.filter((it) => permissions.includes(it.need)),
  })).filter((h) => h.items.length);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#03040a']} />
      <CameraRig />
      <Lighting />
      <CityBackdrop />
      <Weather />
      <Room photo={photo} />

      {visibleHotspots.map((h) => (
        <Hotspot key={h.id} def={h} dimmed={!!focus && focus.hotspotId !== h.id} />
      ))}

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </Canvas>
  );
}
