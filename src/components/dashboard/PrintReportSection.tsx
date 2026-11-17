import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Layers,
  PenTool,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import {
  CounselingNote,
  CounselingRequest,
  GuestVisit,
  SiBKDatabase,
  StaffUser,
  ToastMessage,
} from '../../types/sibk';

export type PaperSizeId = 'A4' | 'F4' | 'Letter' | 'Legal';
export type PaperOrientation = 'portrait' | 'landscape';

interface PaperSpec {
  id: PaperSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
}

const PAPER_SPECS: Record<PaperSizeId, PaperSpec> = {
  A4: { id: 'A4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  F4: { id: 'F4', label: 'F4 / Folio (215 × 330 mm)', widthMm: 215, heightMm: 330 },
  Letter: { id: 'Letter', label: 'Letter (215.9 × 279.4 mm)', widthMm: 215.9, heightMm: 279.4 },
  Legal: { id: 'Legal', label: 'Legal (215.9 × 355.6 mm)', widthMm: 215.9, heightMm: 355.6 },
};

const PRINT_CONFIG_KEY = 'sibk_print_config_v1';

export interface PrintReportConfig {
  paperSize: PaperSizeId;
  orientation: PaperOrientation;
  showKopSurat: boolean;
  showLogoKiri: boolean;
  showLogoKanan: boolean;
  kopLines: [string, string, string, string, string, string];
  showKopLines: [boolean, boolean, boolean, boolean, boolean, boolean];
  logoKiriDataUrl: string | null;
  logoKananDataUrl: string | null;
  judulLaporan: string;
  showJudulLaporan: boolean;
  showRingkasanKPI: boolean;
  showTabelKonseling: boolean;
  showTabelTamu: boolean;
  showBlokTtd: boolean;
  showTtdKepsek: boolean;
  showTtdKoordinator: boolean;
  showTtdGuruBk: boolean;
  kotaTanggal: string;
  kepsekJabatan: string;
  kepsekNama: string;
  kepsekNip: string;
  koordinatorJabatan: string;
  koordinatorNama: string;
  koordinatorNip: string;
  guruBkJabatan: string;
  guruBkNama: string;
  guruBkNip: string;
}

function buildDefaultConfig(db: SiBKDatabase, currentStaff: StaffUser | null): PrintReportConfig {
  const koordinator =
    db.staff.find((s) => s.role === 'admin') ||
    db.staff.find((s) => s.nama.toLowerCase().includes('ida sulistyani')) ||
    db.staff[0];

  const activeGuru = currentStaff || db.staff.find((s) => s.role === 'guru_bk') || koordinator;

  return {
    paperSize: 'A4',
    orientation: 'portrait',
    showKopSurat: true,
    showLogoKiri: true,
    showLogoKanan: true,
    kopLines: [
      'PEMERINTAH PROVINSI DAERAH KHUSUS',
      'DINAS PENDIDIKAN DAN KEBUDAYAAN',
      'SMA NEGERI NUSANTARA HARAPAN',
      'Unit Bimbingan dan Konseling (SiBK) · Terakreditasi "A"',
      'Jl. Pendidikan Merdeka No. 45, Kota Nusantara 12345 · Telp. (021) 555-0148',
      'Laman: www.sman-nusantara.sch.id · Email: bk@sman-nusantara.sch.id',
    ],
    showKopLines: [true, true, true, true, true, true],
    logoKiriDataUrl: null,
    logoKananDataUrl: null,
    judulLaporan: 'LAPORAN BULANAN LAYANAN BIMBINGAN KONSELING & BUKU TAMU',
    showJudulLaporan: true,
    showRingkasanKPI: true,
    showTabelKonseling: true,
    showTabelTamu: true,
    showBlokTtd: true,
    showTtdKepsek: true,
    showTtdKoordinator: true,
    showTtdGuruBk: true,
    kotaTanggal: `Nusantara, ${formatTanggalID(getTodayISO())}`,
    kepsekJabatan: 'Kepala Sekolah',
    kepsekNama: 'Dr. Hj. Ratna Kusumawati, M.Pd.',
    kepsekNip: '197506122000032002',
    koordinatorJabatan: 'Koordinator Bimbingan & Konseling',
    koordinatorNama: koordinator?.nama || 'Dra. Ida Sulistyani',
    koordinatorNip: koordinator?.nip || '197204151998022001',
    guruBkJabatan: 'Guru Bimbingan & Konseling',
    guruBkNama: activeGuru?.nama || 'Daviq Prasetian, S.Pd.',
    guruBkNip: activeGuru?.nip || '198603212011011004',
  };
}

function loadPrintConfig(db: SiBKDatabase, currentStaff: StaffUser | null): PrintReportConfig {
  const defaults = buildDefaultConfig(db, currentStaff);
  try {
    const raw = localStorage.getItem(PRINT_CONFIG_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PrintReportConfig>;
    return {
      ...defaults,
      ...parsed,
      kopLines:
        Array.isArray(parsed.kopLines) && parsed.kopLines.length === 6
          ? (parsed.kopLines as PrintReportConfig['kopLines'])
          : defaults.kopLines,
      showKopLines:
        Array.isArray(parsed.showKopLines) && parsed.showKopLines.length === 6
          ? (parsed.showKopLines as PrintReportConfig['showKopLines'])
          : defaults.showKopLines,
    };
  } catch {
    return defaults;
  }
}

const DefaultLeftEmblem: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" className={className} aria-label="Logo Kiri Instansi">
    <defs>
      <linearGradient id="sibkLeftShield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f766e" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <path
      d="M40 6 L70 16 V40 C70 57 57 69 40 75 C23 69 10 57 10 40 V16 Z"
      fill="url(#sibkLeftShield)"
      stroke="#0f172a"
      strokeWidth="2"
    />
    <path
      d="M40 12 L64 20 V39 C64 53 53 63 40 68 C27 63 16 53 16 39 V20 Z"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.5"
      strokeOpacity="0.85"
    />
    <polygon points="40,19 43,27 51,27 45,32 47,40 40,35 33,40 35,32 29,27 37,27" fill="#fbbf24" />
    <path d="M24 46 Q32 42 40 46 Q48 42 56 46 V57 Q48 53 40 57 Q32 53 24 57 Z" fill="#ffffff" />
    <line x1="40" y1="46" x2="40" y2="57" stroke="#0f766e" strokeWidth="1.5" />
  </svg>
);

const DefaultRightEmblem: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" className={className} aria-label="Logo Kanan Sekolah">
    <circle cx="40" cy="40" r="34" fill="#ffffff" stroke="#0f766e" strokeWidth="2.5" />
    <circle cx="40" cy="40" r="29" fill="#f0fdfa" stroke="#0f766e" strokeWidth="1" strokeDasharray="3 2" />
    <path
      d="M40 17 L43 26 L52 29 L43 32 L40 41 L37 32 L28 29 L37 26 Z"
      fill="#0f766e"
    />
    <path
      d="M23 47 C23 43 31 41 40 45 C49 41 57 43 57 47 V56 C49 52 40 55 40 55 C40 55 31 52 23 56 Z"
      fill="#10b981"
      stroke="#0f172a"
      strokeWidth="1.2"
    />
    <text
      x="40"
      y="67"
      textAnchor="middle"
      fontSize="8.5"
      fontWeight="800"
      fill="#0f172a"
      fontFamily="sans-serif"
    >
      SiBK
    </text>
  </svg>
);

