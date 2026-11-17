import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Palette } from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { getThemeMeta, SIBK_THEMES } from '../utils/themeRegistry';

interface ThemeSwitcherProps {
  compact?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false }) => {
  const { theme, setTheme } = useSiBK();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTheme = getThemeMeta(theme);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative no-print">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
        aria-expanded={open}
        aria-label="Pilih tema warna aplikasi"
      >
        <span className="flex items-center -space-x-1 shrink-0" aria-hidden="true">
          {activeTheme.swatchColors.map((hex, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800"
              style={{ backgroundColor: hex }}
            />
          ))}
        </span>
        {!compact && <span className="hidden sm:inline">{activeTheme.name}</span>}
        <Palette className="w-3.5 h-3.5 sm:hidden" />
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2 z-50">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Pilih Tema Tampilan
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Palet warna diterapkan langsung
            </p>
          </div>

          <div className="space-y-1">
            {SIBK_THEMES.map((item) => {
              const isSelected = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg shrink-0 shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${item.swatchColors[0]}, ${item.swatchColors[1]}, ${item.swatchColors[2]})`,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
