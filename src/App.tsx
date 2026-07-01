import { useEffect, useRef } from 'react';
import { AlbionScene } from './scene/AlbionScene';
import { HUD } from './ui/HUD';
import { FocusPanel } from './ui/FocusPanel';
import { LoadingScreen } from './ui/LoadingScreen';
import { useAlbionStore } from './store/useAlbionStore';
import { fetchSession } from './api/albionApi';
import { ambientEngine } from './audio/AmbientEngine';

export default function App() {
  const ready = useAlbionStore((s) => s.ready);
  const session = useAlbionStore((s) => s.session);
  const setSession = useAlbionStore((s) => s.setSession);
  const timeOfDay = useAlbionStore((s) => s.timeOfDay);
  const weather = useAlbionStore((s) => s.weather);
  const soundOn = useAlbionStore((s) => s.soundOn);
  const applyRealityTime = useAlbionStore((s) => s.applyRealityTime);
  const audioStarted = useRef(false);

  useEffect(() => {
    applyRealityTime();
    fetchSession()
      .then(setSession)
      .catch(() => {
        // fail-open s minimální session, ať scéna nezůstane věčně na loadingu
        setSession({ icName: 'Člen', accessLevel: 3, photo: '/logo.png', permissions: ['home'] });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ambientEngine.applyMood(weather, timeOfDay);
  }, [weather, timeOfDay]);

  useEffect(() => {
    if (soundOn) ambientEngine.unmute();
    else ambientEngine.mute();
  }, [soundOn]);

  useEffect(() => {
    const startAudio = () => {
      if (audioStarted.current) return;
      audioStarted.current = true;
      ambientEngine.start();
      ambientEngine.resume();
      ambientEngine.applyMood(weather, timeOfDay);
    };
    window.addEventListener('pointerdown', startAudio, { once: true });
    return () => window.removeEventListener('pointerdown', startAudio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !session) return <LoadingScreen />;

  return (
    <div className="a3d-app">
      <div className="a3d-canvas-wrap">
        <AlbionScene photo={session.photo} permissions={session.permissions} />
      </div>
      <HUD />
      <FocusPanel />
    </div>
  );
}
