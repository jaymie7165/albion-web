import { create } from 'zustand';
import type { HotspotItem, MoodPreset, SessionInfo, TimeOfDay, Weather } from '../types';

export const MOOD_PRESETS: MoodPreset[] = [
  { id: 'rain-night', label: 'Rain Night', timeOfDay: 'night', weather: 'rain' },
  { id: 'fog-night', label: 'Fog Night', timeOfDay: 'deepNight', weather: 'fog' },
  { id: 'golden-hour', label: 'Golden Hour', timeOfDay: 'golden', weather: 'clear' },
  { id: 'quiet-morning', label: 'Quiet Morning', timeOfDay: 'sunrise', weather: 'clear' },
  { id: 'storm-session', label: 'Storm Session', timeOfDay: 'night', weather: 'storm' },
  { id: 'late-office', label: 'Late Office', timeOfDay: 'deepNight', weather: 'clear' },
];

interface FocusState {
  hotspotId: string;
  title: string;
  items: HotspotItem[];
}

type Mode = 'reality' | 'mood';

interface AlbionStore {
  ready: boolean;
  session: SessionInfo | null;
  setSession: (s: SessionInfo) => void;

  mode: Mode;
  setMode: (m: Mode) => void;

  timeOfDay: TimeOfDay;
  weather: Weather;
  activePreset: string | null;
  setTimeOfDay: (t: TimeOfDay) => void;
  setWeather: (w: Weather) => void;
  applyPreset: (id: string) => void;
  applyRealityTime: () => void;

  hoveredHotspot: string | null;
  setHovered: (id: string | null) => void;

  focus: FocusState | null;
  openFocus: (f: FocusState) => void;
  closeFocus: () => void;

  introDone: boolean;
  setIntroDone: (v: boolean) => void;

  soundOn: boolean;
  toggleSound: () => void;
}

function timeOfDayFromHour(h: number): TimeOfDay {
  if (h >= 5 && h < 8) return 'sunrise';
  if (h >= 8 && h < 16) return 'day';
  if (h >= 16 && h < 18) return 'golden';
  if (h >= 18 && h < 20) return 'sunset';
  if (h >= 20 && h < 23) return 'night';
  return 'deepNight';
}

export const useAlbionStore = create<AlbionStore>((set, get) => ({
  ready: false,
  session: null,
  setSession: (s) => set({ session: s, ready: true }),

  mode: 'reality',
  setMode: (m) => {
    set({ mode: m, activePreset: null });
    if (m === 'reality') get().applyRealityTime();
  },

  timeOfDay: 'night',
  weather: 'clear',
  activePreset: null,
  setTimeOfDay: (t) => set({ timeOfDay: t, mode: 'mood', activePreset: null }),
  setWeather: (w) => set({ weather: w, mode: 'mood', activePreset: null }),
  applyPreset: (id) => {
    const p = MOOD_PRESETS.find((x) => x.id === id);
    if (!p) return;
    set({ timeOfDay: p.timeOfDay, weather: p.weather, mode: 'mood', activePreset: id });
  },
  applyRealityTime: () => {
    const h = new Date().getHours();
    set({ timeOfDay: timeOfDayFromHour(h), weather: 'clear' });
  },

  hoveredHotspot: null,
  setHovered: (id) => set({ hoveredHotspot: id }),

  focus: null,
  openFocus: (f) => set({ focus: f, hoveredHotspot: null }),
  closeFocus: () => set({ focus: null }),

  introDone: false,
  setIntroDone: (v) => set({ introDone: v }),

  soundOn: true,
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
}));
