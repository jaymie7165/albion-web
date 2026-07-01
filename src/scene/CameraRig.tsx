import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { useAlbionStore } from '../store/useAlbionStore';
import { HOTSPOT_DEFS } from './hotspotDefs';

const DEFAULT_POS = new THREE.Vector3(0, 1.55, 3.4);
const DEFAULT_LOOK = new THREE.Vector3(0, 1.05, -0.4);
const INTRO_START = new THREE.Vector3(0, 5.2, 9.5);

export function CameraRig() {
  const { camera } = useThree();
  const focus = useAlbionStore((s) => s.focus);
  const introDone = useAlbionStore((s) => s.introDone);
  const setIntroDone = useAlbionStore((s) => s.setIntroDone);
  const lookTarget = useRef(new THREE.Vector3().copy(DEFAULT_LOOK));

  // INTRO — filmový fly-in při vstupu do světa
  useEffect(() => {
    if (introDone) return;
    camera.position.copy(INTRO_START);
    const proxy = { t: 0 };
    const tl = gsap.timeline({
      onComplete: () => setIntroDone(true),
    });
    tl.to(camera.position, {
      x: DEFAULT_POS.x,
      y: DEFAULT_POS.y,
      z: DEFAULT_POS.z,
      duration: 3.2,
      ease: 'power3.inOut',
    });
    tl.to(
      proxy,
      {
        t: 1,
        duration: 3.2,
        ease: 'power3.inOut',
        onUpdate: () => {
          lookTarget.current.lerpVectors(new THREE.Vector3(0, 2.2, -2), DEFAULT_LOOK, proxy.t);
        },
      },
      0
    );
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FOCUS MODE — kamera se přiblíží k aktivnímu hotspotu
  useEffect(() => {
    if (!introDone) return;
    if (focus) {
      const def = HOTSPOT_DEFS.find((h) => h.id === focus.hotspotId);
      if (!def) return;
      const [x, y, z] = def.position;
      const dir = new THREE.Vector3(x, y, z).sub(DEFAULT_LOOK).normalize();
      const focusPos = new THREE.Vector3(x, y + 0.15, z).add(dir.multiplyScalar(0.9));

      gsap.to(camera.position, { x: focusPos.x, y: focusPos.y, z: focusPos.z, duration: 1.3, ease: 'power2.inOut' });
      gsap.to(lookTarget.current, { x, y, z, duration: 1.3, ease: 'power2.inOut' });
    } else {
      gsap.to(camera.position, { x: DEFAULT_POS.x, y: DEFAULT_POS.y, z: DEFAULT_POS.z, duration: 1.1, ease: 'power2.inOut' });
      gsap.to(lookTarget.current, { x: DEFAULT_LOOK.x, y: DEFAULT_LOOK.y, z: DEFAULT_LOOK.z, duration: 1.1, ease: 'power2.inOut' });
    }
  }, [focus, introDone, camera]);

  useEffectFrameLookAt(camera, lookTarget);

  return null;
}

// pomocná smyčka udržující lookAt aktuální i během tweenů pozice
function useEffectFrameLookAt(camera: THREE.Camera, target: React.MutableRefObject<THREE.Vector3>) {
  const { invalidate } = useThree();
  useEffect(() => {
    let raf: number;
    const loop = () => {
      camera.lookAt(target.current);
      invalidate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
