import React, { useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileCheck2,
  Globe,
  GraduationCap,
  HeartHandshake,
  Layout,
  Palette,
  Plus,
  QrCode,
  RotateCcw,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { AppSettings, FontPreset, WebLogoPreset, WebLogoRounded } from '../../types/sibk';
import { PRINT_CONFIG_STORAGE_KEY } from '../../utils/appSettings';
import { SIBK_THEMES } from '../../utils/themeRegistry';
import { BrandLogo } from '../BrandLogo';

type SettingsSection = 'brand' | 'gateway' | 'service' | 'appearance';

const LOGO_PRESETS: { id: WebLogoPreset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'shield', label: 'Perisai BK', icon: ShieldCheck },
  { id: 'graduation', label: 'Topi Akademik', icon: GraduationCap },
  { id: 'heart', label: 'Konseling Peduli', icon: HeartHandshake },
  { id: 'school', label: 'Gedung Sekolah', icon: School },
  { id: 'sparkles', label: 'Bintang Layanan', icon: Sparkles },
];

export const SettingsTab: React.FC = () => {
  const {
    settings,
    updateSettings,
    replaceSettings,
    resetSettings,
    theme,
    setTheme,
    pushToast,
  } = useSiBK();

  const [section, setSection] = useState<SettingsSection>('brand');
  const [newTargetInput, setNewTargetInput] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const handleWebLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      pushToast({
        type: 'warning',
        title: 'Ukuran File Logo Terlalu Besar',
        message: 'Gunakan gambar logo maksimal 1.5 MB agar tersimpan aman di browser.',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ webLogoDataUrl: String(reader.result || '') });
      pushToast({
        type: 'success',
        title: 'Logo Web Berhasil Diperbarui',
        message: 'Logo baru langsung diterapkan ke seluruh halaman & tab browser.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSyncToKopSurat = () => {
    try {
      const raw = localStorage.getItem(PRINT_CONFIG_STORAGE_KEY);
      const currentPrint = raw ? JSON.parse(raw) : {};
      const existingLines: string[] = Array.isArray(currentPrint.kopLines)
        ? [...currentPrint.kopLines]
        : [
            'PEMERINTAH PROVINSI DAERAH KHUSUS',
            'DINAS PENDIDIKAN DAN KEBUDAYAAN',
            settings.schoolName,
            `Unit ${settings.appName} — ${settings.appTagline}`,
            settings.schoolAddress,
            settings.schoolContact,
          ];

      existingLines[2] = settings.schoolName;
      existingLines[4] = settings.schoolAddress;
      existingLines[5] = settings.schoolContact;

      const updatedPrint = {
        ...currentPrint,
        kopLines: existingLines,
        ...(settings.webLogoDataUrl ? { logoKananDataUrl: settings.webLogoDataUrl } : {}),
      };
      localStorage.setItem(PRINT_CONFIG_STORAGE_KEY, JSON.stringify(updatedPrint));
      pushToast({
        type: 'success',
        title: 'Identitas & Logo Disinkronkan ke Kop Surat',
        message: 'Cek hasilnya pada menu Data Master -> Laporan & Ekspor.',
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Gagal Menyinkronkan ke Kop Surat',
      });
    }
  };

  const handleToggleGatewayTab = (
    key: 'showStudentTab' | 'showStaffTab' | 'showGuestTab'
  ) => {
    const nextVal = !settings[key];
    const s1 = key === 'showStudentTab' ? nextVal : settings.showStudentTab;
    const s2 = key === 'showStaffTab' ? nextVal : settings.showStaffTab;
    const s3 = key === 'showGuestTab' ? nextVal : settings.showGuestTab;
    const remainingCount = [s1, s2, s3].filter(Boolean).length;

    if (remainingCount === 0) {
      pushToast({
        type: 'warning',
        title: 'Minimal 1 Tab Gerbang Harus Aktif',
        message: 'Sisakan minimal satu tab akses pada halaman depan.',
      });
      return;
    }
    updateSettings({ [key]: nextVal });
  };

  const handleAddExtraTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTargetInput.trim();
    if (!cleaned) return;
    if (settings.extraGuestTargets.includes(cleaned)) {
      setNewTargetInput('');
      return;
    }
    updateSettings({
      extraGuestTargets: [...settings.extraGuestTargets, cleaned],
    });
    setNewTargetInput('');
  };

  const handleRemoveExtraTarget = (target: string) => {
    updateSettings({
      extraGuestTargets: settings.extraGuestTargets.filter((item) => item !== target),
    });
  };

  const handleExportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pengaturan-${(settings.appName || 'sibk').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({
      type: 'success',
      title: 'File Pengaturan Diunduh',
    });
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<AppSettings>;
        if (!parsed.appName || !parsed.schoolName) {
          pushToast({
            type: 'error',
            title: 'File Pengaturan Tidak Valid',
          });
          return;
        }
        replaceSettings({ ...settings, ...parsed });
      } catch {
        pushToast({
          type: 'error',
          title: 'Gagal Membaca JSON Pengaturan',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span>Pengaturan Web & Sistem Penuh</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Atur logo web, identitas sekolah, tampilan halaman depan, layanan QR Buku Tamu, dan tema global secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => pushToast({ type: 'success', title: 'Seluruh Perubahan Otomatis Tersimpan' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Auto-Simpan Aktif</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        {(
          [
            { id: 'brand', label: 'Logo Web & Identitas', icon: Globe },
            { id: 'gateway', label: 'Halaman Depan & Akses', icon: Layout },
            { id: 'service', label: 'Layanan BK & QR Tamu', icon: QrCode },
            { id: 'appearance', label: 'Tema, Font & Cadangan', icon: Palette },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                active
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: LOGO WEB & IDENTITAS */}
      {section === 'brand' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Logo Customizer */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Pengaturan Logo Web & Favicon
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Logo tampil di header gerbang masuk, sidebar dashboard, serta ikon tab browser.
              </p>
            </div>

            {/* Live Brand Preview */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex items-center gap-3.5">
              <BrandLogo size="lg" />
              <div className="min-w-0">
                <p className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                  {settings.appName || 'SiBK'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {settings.schoolName}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {settings.appTagline}
                </p>
              </div>
            </div>

            {/* Upload Custom Web Logo */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Unggah Gambar Logo Web (PNG / JPG / SVG / WebP)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl sibk-btn-primary px-4 py-2 text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{settings.webLogoDataUrl ? 'Ganti Logo Web' : 'Unggah Logo Web'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWebLogoUpload}
                    className="hidden"
                  />
                </label>
                {settings.webLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() => updateSettings({ webLogoDataUrl: null })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Preset Icon Picker */}
            {!settings.webLogoDataUrl && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Pilih Ikon Bawaan (Saat Tidak Mengunggah Gambar)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {LOGO_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const active = settings.webLogoPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateSettings({ webLogoPreset: preset.id })}
                        title={preset.label}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border text-[10px] font-semibold transition-all ${
                          active
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate w-full text-center px-0.5">{preset.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shape & Container Bg */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Bentuk Bingkai Logo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'rounded-xl', label: 'Membulat' },
                      { id: 'rounded-full', label: 'Lingkaran' },
                      { id: 'rounded-md', label: 'Tegas' },
                    ] as { id: WebLogoRounded; label: string }[]
                  ).map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => updateSettings({ webLogoRounded: shape.id })}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold ${
                        settings.webLogoRounded === shape.id
                          ? 'sibk-btn-primary border-transparent'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <span>Tampilkan bingkai / latar belakang wadah logo</span>
                <input
                  type="checkbox"
                  checked={settings.showWebLogoContainerBg}
                  onChange={(e) =>
                    updateSettings({ showWebLogoContainerBg: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-teal-600"
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                <span>Sinkronkan logo & nama web ke tab browser (Favicon)</span>
                <input
                  type="checkbox"
                  checked={settings.faviconSync}
                  onChange={(e) => updateSettings({ faviconSync: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600"
                />
              </label>
            </div>
          </div>

          {/* School & Web Identity Fields */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Identitas Aplikasi & Instansi Sekolah
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Nama aplikasi, sekolah, alamat, dan footer tampil otomatis di seluruh halaman.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncToKopSurat}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/50 px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-200 hover:bg-teal-100"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Salin ke Kop Surat Cetak</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Singkat Aplikasi Web
                </label>
                <input
                  type="text"
                  value={settings.appName}
                  onChange={(e) => updateSettings({ appName: e.target.value })}
                  placeholder="Contoh: SiBK"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Sekolah / Instansi
                </label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => updateSettings({ schoolName: e.target.value })}
                  placeholder="Contoh: SMA Negeri Nusantara Harapan"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Subjudul / Kepanjangan Aplikasi
              </label>
              <input
                type="text"
                value={settings.appTagline}
                onChange={(e) => updateSettings({ appTagline: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Alamat Lengkap & Telepon Sekolah
              </label>
              <input
                type="text"
                value={settings.schoolAddress}
                onChange={(e) => updateSettings({ schoolAddress: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Website & Email Resmi
                </label>
                <input
                  type="text"
                  value={settings.schoolContact}
                  onChange={(e) => updateSettings({ schoolContact: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Label Footer Aplikasi
                </label>
                <input
                  type="text"
                  value={settings.footerLabel}
                  onChange={(e) => updateSettings({ footerLabel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HALAMAN DEPAN & AKSES */}
      {section === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Teks & Showcase Halaman Depan
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tab Default Saat Pengunjung Membuka Web
              </label>
              <select
                value={settings.defaultGatewayTab}
                onChange={(e) =>
                  updateSettings({
                    defaultGatewayTab: e.target.value as AppSettings['defaultGatewayTab'],
                  })
                }
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="siswa">Tab 1: Login Siswa</option>
                <option value="staff">Tab 2: Login Guru BK / Admin</option>
                <option value="tamu">Tab 3: Buku Tamu Digital</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Label Atas Panel Kiri (Hero Badge)
              </label>
              <input
                type="text"
                value={settings.heroBadge}
                onChange={(e) => updateSettings({ heroBadge: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Judul Utama Halaman Depan
              </label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(e) => updateSettings({ heroTitle: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Deskripsi Singkat Halaman Depan
              </label>
              <textarea
                rows={3}
                value={settings.heroDescription}
                onChange={(e) => updateSettings({ heroDescription: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
              />
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Kontrol Fitur & Visibilitas Gerbang Masuk
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aktifkan atau sembunyikan bagian tertentu sesuai kebutuhan sekolah (misalnya saat mode Kiosk Buku Tamu atau produksi).
            </p>

            <div className="space-y-2.5 pt-2">
              {[
                {
                  label: 'Tampilkan Tab Login Siswa',
                  checked: settings.showStudentTab,
                  onChange: () => handleToggleGatewayTab('showStudentTab'),
                },
                {
                  label: 'Tampilkan Tab Login Guru BK / Admin',
                  checked: settings.showStaffTab,
                  onChange: () => handleToggleGatewayTab('showStaffTab'),
                },
                {
                  label: 'Tampilkan Tab Buku Tamu Digital',
                  checked: settings.showGuestTab,
                  onChange: () => handleToggleGatewayTab('showGuestTab'),
                },
                {
                  label: 'Tampilkan Panel Showcase Kiri (Gradasi Warna)',
                  checked: settings.showHeroShowcase,
                  onChange: () =>
                    updateSettings({ showHeroShowcase: !settings.showHeroShowcase }),
                },
                {
                  label: 'Tampilkan Tombol "Isi Data Demo" di Form Login',
                  checked: settings.showDemoLoginButtons,
                  onChange: () =>
                    updateSettings({
                      showDemoLoginButtons: !settings.showDemoLoginButtons,
                    }),
                },
                {
                  label: 'Tampilkan Statistik Guru BK & Tamu di Halaman Depan',
                  checked: settings.showStatsOnGateway,
                  onChange: () =>
                    updateSettings({ showStatsOnGateway: !settings.showStatsOnGateway }),
                },
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-4 py-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.onChange}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: LAYANAN BK & QR BUKU TAMU */}
      {section === 'service' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-teal-600" />
              <span>Pengaturan Buku Tamu & QR Check-In</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Prefix Nomor Antrean Tamu
                </label>
                <input
                  type="text"
                  value={settings.guestQueuePrefix}
                  onChange={(e) => updateSettings({ guestQueuePrefix: e.target.value })}
                  placeholder="Contoh: TM-"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hasil: {(settings.guestQueuePrefix || 'TM-').toUpperCase()}001
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ruang Pertemuan Default
                </label>
                <input
                  type="text"
                  value={settings.defaultMeetingRoom}
                  onChange={(e) => updateSettings({ defaultMeetingRoom: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  key: 'enableQrScanner' as const,
                  label: 'Aktifkan Pemindai QR Check-In pada Buku Tamu',
                },
                {
                  key: 'showQrOnGuestTicket' as const,
                  label: 'Tampilkan QR Tiket pada Kartu Bukti Kunjungan Digital',
                },
                {
                  key: 'defaultQrAutoCheckIn' as const,
                  label: 'Otomatis Check-In saat QR Tamu berhasil dipindai',
                },
                {
                  key: 'allowSecretUrgency' as const,
                  label: 'Izinkan siswa memilih urgensi "Mendesak (Rahasia)"',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-4 py-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    {opt.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[opt.key]}
                    onChange={(e) => updateSettings({ [opt.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Informasi Jam Operasional Layanan BK
              </label>
              <input
                type="text"
                value={settings.serviceHoursNote}
                onChange={(e) => updateSettings({ serviceHoursNote: e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Daftar Pihak Tujuan Tambahan (Buku Tamu)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selain seluruh daftar Guru BK, pengunjung dapat memilih pihak tambahan di bawah ini.
              </p>
            </div>

            <form onSubmit={handleAddExtraTarget} className="flex gap-2">
              <input
                type="text"
                value={newTargetInput}
                onChange={(e) => setNewTargetInput(e.target.value)}
                placeholder="Contoh: Kepala Sekolah / Kurikulum"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-4 py-2 text-xs font-semibold shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </form>

            <div className="space-y-2">
              {settings.extraGuestTargets.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  Tidak ada pihak tambahan. Hanya daftar Guru BK yang tampil.
                </p>
              ) : (
                settings.extraGuestTargets.map((target) => (
                  <div
                    key={target}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs sm:text-sm"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {target}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraTarget(target)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                      title="Hapus tujuan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: TEMA, TIPOGRAFI & BACKUP PENGATURAN */}
      {section === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Tema Warna & Gaya Tipografi Global
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pilih palet warna utama dan karakter huruf yang digunakan di seluruh aplikasi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIBK_THEMES.map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-10 h-10 rounded-xl shrink-0 shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${t.swatchColors[0]}, ${t.swatchColors[1]}, ${t.swatchColors[2]})`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {t.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Gaya Tipografi (Font Preset)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'modern', label: 'Modern (Jakarta)' },
                    { id: 'classic', label: 'Klasik (System)' },
                    { id: 'formal', label: 'Formal (Serif)' },
                  ] as { id: FontPreset; label: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => updateSettings({ fontPreset: f.id })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold ${
                      settings.fontPreset === f.id
                        ? 'sibk-btn-primary border-transparent'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-4 py-3 cursor-pointer">
                <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                  Tampilkan tombol ganti tema di header aplikasi
                </span>
                <input
                  type="checkbox"
                  checked={settings.showThemeSwitcher}
                  onChange={(e) =>
                    updateSettings({ showThemeSwitcher: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-teal-600"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 px-4 py-3 cursor-pointer">
                <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                  Tampilkan angka antrean menunggu pada sidebar dashboard
                </span>
                <input
                  type="checkbox"
                  checked={settings.showSidebarQueueBadge}
                  onChange={(e) =>
                    updateSettings({ showSidebarQueueBadge: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-teal-600"
                />
              </label>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Cadangkan & Pulihkan Pengaturan Web
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ekspor seluruh konfigurasi logo web, nama sekolah, teks halaman depan, dan preferensi layanan ke file JSON agar mudah dipindahkan ke perangkat lain.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleExportSettings}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-4 py-2.5 text-xs sm:text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Pengaturan Web (JSON)</span>
              </button>

              <label className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Impor Pengaturan Web (JSON)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportSettings}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Reset Pengaturan Web?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Logo web, nama sekolah, dan seluruh pengaturan tampilan akan dikembalikan ke bawaan awal. Data siswa dan catatan tidak terhapus.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSettings();
                  setConfirmReset(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Reset Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
