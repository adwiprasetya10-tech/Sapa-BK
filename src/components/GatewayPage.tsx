import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  UserCheck,
  BookOpenCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Printer,
  ArrowRight,
  Clock,
  Users,
  Sparkles,
  RotateCcw,
  QrCode,
  Camera,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../data/seedData';
import { GuestVisit, VisitorCategory } from '../types/sibk';
import {
  buildGuestTicketPayload,
  generateQrDataUrl,
  ParsedGuestQrCheckIn,
} from '../utils/guestQr';
import { SIBK_THEMES } from '../utils/themeRegistry';
import { BrandLogo } from './BrandLogo';
import { GuestQrScannerModal } from './GuestQrScannerModal';
import { ThemeSwitcher } from './ThemeSwitcher';

type GatewayTab = 'siswa' | 'staff' | 'tamu';

export const GatewayPage: React.FC = () => {
  const { db, theme, setTheme, settings, loginStudent, loginStaff, registerGuestVisit } =
    useSiBK();
  const [activeTab, setActiveTab] = useState<GatewayTab>(() => settings.defaultGatewayTab || 'siswa');

  React.useEffect(() => {
    const allowed: GatewayTab[] = [];
    if (settings.showStudentTab) allowed.push('siswa');
    if (settings.showStaffTab) allowed.push('staff');
    if (settings.showGuestTab) allowed.push('tamu');
    if (allowed.length > 0 && !allowed.includes(activeTab)) {
      setActiveTab(allowed[0]);
    }
  }, [activeTab, settings.showGuestTab, settings.showStaffTab, settings.showStudentTab]);

  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [studentError, setStudentError] = useState('');

  const [staffIdInput, setStaffIdInput] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staffError, setStaffError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestCategory, setGuestCategory] = useState<VisitorCategory>('Wali Murid');
  const [relatedStudent, setRelatedStudent] = useState('');
  const [guestWa, setGuestWa] = useState('');
  const [guestTarget, setGuestTarget] = useState(db.staff[1]?.nama || db.staff[0]?.nama || '');
  const [guestPurpose, setGuestPurpose] = useState('');
  const [guestError, setGuestError] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<GuestVisit | null>(null);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [ticketQrUrl, setTicketQrUrl] = useState<string>('');
  const [qrAutoFilledNotice, setQrAutoFilledNotice] = useState<string>('');

  const today = getTodayISO();
  const availableCounselors = db.staff.filter(
    (s) => s.statusKetersediaan === 'Tersedia'
  ).length;
  const todayGuestCount = db.guests.filter((g) => g.tanggal === today).length;

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');
    if (!nis.trim() || !nisn.trim()) {
      setStudentError('Harap isi NIS dan NISN Anda.');
      return;
    }
    const res = loginStudent(nis, nisn);
    if (!res.ok && res.error) {
      setStudentError(res.error);
    }
  };

  const fillDemoStudent = () => {
    const demo = db.students[0];
    if (demo) {
      setNis(demo.nis);
      setNisn(demo.nisn);
      setStudentError('');
    }
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    if (!staffIdInput.trim() || !staffPassword.trim()) {
      setStaffError('Harap isi NIP / Username dan Password.');
      return;
    }
    const res = loginStaff(staffIdInput, staffPassword);
    if (!res.ok && res.error) {
      setStaffError(res.error);
    }
  };

  const fillDemoGuruBK = () => {
    const guru = db.staff.find((s) => s.role === 'guru_bk') || db.staff[1];
    if (guru) {
      setStaffIdInput(guru.username);
      setStaffPassword(guru.password);
      setStaffError('');
    }
  };

  const fillDemoAdmin = () => {
    const admin = db.staff.find((s) => s.role === 'admin') || db.staff[0];
    if (admin) {
      setStaffIdInput(admin.username);
      setStaffPassword(admin.password);
      setStaffError('');
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError('');
    if (!guestName.trim() || !guestWa.trim() || !guestPurpose.trim() || !guestTarget) {
      setGuestError('Mohon lengkapi nama, nomor WhatsApp, pihak dituju, dan keperluan.');
      return;
    }
    if (guestCategory === 'Wali Murid' && !relatedStudent.trim()) {
      setGuestError('Mohon cantumkan Nama Siswa Terkait untuk kategori Wali Murid.');
      return;
    }

    const ticket = registerGuestVisit({
      namaLengkap: guestName,
      kategori: guestCategory,
      namaSiswaTerkait: guestCategory === 'Wali Murid' ? relatedStudent : relatedStudent || undefined,
      noWhatsApp: guestWa,
      pihakDituju: guestTarget,
      keperluan: guestPurpose,
    });
    setIssuedTicket(ticket);
  };

  const resetGuestForm = () => {
    setIssuedTicket(null);
    setTicketQrUrl('');
    setGuestName('');
    setRelatedStudent('');
    setGuestWa('');
    setGuestPurpose('');
    setGuestError('');
    setQrAutoFilledNotice('');
  };

  React.useEffect(() => {
    if (!issuedTicket) {
      setTicketQrUrl('');
      return;
    }
    let cancelled = false;
    generateQrDataUrl(buildGuestTicketPayload(issuedTicket))
      .then((url) => {
        if (!cancelled) setTicketQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setTicketQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [issuedTicket]);

  const handleQrCheckInParsed = (data: ParsedGuestQrCheckIn, autoSubmit: boolean) => {
    const matchedTarget =
      staffOptions.find((opt) => opt.toLowerCase() === data.pihakDituju.toLowerCase()) ||
      staffOptions.find((opt) =>
        opt.toLowerCase().includes(data.pihakDituju.toLowerCase())
      ) ||
      staffOptions[0] ||
      data.pihakDituju;

    if (autoSubmit) {
      const ticket = registerGuestVisit({
        namaLengkap: data.namaLengkap,
        kategori: data.kategori,
        namaSiswaTerkait: data.namaSiswaTerkait,
        noWhatsApp: data.noWhatsApp || '-',
        pihakDituju: matchedTarget,
        keperluan: data.keperluan,
      });
      setIssuedTicket(ticket);
      setGuestError('');
      setQrAutoFilledNotice('');
    } else {
      setGuestName(data.namaLengkap);
      setGuestCategory(data.kategori);
      setRelatedStudent(data.namaSiswaTerkait || '');
      setGuestWa(data.noWhatsApp === '-' ? '' : data.noWhatsApp);
      setGuestTarget(matchedTarget);
      setGuestPurpose(data.keperluan);
      setGuestError('');
      setQrAutoFilledNotice(
        `Data dari QR "${data.namaLengkap}" berhasil diisi otomatis. Periksa lalu klik Simpan & Masuk.`
      );
    }
  };

  const staffOptions = [
    ...db.staff.map((s) => `${s.nama}`),
    ...settings.extraGuestTargets,
  ];

  const enabledTabsCount =
    (settings.showStudentTab ? 1 : 0) +
    (settings.showStaffTab ? 1 : 0) +
    (settings.showGuestTab ? 1 : 0);
  const tabGridClass =
    enabledTabsCount === 3
      ? 'grid-cols-3'
      : enabledTabsCount === 2
        ? 'grid-cols-2'
        : 'grid-cols-1';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="no-print bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                {settings.appName}
              </span>
              <span className="hidden md:inline text-slate-300 dark:text-slate-700 mx-2" aria-hidden="true">
                |
              </span>
              <span className="hidden md:inline text-sm text-slate-600 dark:text-slate-300 font-medium">
                {settings.appTagline}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-slate-500 dark:text-slate-400">
              {settings.schoolName}
            </span>
            {settings.showThemeSwitcher && <ThemeSwitcher />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div
          className={`${
            settings.showHeroShowcase ? 'max-w-6xl grid-cols-1 lg:grid-cols-12' : 'max-w-2xl grid-cols-1'
          } w-full grid bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/5 overflow-hidden`}
        >
          {/* Left Colorful Gradient Showcase Panel */}
          {settings.showHeroShowcase && (
          <div className="no-print lg:col-span-5 sibk-gradient-hero text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 15% 15%, rgba(255,255,255,0.45) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.3) 0%, transparent 40%)',
              }}
            />

            <div className="relative z-10">
              <p className="text-xs font-semibold text-white/85 tracking-wide mb-3">
                {settings.heroBadge}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white [text-wrap:balance]">
                {settings.heroTitle}
              </h1>
              <p className="mt-4 text-sm text-white/90 leading-relaxed">
                {settings.heroDescription}
              </p>

              <div className="mt-7 space-y-3.5 border-t border-white/20 pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Portal Pengajuan Siswa</h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      Ajukan konseling pribadi, belajar, karir, atau mediasi secara aman.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Manajemen Data & Rekam Jejak</h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      Seleksi massal, edit, hapus, ekspor CSV/JSON, serta impor data cepat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs text-white flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpenCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Buku Tamu Digital Instan</h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      Check-in wali murid & tamu instansi dengan kartu antrean siap cetak.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Theme Palette Strip + Live Stats */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/20 space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-white/80 mb-2">
                  Ganti Tema Warna Cepat
                </p>
                <div className="flex items-center gap-2">
                  {SIBK_THEMES.map((t) => {
                    const active = t.id === theme;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        title={t.name}
                        aria-label={`Pilih tema ${t.name}`}
                        className={`w-8 h-8 rounded-xl transition-transform ${
                          active
                            ? 'ring-2 ring-white scale-110 shadow-md'
                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${t.swatchColors[0]}, ${t.swatchColors[1]}, ${t.swatchColors[2]})`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {settings.showStatsOnGateway && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/15">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-white/80">
                      <Users className="w-3.5 h-3.5" />
                      <span>Guru BK Tersedia</span>
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono-tabular text-white">
                      {availableCounselors} / {db.staff.length}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-white/80">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tamu Hari Ini</span>
                    </div>
                    <p className="mt-1 text-xl font-bold font-mono-tabular text-white">
                      {todayGuestCount} Kunjungan
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Right Interactive Tab Panel */}
          <div className={`${settings.showHeroShowcase ? 'lg:col-span-7' : ''} p-6 sm:p-10 flex flex-col justify-between bg-white dark:bg-slate-900`}>
            <div>
              {/* Segmented Tabs */}
              <div
                className={`no-print grid ${tabGridClass} gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8`}
                role="tablist"
                aria-label="Pilih akses masuk"
              >
                {settings.showStudentTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'siswa'}
                    onClick={() => setActiveTab('siswa')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'siswa'
                        ? 'sibk-btn-primary shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Login Siswa</span>
                  </button>
                )}
                {settings.showStaffTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'staff'}
                    onClick={() => setActiveTab('staff')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'staff'
                        ? 'sibk-btn-primary shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">Guru BK / Admin</span>
                  </button>
                )}
                {settings.showGuestTab && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'tamu'}
                    onClick={() => setActiveTab('tamu')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'tamu'
                        ? 'sibk-btn-primary shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4 shrink-0" />
                    <span>Buku Tamu</span>
                  </button>
                )}
              </div>

              {/* TAB 1: LOGIN SISWA */}
              {activeTab === 'siswa' && (
                <div>
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      Masuk Portal Siswa
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Gunakan NIS dan NISN terdaftar untuk mengajukan konseling atau memantau jadwal.
                    </p>
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="student-nis"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Nomor Induk Siswa (NIS)
                      </label>
                      <input
                        id="student-nis"
                        type="text"
                        value={nis}
                        onChange={(e) => setNis(e.target.value)}
                        placeholder="Contoh: 2024001"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-mono-tabular text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="student-nisn"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Nomor Induk Siswa Nasional (NISN)
                      </label>
                      <input
                        id="student-nisn"
                        type="text"
                        value={nisn}
                        onChange={(e) => setNisn(e.target.value)}
                        placeholder="Contoh: 0074129811"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-mono-tabular text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    {studentError && (
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                        {studentError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all"
                    >
                      <span>Masuk ke Portal Siswa</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {settings.showDemoLoginButtons && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={fillDemoStudent}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Isi Data Demo Siswa</span>
                      </button>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Demo: Aulia Rahma Putri · XII IPA 1
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LOGIN GURU BK / ADMIN */}
              {activeTab === 'staff' && (
                <div>
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      Masuk Staf BK & Administrator
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Kelola antrean siswa, rekam jejak konseling, impor/ekspor data, dan tamu.
                    </p>
                  </div>

                  <form onSubmit={handleStaffSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="staff-quick-pick"
                        className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5"
                      >
                        Pilih Cepat Akun Guru BK / Admin (Opsional)
                      </label>
                      <select
                        id="staff-quick-pick"
                        value=""
                        onChange={(e) => {
                          const picked = db.staff.find((g) => g.id === e.target.value);
                          if (picked) {
                            setStaffIdInput(picked.username);
                            setStaffPassword(picked.password);
                            setStaffError('');
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:border-teal-500 focus:outline-none"
                      >
                        <option value="">-- Pilih Nama Guru BK untuk Isi Otomatis --</option>
                        {db.staff.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama} ({g.role === 'admin' ? 'Admin Utama' : 'Guru BK'} · @{g.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="staff-id"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Nama, NIP, atau Username
                      </label>
                      <input
                        id="staff-id"
                        type="text"
                        value={staffIdInput}
                        onChange={(e) => setStaffIdInput(e.target.value)}
                        placeholder="Contoh: daviq, ida, atau Dra. Ida Sulistyani"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="staff-pass"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
                      >
                        Kata Sandi (Password)
                      </label>
                      <div className="relative">
                        <input
                          id="staff-pass"
                          type={showPassword ? 'text' : 'password'}
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder="Masukkan kata sandi (demo: 123)"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-11 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                          aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {staffError && (
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                        {staffError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all"
                    >
                      <span>Masuk ke Dashboard BK</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {settings.showDemoLoginButtons && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={fillDemoGuruBK}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 px-3.5 py-2 text-xs font-semibold text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Isi Data Demo Guru BK</span>
                        </button>
                        <button
                          type="button"
                          onClick={fillDemoAdmin}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-3.5 py-2 text-xs font-semibold text-violet-800 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Isi Demo Admin Utama</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tersedia {db.staff.length} akun Guru BK terdaftar (sandi demo:{' '}
                        <span className="font-mono-tabular font-semibold">123</span>). Pilih nama
                        pada daftar di atas atau klik tombol demo.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BUKU TAMU / UMUM */}
              {activeTab === 'tamu' && !issuedTicket && (
                <div>
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                        Buku Tamu Digital (Tanpa Akun)
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {settings.enableQrScanner
                          ? 'Isi formulir atau pindai QR Code tamu untuk check-in instan.'
                          : 'Registrasi cepat untuk Orang Tua/Wali Murid, Tamu Instansi, Alumni, atau Umum.'}
                      </p>
                    </div>
                    {settings.enableQrScanner && (
                      <button
                        type="button"
                        onClick={() => setQrScannerOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 px-4 py-2.5 text-xs font-bold text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors shrink-0 shadow-2xs"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Scan QR Check-In</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Walk-In QR Check-in Strip */}
                  {settings.enableQrScanner && (
                    <div className="mb-4 rounded-2xl border border-teal-200/80 dark:border-teal-800/70 bg-gradient-to-r from-teal-50/80 via-emerald-50/70 to-sky-50/70 dark:from-teal-950/40 dark:via-emerald-950/30 dark:to-sky-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">
                            Punya Kartu Undangan / QR Tamu?
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Scan kode QR lewat kamera atau unggah gambar QR agar data terisi otomatis.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQrScannerOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl sibk-btn-primary px-3.5 py-2 text-xs font-semibold shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Buka Pemindai QR</span>
                      </button>
                    </div>
                  )}

                  {qrAutoFilledNotice && (
                    <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{qrAutoFilledNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handleGuestSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="guest-name"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nama Lengkap Pengunjung
                        </label>
                        <input
                          id="guest-name"
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Nama lengkap sesuai identitas"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="guest-category"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Kategori Pengunjung
                        </label>
                        <select
                          id="guest-category"
                          value={guestCategory}
                          onChange={(e) => setGuestCategory(e.target.value as VisitorCategory)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="Wali Murid">Wali Murid</option>
                          <option value="Instansi/Dinas">Instansi/Dinas</option>
                          <option value="Alumni">Alumni</option>
                          <option value="Umum">Umum</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="guest-student"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nama Siswa Terkait{' '}
                          <span className="font-normal text-slate-400">
                            {guestCategory === 'Wali Murid' ? '(Wajib)' : '(Opsional)'}
                          </span>
                        </label>
                        <input
                          id="guest-student"
                          type="text"
                          list="student-names-list"
                          value={relatedStudent}
                          onChange={(e) => setRelatedStudent(e.target.value)}
                          placeholder="Contoh: Aulia Rahma Putri"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                        />
                        <datalist id="student-names-list">
                          {db.students.map((s) => (
                            <option key={s.id} value={`${s.nama} (${s.kelas})`} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label
                          htmlFor="guest-wa"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Nomor WhatsApp
                        </label>
                        <input
                          id="guest-wa"
                          type="tel"
                          value={guestWa}
                          onChange={(e) => setGuestWa(e.target.value)}
                          placeholder="0812xxxxxxxx"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="guest-target"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Pihak / Guru BK yang Ditemui
                      </label>
                      <select
                        id="guest-target"
                        value={guestTarget}
                        onChange={(e) => setGuestTarget(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        {staffOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="guest-purpose"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Uraian Kepentingan
                      </label>
                      <textarea
                        id="guest-purpose"
                        rows={2}
                        value={guestPurpose}
                        onChange={(e) => setGuestPurpose(e.target.value)}
                        placeholder="Tuliskan tujuan kunjungan Anda secara singkat..."
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
                      />
                    </div>

                    {guestError && (
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                        {guestError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all"
                    >
                      <span>Simpan & Masuk</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3 RESULT: KARTU BUKTI KUNJUNGAN DIGITAL */}
              {activeTab === 'tamu' && issuedTicket && (
                <div className="print-container">
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-emerald-200/70 dark:border-emerald-800/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Registrasi Tamu Tercatat</span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-1">
                          Kartu Bukti Kunjungan Digital
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {settings.schoolName} · Layanan Terpadu {settings.appName}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {settings.showQrOnGuestTicket && ticketQrUrl && (
                          <div className="bg-white rounded-xl p-1.5 border border-emerald-200 shadow-xs text-center">
                            <img
                              src={ticketQrUrl}
                              alt={`QR Antrean ${issuedTicket.nomorAntrean}`}
                              className="w-16 h-16 object-contain"
                            />
                          </div>
                        )}
                        <div className="text-right bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-2.5 shadow-xs">
                          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Nomor Antrean
                          </span>
                          <span className="font-mono-tabular text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                            {issuedTicket.nomorAntrean}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Nama Pengunjung
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {issuedTicket.namaLengkap}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Kategori
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {issuedTicket.kategori}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Tanggal & Jam Masuk
                        </span>
                        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                          {formatTanggalID(issuedTicket.tanggal)} · {issuedTicket.jamMasuk} WIB
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          No. WhatsApp
                        </span>
                        <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                          {issuedTicket.noWhatsApp}
                        </span>
                      </div>
                      {issuedTicket.namaSiswaTerkait && (
                        <div className="col-span-2">
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            Siswa Terkait
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {issuedTicket.namaSiswaTerkait}
                          </span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Pihak / Guru BK Dituju
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {issuedTicket.pihakDituju}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          Uraian Kepentingan
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 text-xs mt-0.5 leading-relaxed">
                          {issuedTicket.keperluan}
                        </p>
                      </div>
                    </div>

                    <div className="no-print mt-6 pt-4 border-t border-emerald-200/70 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl sibk-btn-primary px-4 py-2.5 text-xs font-semibold"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Kartu Bukti</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetGuestForm}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Daftarkan Tamu Baru</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="no-print mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{settings.serviceHoursNote}</span>
              <span className="font-mono-tabular">{settings.footerLabel}</span>
            </div>
          </div>
        </div>
      </main>

      <GuestQrScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        defaultCounselor={staffOptions[0] || 'Guru BK'}
        mode="kiosk"
        defaultAutoSubmit={settings.defaultQrAutoCheckIn}
        onCheckInParsed={handleQrCheckInParsed}
      />
    </div>
  );
};
