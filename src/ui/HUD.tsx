import { useState } from 'react';
import { MOOD_PRESETS, useAlbionStore } from '../store/useAlbionStore';
import type { TimeOfDay, Weather } from '../types';

const TIME_LABELS: Record<TimeOfDay, string> = {
  sunrise: 'Sunrise',
  day: 'Day',
  golden: 'Golden Hour',
  sunset: 'Sunset',
  night: 'Night',
  deepNight: 'Deep Night',
};

const WEATHER_LABELS: Record<Weather, string> = {
  clear: 'Clear',
  rain: 'Rain',
  heavyRain: 'Heavy Rain',
  fog: 'Fog',
  storm: 'Storm',
  snow: 'Snow',
};

export function HUD() {
  const [panelOpen, setPanelOpen] = useState(false);
  const icName = useAlbionStore((s) => s.session?.icName);
  const mode = useAlbionStore((s) => s.mode);
  const setMode = useAlbionStore((s) => s.setMode);
  const timeOfDay = useAlbionStore((s) => s.timeOfDay);
  const weather = useAlbionStore((s) => s.weather);
  const setTimeOfDay = useAlbionStore((s) => s.setTimeOfDay);
  const setWeather = useAlbionStore((s) => s.setWeather);
  const applyPreset = useAlbionStore((s) => s.applyPreset);
  const activePreset = useAlbionStore((s) => s.activePreset);
  const soundOn = useAlbionStore((s) => s.soundOn);
  const toggleSound = useAlbionStore((s) => s.toggleSound);

  return (
    <div className="a3d-hud">
      <div className="a3d-hud-top">
        <div className="a3d-wordmark">ALBION</div>
        <div className="a3d-top-right">
          {icName && <span className="a3d-user">{icName}</span>}
          <button className="a3d-icon-btn" onClick={toggleSound} title="Zvuk">
            {soundOn ? '♪' : '×'}
          </button>
          <button className="a3d-icon-btn" onClick={() => setPanelOpen((v) => !v)} title="Atmosféra">
            ☾
          </button>
          <a className="a3d-exit" href="/home" title="Opustit Albion">
            Opustit svět
          </a>
        </div>
      </div>

      {panelOpen && (
        <div className="a3d-mood-panel">
          <div className="a3d-mood-row">
            <button className={mode === 'reality' ? 'a3d-chip active' : 'a3d-chip'} onClick={() => setMode('reality')}>
              Reality
            </button>
            <button className={mode === 'mood' ? 'a3d-chip active' : 'a3d-chip'} onClick={() => setMode('mood')}>
              Mood
            </button>
          </div>

          <div className="a3d-mood-presets">
            {MOOD_PRESETS.map((p) => (
              <button
                key={p.id}
                className={activePreset === p.id ? 'a3d-preset active' : 'a3d-preset'}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {mode === 'mood' && (
            <div className="a3d-mood-row">
              <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}>
                {Object.entries(TIME_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)}>
                {Object.entries(WEATHER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
