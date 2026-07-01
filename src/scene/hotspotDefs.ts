import type { HotspotDef } from '../types';

// Pozice odpovídají objektům v Room.tsx (notebook, klíče, terminál, grow panel,
// skleněný panel, digitální nástěnka, osobní rám). Nic navíc.
export const HOTSPOT_DEFS: HotspotDef[] = [
  {
    id: 'notebook',
    label: 'Notebook',
    sub: 'Dashboard · Profit Centrum · Statistiky · BlackBook',
    position: [0, 1.18, 0.35],
    items: [
      { label: 'Dashboard', href: '/home', need: 'home' },
      { label: 'Profit Centrum', href: '/profit-centrum', need: 'profit-centrum' },
      { label: 'Statistiky', href: '/statistiky', need: 'statistiky' },
      { label: 'BlackBook', href: '/blackbook', need: 'blackbook' },
    ],
  },
  {
    id: 'keys',
    label: 'Klíče',
    sub: 'Garáž',
    position: [0.95, 0.83, 0.55],
    items: [{ label: 'Garáž', href: '/garaz', need: 'garaz' }],
  },
  {
    id: 'terminal',
    label: 'Pracovní terminál',
    sub: 'Správa skladu',
    position: [-0.85, 0.9, 0.55],
    items: [{ label: 'Správa skladu', href: '/sklad', need: 'sklad' }],
  },
  {
    id: 'grow',
    label: 'Grow panel',
    sub: 'Weed sázení',
    position: [1.15, 0.78, -0.35],
    items: [{ label: 'Weed sázení', href: '/weed-sazeni', need: 'weed-sazeni' }],
  },
  {
    id: 'glass-panel',
    label: 'Skleněný panel',
    sub: 'Hierarchie · Kodex',
    position: [-1.55, 1.5, -1.7],
    items: [
      { label: 'Hierarchie', href: '/hierarchy', need: 'hierarchy' },
      { label: 'Kodex', href: '/kodex', need: 'kodex' },
    ],
  },
  {
    id: 'board',
    label: 'Digitální nástěnka',
    sub: 'Nástěnka · Historie',
    position: [-1.75, 1.65, 0.9],
    items: [
      { label: 'Nástěnka', href: '/nastenska', need: 'nastenska' },
      { label: 'Historie', href: '/lore', need: 'lore' },
    ],
  },
  {
    id: 'frame',
    label: 'Osobní rám',
    sub: 'Profil · Fotogalerie · Vizitka',
    position: [1.7, 0.95, -1.15],
    items: [
      { label: 'Profil', href: '/profil', need: 'profil' },
      { label: 'Fotogalerie', href: '/galerie', need: 'galerie' },
      { label: 'Vizitka', href: '/karta', need: 'karta' },
    ],
  },
];