interface PrintReportSectionProps {
  reportMonth: string;
  setReportMonth: (val: string) => void;
  reportRequests: CounselingRequest[];
  reportNotes: CounselingNote[];
  reportGuests: GuestVisit[];
  db: SiBKDatabase;
  currentStaff: StaffUser | null;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

export const PrintReportSection: React.FC<PrintReportSectionProps> = ({
  reportMonth,
  setReportMonth,
  reportRequests,
  reportNotes,
  reportGuests,
  db,
  currentStaff,
  pushToast,
}) => {
  const [config, setConfig] = useState<PrintReportConfig>(() =>
    loadPrintConfig(db, currentStaff),
  );
  const [editorTab, setEditorTab] = useState<'none' | 'visibility' | 'kop' | 'ttd'>('visibility');

  // Persist config changes
  useEffect(() => {
    try {
      localStorage.setItem(PRINT_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota warnings on very large images
    }
  }, [config]);

  // Inject dynamic @page rule for exact chosen paper size & orientation during window.print()
  useEffect(() => {
    const spec = PAPER_SPECS[config.paperSize];
    const width = config.orientation === 'portrait' ? spec.widthMm : spec.heightMm;
    const height = config.orientation === 'portrait' ? spec.heightMm : spec.widthMm;

    let styleEl = document.getElementById('sibk-dynamic-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sibk-dynamic-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page {
          size: ${width}mm ${height}mm;
          margin: 12mm;
        }
      }
    `;
  }, [config.paperSize, config.orientation]);

  const activePaperSpec = PAPER_SPECS[config.paperSize];
  const displayWidthMm =
    config.orientation === 'portrait' ? activePaperSpec.widthMm : activePaperSpec.heightMm;
  const displayHeightMm =
    config.orientation === 'portrait' ? activePaperSpec.heightMm : activePaperSpec.widthMm;

  // Approximate pixel scale (3.78 px per mm) for faithful desktop preview width
  const previewMaxWidthPx = useMemo(() => {
    return Math.round(displayWidthMm * 3.78);
  }, [displayWidthMm]);

  const visibleSignatureCount =
    (config.showTtdKepsek ? 1 : 0) +
    (config.showTtdKoordinator ? 1 : 0) +
    (config.showTtdGuruBk ? 1 : 0);

  const signatureGridCols =
    visibleSignatureCount === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : visibleSignatureCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 max-w-xs mx-auto';

  const handleLogoUpload = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      pushToast({
        type: 'warning',
        title: 'Ukuran Logo Terlalu Besar',
        message: 'Gunakan gambar logo maksimal 1.5 MB agar tersimpan lancar.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setConfig((prev) => ({
        ...prev,
        ...(side === 'left' ? { logoKiriDataUrl: dataUrl } : { logoKananDataUrl: dataUrl }),
      }));
      pushToast({
        type: 'success',
        title: `Logo ${side === 'left' ? 'Kiri' : 'Kanan'} Diperbarui`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleShowAllSections = () => {
    setConfig((prev) => ({
      ...prev,
      showKopSurat: true,
      showLogoKiri: true,
      showLogoKanan: true,
      showKopLines: [true, true, true, true, true, true],
      showJudulLaporan: true,
      showRingkasanKPI: true,
      showTabelKonseling: true,
      showTabelTamu: true,
      showBlokTtd: true,
      showTtdKepsek: true,
      showTtdKoordinator: true,
      showTtdGuruBk: true,
    }));
    pushToast({ type: 'info', title: 'Semua Elemen Laporan Ditampilkan' });
  };

  const handleResetPrintConfig = () => {
    const fresh = buildDefaultConfig(db, currentStaff);
    setConfig(fresh);
    localStorage.removeItem(PRINT_CONFIG_KEY);
    pushToast({ type: 'info', title: 'Pengaturan Cetak Direset ke Default' });
  };

  const toggleFlag = (
    key:
      | 'showKopSurat'
      | 'showLogoKiri'
      | 'showLogoKanan'
      | 'showJudulLaporan'
      | 'showRingkasanKPI'
      | 'showTabelKonseling'
      | 'showTabelTamu'
      | 'showBlokTtd'
      | 'showTtdKepsek'
      | 'showTtdKoordinator'
      | 'showTtdGuruBk',
  ) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar (hidden when printing) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Period + Paper Size + Orientation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Periode:
              </label>
              <input
                type="month"
                value={reportMonth === 'all' ? '' : reportMonth}
                onChange={(e) => setReportMonth(e.target.value || 'all')}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono-tabular text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setReportMonth('all')}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  reportMonth === 'all'
                    ? 'sibk-btn-primary border-transparent'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Semua Data
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Paper Size Selector */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="sibk-paper-size"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Kertas:
              </label>
              <select
                id="sibk-paper-size"
                value={config.paperSize}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, paperSize: e.target.value as PaperSizeId }))
                }
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {(Object.keys(PAPER_SPECS) as PaperSizeId[]).map((key) => (
                  <option key={key} value={key}>
                    {PAPER_SPECS[key].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Orientation Selector */}
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              {(['portrait', 'landscape'] as PaperOrientation[]).map((ori) => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, orientation: ori }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    config.orientation === ori
                      ? 'sibk-btn-primary shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ori === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>
          </div>

          {/* Print Action */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-sm shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>

        {/* Sub-panels for Visibility, 6-Line Kop + 2 Logos, and 3 Signatures */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {[
              {
                id: 'visibility' as const,
                label: 'Tampilkan / Sembunyikan Elemen',
                icon: SlidersHorizontal,
              },
              {
                id: 'kop' as const,
                label: 'Edit Kop 6 Baris & 2 Logo',
                icon: Layers,
              },
              {
                id: 'ttd' as const,
                label: 'Edit 3 TTD (Kepsek, Koord. BK, Guru BK)',
                icon: PenTool,
              },
            ].map((panel) => {
              const Icon = panel.icon;
              const isOpen = editorTab === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setEditorTab(isOpen ? 'none' : panel.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    isOpen
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{panel.label}</span>
                  {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShowAllSections}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilkan Semua</span>
            </button>
            <button
              type="button"
              onClick={handleResetPrintConfig}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Panel 1: Visibility Toggles */}
        {editorTab === 'visibility' && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Kontrol Tampil / Sembunyi Bagian Surat & Laporan
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Klik tombol untuk menyembunyikan atau menampilkan bagian tertentu
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {(
                [
                  { key: 'showKopSurat', label: 'Kop Surat (Utama)' },
                  { key: 'showLogoKiri', label: 'Logo Kiri' },
                  { key: 'showLogoKanan', label: 'Logo Kanan' },
                  { key: 'showJudulLaporan', label: 'Judul & Periode' },
                  { key: 'showRingkasanKPI', label: 'Ringkasan Statistik' },
                  { key: 'showTabelKonseling', label: 'Tabel Konseling Siswa' },
                  { key: 'showTabelTamu', label: 'Tabel Buku Tamu' },
                  { key: 'showBlokTtd', label: 'Blok Tanda Tangan' },
                  { key: 'showTtdKepsek', label: 'TTD Kepala Sekolah' },
                  { key: 'showTtdKoordinator', label: 'TTD Koordinator BK' },
                  { key: 'showTtdGuruBk', label: 'TTD Guru BK' },
                ] as const
              ).map((item) => {
                const active = config[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleFlag(item.key)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? 'border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {active ? (
                      <Eye className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Individual 6-line Kop toggles */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Visibilitas Per Baris Kop Surat (6 Baris):
              </p>
              <div className="flex flex-wrap gap-2">
                {config.showKopLines.map((visible, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => {
                        const next = [...prev.showKopLines] as PrintReportConfig['showKopLines'];
                        next[idx] = !next[idx];
                        return { ...prev, showKopLines: next };
                      })
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                      visible
                        ? 'border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                    }`}
                  >
                    {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>Baris {idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: 6-Line Kop Surat & 2 Logos Editor */}
        {editorTab === 'kop' && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Logo Upload */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {config.logoKiriDataUrl ? (
                    <img
                      src={config.logoKiriDataUrl}
                      alt="Logo Kiri"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <DefaultLeftEmblem className="w-11 h-11" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                    <span>Logo Kiri Kop Surat</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[11px] font-semibold cursor-pointer hover:bg-teal-100">
                      <Upload className="w-3 h-3" />
                      <span>Unggah Gambar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload('left', e)}
                      />
                    </label>
                    {config.logoKiriDataUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, logoKiriDataUrl: null }))}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Pakai Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFlag('showLogoKiri')}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline ml-auto"
                    >
                      {config.showLogoKiri ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Logo Upload */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                  {config.logoKananDataUrl ? (
                    <img
                      src={config.logoKananDataUrl}
                      alt="Logo Kanan"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <DefaultRightEmblem className="w-11 h-11" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                    <span>Logo Kanan Kop Surat</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[11px] font-semibold cursor-pointer hover:bg-sky-100">
                      <Upload className="w-3 h-3" />
                      <span>Unggah Gambar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoUpload('right', e)}
                      />
                    </label>
                    {config.logoKananDataUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, logoKananDataUrl: null }))}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Pakai Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFlag('showLogoKanan')}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:underline ml-auto"
                    >
                      {config.showLogoKanan ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Kop Lines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.kopLines.map((line, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Baris {idx + 1}{' '}
                      {idx === 2 ? '(Nama Sekolah - Cetak Tebal)' : idx < 2 ? '(Instansi)' : '(Detail)'}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => {
                          const next = [...prev.showKopLines] as PrintReportConfig['showKopLines'];
                          next[idx] = !next[idx];
                          return { ...prev, showKopLines: next };
                        })
                      }
                      className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                    >
                      {config.showKopLines[idx] ? 'Tampil' : 'Disembunyikan'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={line}
                    onChange={(e) =>
                      setConfig((prev) => {
                        const next = [...prev.kopLines] as PrintReportConfig['kopLines'];
                        next[idx] = e.target.value;
                        return { ...prev, kopLines: next };
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Judul Laporan
              </label>
              <input
                type="text"
                value={config.judulLaporan}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, judulLaporan: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Panel 3: 3 Signatures Editor */}
        {editorTab === 'ttd' && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Kota & Tanggal Tanda Tangan
                </label>
                <input
                  type="text"
                  value={config.kotaTanggal}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, kotaTanggal: e.target.value }))
                  }
                  className="w-full sm:max-w-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Pilih Cepat Guru BK Penandatangan
                </label>
                <select
                  value={
                    db.staff.find((s) => s.nama === config.guruBkNama)?.id || ''
                  }
                  onChange={(e) => {
                    const picked = db.staff.find((s) => s.id === e.target.value);
                    if (picked) {
                      setConfig((prev) => ({
                        ...prev,
                        guruBkNama: picked.nama,
                        guruBkNip: picked.nip,
                      }));
                    }
                  }}
                  className="w-full sm:max-w-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Pilih dari Daftar Guru BK --</option>
                  {db.staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nama} ({st.jabatan})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* TTD 1: Kepsek */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    1. TTD Kepala Sekolah
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlag('showTtdKepsek')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      config.showTtdKepsek
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {config.showTtdKepsek ? 'Tampil' : 'Sembunyi'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={config.kepsekJabatan}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, kepsekJabatan: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Nama Kepala Sekolah"
                  value={config.kepsekNama}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, kepsekNama: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="NIP"
                  value={config.kepsekNip}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, kepsekNip: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono-tabular text-slate-900 dark:text-white"
                />
              </div>

              {/* TTD 2: Koordinator BK */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    2. TTD Koordinator BK
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlag('showTtdKoordinator')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      config.showTtdKoordinator
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {config.showTtdKoordinator ? 'Tampil' : 'Sembunyi'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={config.koordinatorJabatan}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, koordinatorJabatan: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Nama Koordinator BK"
                  value={config.koordinatorNama}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, koordinatorNama: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="NIP"
                  value={config.koordinatorNip}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, koordinatorNip: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono-tabular text-slate-900 dark:text-white"
                />
              </div>

              {/* TTD 3: Guru BK */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    3. TTD Guru BK
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFlag('showTtdGuruBk')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      config.showTtdGuruBk
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {config.showTtdGuruBk ? 'Tampil' : 'Sembunyi'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Jabatan"
                  value={config.guruBkJabatan}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, guruBkJabatan: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Nama Guru BK"
                  value={config.guruBkNama}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, guruBkNama: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="NIP"
                  value={config.guruBkNip}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, guruBkNip: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono-tabular text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Paper Size & Orientation Indicator */}
      <div className="no-print flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Pratinjau Kertas:{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            {config.paperSize} ({displayWidthMm} × {displayHeightMm} mm) ·{' '}
            {config.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
          </strong>
        </span>
        <span className="hidden sm:inline font-mono-tabular">
          Orientasi & ukuran kertas otomatis diterapkan saat cetak
        </span>
      </div>

      {/* Printable Formal Report Paper Sheet */}
      <div className="overflow-x-auto pb-4">
        <div
          style={{ maxWidth: `${previewMaxWidthPx}px` }}
          className="print-container mx-auto bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 transition-all duration-200"
        >
          {/* KOP SURAT: 2 Logos Left & Right + 6 Lines */}
          {config.showKopSurat && (
            <header className="border-b-4 border-double border-slate-900 pb-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left Logo */}
                <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center">
                  {config.showLogoKiri &&
                    (config.logoKiriDataUrl ? (
                      <img
                        src={config.logoKiriDataUrl}
                        alt="Logo Instansi Kiri"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                    ) : (
                      <DefaultLeftEmblem className="w-16 h-16 sm:w-20 sm:h-20" />
                    ))}
                </div>

                {/* Center 6 Lines */}
                <div className="flex-1 text-center leading-tight space-y-0.5">
                  {config.showKopLines[0] && (
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-800 uppercase tracking-wider">
                      {config.kopLines[0]}
                    </p>
                  )}
                  {config.showKopLines[1] && (
                    <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {config.kopLines[1]}
                    </p>
                  )}
                  {config.showKopLines[2] && (
                    <h3 className="font-display text-lg sm:text-2xl font-extrabold text-slate-950 uppercase tracking-tight">
                      {config.kopLines[2]}
                    </h3>
                  )}
                  {config.showKopLines[3] && (
                    <p className="text-xs font-semibold text-slate-700">
                      {config.kopLines[3]}
                    </p>
                  )}
                  {config.showKopLines[4] && (
                    <p className="text-[11px] text-slate-600">{config.kopLines[4]}</p>
                  )}
                  {config.showKopLines[5] && (
                    <p className="text-[11px] text-slate-600">{config.kopLines[5]}</p>
                  )}
                </div>

                {/* Right Logo */}
                <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center">
                  {config.showLogoKanan &&
                    (config.logoKananDataUrl ? (
                      <img
                        src={config.logoKananDataUrl}
                        alt="Logo Sekolah Kanan"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                    ) : (
                      <DefaultRightEmblem className="w-16 h-16 sm:w-20 sm:h-20" />
                    ))}
                </div>
              </div>
            </header>
          )}

          {/* Judul & Periode Laporan */}
          {config.showJudulLaporan && (
            <div className="text-center">
              <h4 className="font-display text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wide">
                {config.judulLaporan}
              </h4>
              <p className="text-xs text-slate-600 font-mono-tabular mt-1">
                Periode: {reportMonth === 'all' ? 'Seluruh Periode Tercatat' : reportMonth}
              </p>
            </div>
          )}

          {/* Ringkasan Statistik (4 KPI) */}
          {config.showRingkasanKPI && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="block text-xs text-slate-500">Pengajuan Siswa</span>
                <span className="font-mono-tabular text-2xl font-bold text-slate-900">
                  {reportRequests.length}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="block text-xs text-slate-500">Sesi Selesai</span>
                <span className="font-mono-tabular text-2xl font-bold text-emerald-700">
                  {reportRequests.filter((r) => r.status === 'Selesai').length}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="block text-xs text-slate-500">Catatan Rekam Jejak</span>
                <span className="font-mono-tabular text-2xl font-bold text-teal-800">
                  {reportNotes.length}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <span className="block text-xs text-slate-500">Kunjungan Tamu</span>
                <span className="font-mono-tabular text-2xl font-bold text-slate-900">
                  {reportGuests.length}
                </span>
              </div>
            </div>
          )}

          {/* Tabel 1: Layanan Konseling Siswa */}
          {config.showTabelKonseling && (
            <div>
              <h5 className="font-display text-sm font-bold text-slate-900 mb-2">
                1. Rekapitulasi Layanan Konseling Siswa
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Siswa</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3">Jenis Layanan</th>
                      <th className="py-2.5 px-3">Guru BK</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          Tidak ada data pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      reportRequests.map((r) => {
                        const s = db.students.find((x) => x.id === r.studentId);
                        const g = db.staff.find((x) => x.id === r.guruTujuanId);
                        return (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-mono-tabular">
                              {formatTanggalID(r.tanggalPengajuan)}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {s?.nama || '-'}
                            </td>
                            <td className="py-2 px-3">{s?.kelas || '-'}</td>
                            <td className="py-2 px-3">{r.jenisKeperluan}</td>
                            <td className="py-2 px-3">{g?.nama || '-'}</td>
                            <td className="py-2 px-3 font-semibold">{r.status}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabel 2: Buku Tamu Digital */}
          {config.showTabelTamu && (
            <div>
              <h5 className="font-display text-sm font-bold text-slate-900 mb-2">
                2. Rekapitulasi Kunjungan Buku Tamu Digital
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">No. Antrean</th>
                      <th className="py-2.5 px-3">Tanggal & Jam</th>
                      <th className="py-2.5 px-3">Nama Pengunjung</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Pihak Dituju</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportGuests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          Tidak ada data kunjungan tamu pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      reportGuests.map((g) => (
                        <tr key={g.id}>
                          <td className="py-2 px-3 font-mono-tabular font-semibold">
                            {g.nomorAntrean}
                          </td>
                          <td className="py-2 px-3 font-mono-tabular">
                            {formatTanggalID(g.tanggal)} ({g.jamMasuk}
                            {g.jamKeluar ? ` - ${g.jamKeluar}` : ''})
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {g.namaLengkap}
                          </td>
                          <td className="py-2 px-3">{g.kategori}</td>
                          <td className="py-2 px-3">{g.pihakDituju}</td>
                          <td className="py-2 px-3 font-semibold">{g.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Blok Tanda Tangan (3 TTD: Kepala Sekolah, Koordinator BK, Guru BK) */}
          {config.showBlokTtd && visibleSignatureCount > 0 && (
            <div className={`pt-6 grid ${signatureGridCols} gap-6 text-xs text-slate-800 break-inside-avoid`}>
              {config.showTtdKepsek && (
                <div className="text-center sm:text-left">
                  <p>Mengetahui,</p>
                  <p className="font-semibold">{config.kepsekJabatan}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{config.kepsekNama}</p>
                  <p className="font-mono-tabular text-slate-500">NIP. {config.kepsekNip}</p>
                </div>
              )}

              {config.showTtdKoordinator && (
                <div className="text-center">
                  <p>Diperiksa oleh,</p>
                  <p className="font-semibold">{config.koordinatorJabatan}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{config.koordinatorNama}</p>
                  <p className="font-mono-tabular text-slate-500">NIP. {config.koordinatorNip}</p>
                </div>
              )}

              {config.showTtdGuruBk && (
                <div className="text-center sm:text-right">
                  <p>{config.kotaTanggal}</p>
                  <p className="font-semibold">{config.guruBkJabatan}</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{config.guruBkNama}</p>
                  <p className="font-mono-tabular text-slate-500">NIP. {config.guruBkNip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
