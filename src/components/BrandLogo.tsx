import React from 'react';
import {
  GraduationCap,
  HeartHandshake,
  School,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { WebLogoPreset } from '../types/sibk';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PRESET_ICONS: Record<WebLogoPreset, React.ComponentType<{ className?: string }>> = {
  shield: ShieldCheck,
  graduation: GraduationCap,
  heart: HeartHandshake,
  sparkles: Sparkles,
  school: School,
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const { settings } = useSiBK();

  const boxSize =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const iconSize =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  const Icon = PRESET_ICONS[settings.webLogoPreset] || ShieldCheck;

  if (settings.webLogoDataUrl) {
    return (
      <div
        className={`${boxSize} ${settings.webLogoRounded} ${
          settings.showWebLogoContainerBg
            ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shadow-xs'
            : ''
        } flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      >
        <img
          src={settings.webLogoDataUrl}
          alt={`Logo ${settings.appName}`}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${boxSize} ${settings.webLogoRounded} ${
        settings.showWebLogoContainerBg
          ? 'sibk-gradient-hero text-white shadow-sm'
          : 'text-teal-700 dark:text-teal-400'
      } flex items-center justify-center shrink-0 ${className}`}
    >
      <Icon className={iconSize} />
    </div>
  );
};
