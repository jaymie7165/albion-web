export type TimeOfDay = 'sunrise' | 'day' | 'golden' | 'sunset' | 'night' | 'deepNight';
export type Weather = 'clear' | 'rain' | 'heavyRain' | 'fog' | 'storm' | 'snow';

export interface SessionInfo {
  icName: string;
  accessLevel: number;
  photo: string;
  permissions: string[];
}

export interface HotspotItem {
  label: string;
  href: string;
  need: string;
}

export interface HotspotDef {
  id: string;
  label: string;
  sub: string;
  position: [number, number, number];
  items: HotspotItem[];
}

export interface MoodPreset {
  id: string;
  label: string;
  timeOfDay: TimeOfDay;
  weather: Weather;
}
