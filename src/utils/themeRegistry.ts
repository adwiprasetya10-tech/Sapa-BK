import { AppThemeId, AppThemeMeta } from '../types/sibk';

export const SIBK_THEMES: AppThemeMeta[] = [
  {
    id: 'aurora',
    name: 'Aurora Emerald',
    subtitle: 'Teal, Zamrud & Cyan Segar',
    swatchColors: ['#0d9488', '#10b981', '#06b6d4'],
    isDark: false,
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    subtitle: 'Koral, Jingga & Amber Hangat',
    swatchColors: ['#e11d48', '#f97316', '#f59e0b'],
    isDark: false,
  },
  {
    id: 'indigo',
    name: 'Royal Violet',
    subtitle: 'Indigo, Ungu & Magenta Modern',
    swatchColors: ['#4f46e5', '#7c3aed', '#db2777'],
    isDark: false,
  },
  {
    id: 'ocean',
    name: 'Oceanic Sky',
    subtitle: 'Biru Kobalt & Langit Cerah',
    swatchColors: ['#2563eb', '#0284c7', '#06b6d4'],
    isDark: false,
  },
  {
    id: 'midnight',
    name: 'Midnight Neon',
    subtitle: 'Mode Gelap Elegan & Kontras',
    swatchColors: ['#0f766e', '#6366f1', '#ec4899'],
    isDark: true,
  },
];

export function getThemeMeta(id: AppThemeId): AppThemeMeta {
  return SIBK_THEMES.find((t) => t.id === id) || SIBK_THEMES[0];
}
