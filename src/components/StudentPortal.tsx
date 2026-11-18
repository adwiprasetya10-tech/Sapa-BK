import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { formatTanggalID } from '../data/seedData';
import { CounselingCategory, UrgencyLevel } from '../types/sibk';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ClassSecretarySection } from './student/ClassSecretarySection';
import { StudentAttendanceSection } from './student/StudentAttendanceSection';
import { StudentChatSection } from './student/StudentChatSection';

const SERVICE_CATEGORIES: CounselingCategory[] = [
  'Konseling Pribadi',
  'Konseling Sosial',
  'Konseling Belajar',
  'Perencanaan Karir',
  'Mediasi Masalah',
  'Permohonan Surat/Izin',
];

type StudentTab = 'counseling' | 'attendance' | 'chat' | 'secretary';

export const StudentPortal: React.FC = () => {
  const {
    db,
    settings,
    updateSettings,
    currentStudent,
    logout,
    submitCounselingRequest,
    openStudentInfo,
  } = useSiBK();
  const urgencyLevels: UrgencyLevel[] = settings.allowSecretUrgency
    ? ['Normal', 'Segera', 'Mendesak (Rahasia)']
    : ['Normal', 'Segera'];

  const counselors = db.staff.filter((s) => s.role === 'guru_bk' || s.role === 'admin');
  const defaultCounselor =
    counselors.find((g) => g.id === currentStudent?.guruBkId)?.id ||
    counselors[0]?.id ||
    '';

  const [activeTab, setActiveTab] = useState<StudentTab>('counseling');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const [jenisKeperluan, setJenisKeperluan] =
    useState<CounselingCategory>('Konseling Pribadi');
  const [guruTujuanId, setGuruTujuanId] = useState(defaultCounselor);
  const [tingkatUrgensi, setTingkatUrgensi] = useState<UrgencyLevel>('Normal');
  const [ceritaSingkat, setCeritaSingkat] = useState('');
  const [usulanWaktu, setUsulanWaktu] = useState('');
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  useEffect(() => {
    if (activeTab === 'secretary' && !currentStudent?.isSekretarisKelas) {
      setActiveTab('counseling');
    }
  }, [activeTab, currentStudent?.isSekretarisKelas]);

  if (!currentStudent) return null;

  const myAdvisor = db.staff.find((g) => g.id === currentStudent.guruBkId);
  const myRequests = db.requests.filter((r) => r.studentId === currentStudent.id);
  const filteredRequests =
    filterStatus === 'Semua'
      ? myRequests
      : myRequests.filter((r) => r.status === filterStatus);

  const unreadChatCount = db.chats.filter(
    (c) =>
      c.studentId === currentStudent.id &&
      c.senderRole === 'staff' &&
      !c.readByStudent
  ).length;

  const navItems: {
    id: StudentTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    highlight?: boolean;
  }[] = [
    {
      id: 'counseling',
      label: 'Layanan Konseling',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'attendance',
      label: 'Info Kehadiran & Foto',
      icon: <Camera className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'chat',
      label: 'Chat Guru BK',
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
    ...(currentStudent.isSekretarisKelas
      ? [
          {
            id: 'secretary' as StudentTab,
            label: 'Input Absensi Kelas',
            icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
            highlight: true,
          },
        ]
      : []),
  ];

  const activeTitle =
    navItems.find((item) => item.id === activeTab)?.label || 'Portal Siswa';

  const handleSelectTab = (tab: StudentTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleOpenProfile = () => {
    setMobileMenuOpen(false);
    openStudentInfo(currentStudent.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!guruTujuanId || !ceritaSingkat.trim() || !usulanWaktu.trim()) {
      setFormError('Mohon lengkapi guru tujuan, cerita/keperluan, dan usulan waktu pertemuan.');
      return;
    }

    submitCounselingRequest({
      jenisKeperluan,
      guruTujuanId,
      tingkatUrgensi,
      ceritaSingkat,
      usulanWaktu,
    });

    setCeritaSingkat('');
    setUsulanWaktu('');
    setTingkatUrgensi('Normal');
  };

  const renderSidebarContent = (isDrawer: boolean) => (
    <>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size="md" />
          <div className="min-w-0">
            <span className="font-display font-bold text-base text-slate-900 dark:text-white block leading-tight truncate">
              {settings.appName} Siswa
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
              {settings.schoolName}
            </span>
          </div>
        </div>
        {isDrawer && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu siswa"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Student Identity Card in Left Sidebar */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenProfile}
              title="Klik untuk lihat informasi lengkap siswa"
              className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
            >
              {currentStudent.linkFoto ? (
                <img
                  src={currentStudent.linkFoto}
                  alt={currentStudent.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={handleOpenProfile}
                title="Klik untuk lihat informasi lengkap siswa"
                className="font-display text-sm font-bold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 truncate block text-left w-full"
              >
                {currentStudent.nama}
              </button>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  title="Klik untuk lihat informasi lengkap siswa"
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2"
                >
                  {currentStudent.kelas}
                </button>
                {currentStudent.noAbsen && (
                  <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    Absen {currentStudent.noAbsen}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/70">
            <span>NIS: {currentStudent.nis}</span>
            <span>·</span>
            <span>NISN: {currentStudent.nisn}</span>
          </div>

          {currentStudent.isSekretarisKelas && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
              <ShieldCheck className="w-3 h-3" />
              <span>Sekretaris Kelas</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto" aria-label="Navigasi Portal Siswa">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'sibk-btn-primary shadow-sm font-semibold'
                  : item.highlight
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/70 text-teal-800 dark:text-teal-200 hover:bg-teal-100/80 dark:hover:bg-teal-900/50'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center font-mono-tabular ${
                    active ? 'bg-white/25 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleOpenProfile}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">Profil Lengkap Saya</span>
        </button>
      </nav>

      {/* Bottom Advisor Info + Privacy + Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/70 dark:bg-slate-900/80">
        {myAdvisor && (
          <div className="text-xs">
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">
              Guru BK Pembimbing
            </span>
            <span className="font-semibold text-slate-900 dark:text-white block truncate mt-0.5">
              {myAdvisor.nama}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl font-medium">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Privasi Konseling Terjaga</span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (auto-hidden on HP & Tablet < lg, also collapsible on desktop) */}
      {!desktopSidebarCollapsed && (
        <aside className="no-print hidden lg:flex lg:w-[272px] lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
          {renderSidebarContent(false)}
        </aside>
      )}

      {/* Mobile & Tablet Auto-Hide Slide-Over Drawer (< 1024px) */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-2xl border-r border-slate-200 dark:border-slate-800">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all ${
          desktopSidebarCollapsed ? 'lg:pl-0' : 'lg:pl-[272px]'
        }`}
      >
        {/* Sticky Top Context Bar */}
        <header className="no-print bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Hamburger Menu for HP & Tablet (auto-hide mode) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
              aria-label="Buka menu dashboard siswa"
            >
              <Menu className="w-5 h-5" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Optional Sidebar Collapse/Expand on Desktop */}
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((prev) => !prev)}
              title={desktopSidebarCollapsed ? 'Tampilkan Sidebar Kiri' : 'Sembunyikan Sidebar Kiri'}
              aria-label={desktopSidebarCollapsed ? 'Tampilkan Sidebar Kiri' : 'Sembunyikan Sidebar Kiri'}
              className="hidden lg:inline-flex p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            >
              {desktopSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline font-medium">{settings.appName}</span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
                  /
                </span>
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {activeTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs truncate">
                <button
                  type="button"
                  onClick={() => openStudentInfo(currentStudent.id)}
                  title="Klik untuk lihat informasi lengkap siswa"
                  className="font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 truncate"
                >
                  {currentStudent.nama}
                </button>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => openStudentInfo(currentStudent.id)}
                  title="Klik untuk lihat informasi lengkap siswa"
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2 shrink-0"
                >
                  {currentStudent.kelas}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  enableSoundNotification: !settings.enableSoundNotification,
                })
              }
              title={
                settings.enableSoundNotification
                  ? 'Suara Notifikasi Aktif (Klik untuk senyapkan)'
                  : 'Suara Notifikasi Senyap (Klik untuk aktifkan)'
              }
              aria-label="Toggle suara notifikasi"
              className={`p-2 rounded-xl border transition-colors ${
                settings.enableSoundNotification
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {settings.enableSoundNotification ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            {settings.showThemeSwitcher && <ThemeSwitcher />}
            <button
              type="button"
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {unreadChatCount > 0 && activeTab !== 'chat' && (
            <div className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-teal-50/90 dark:bg-teal-950/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-teal-700 dark:text-teal-300 shrink-0" />
                <p className="text-xs sm:text-sm font-medium text-teal-900 dark:text-teal-100">
                  Anda memiliki <span className="font-bold">{unreadChatCount} pesan baru</span> belum dibaca dari Guru BK.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('chat')}
                className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-3.5 py-2 text-xs font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Buka Chat Sekarang</span>
              </button>
            </div>
          )}

          {activeTab === 'attendance' && <StudentAttendanceSection />}

          {activeTab === 'chat' && <StudentChatSection />}

          {activeTab === 'secretary' && currentStudent.isSekretarisKelas && (
            <ClassSecretarySection />
          )}

          {activeTab === 'counseling' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Form Pengajuan Layanan */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Ajukan Layanan / Konseling
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sampaikan kebutuhan bimbingan Anda. Seluruh informasi dijaga kerahasiaannya.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="req-category"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Jenis Keperluan
              </label>
              <select
                id="req-category"
                value={jenisKeperluan}
                onChange={(e) => setJenisKeperluan(e.target.value as CounselingCategory)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-counselor"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Pilih Guru BK Tujuan
              </label>
              <select
                id="req-counselor"
                value={guruTujuanId}
                onChange={(e) => setGuruTujuanId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                {counselors.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} — [{g.statusKetersediaan}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Tingkat Urgensi
              </span>
              <div className={`grid ${urgencyLevels.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                {urgencyLevels.map((lvl) => {
                  const active = tingkatUrgensi === lvl;
                  const isMendesak = lvl === 'Mendesak (Rahasia)';
                  const isSegera = lvl === 'Segera';
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTingkatUrgensi(lvl)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                        active
                          ? isMendesak
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300'
                            : isSegera
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-800 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="req-story"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Cerita Singkat / Keperluan
              </label>
              <textarea
                id="req-story"
                rows={4}
                value={ceritaSingkat}
                onChange={(e) => setCeritaSingkat(e.target.value)}
                placeholder="Ceritakan secara singkat hal yang ingin Anda konsultasikan atau surat izin yang dibutuhkan..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="req-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Usulan Waktu Pertemuan
              </label>
              <input
                id="req-time"
                type="text"
                value={usulanWaktu}
                onChange={(e) => setUsulanWaktu(e.target.value)}
                placeholder="Contoh: Besok jam istirahat ke-2 (12:00 WIB)"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Pengajuan Konseling</span>
            </button>
          </form>
        </section>

        {/* Right: Riwayat & Status Pengajuan */}
        <section className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Riwayat & Status Pengajuan
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Total {myRequests.length} permohonan layanan tercatat atas nama Anda.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-center">
                {['Semua', 'Menunggu Konfirmasi', 'Dijadwalkan', 'Selesai'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      filterStatus === st
                        ? 'sibk-btn-primary shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'Menunggu Konfirmasi' ? 'Menunggu' : st}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Belum ada pengajuan pada kategori ini
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Gunakan formulir di sebelah kiri untuk mengajukan sesi bimbingan bersama Guru BK.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRequests.map((req) => {
                  const targetGuru = db.staff.find((g) => g.id === req.guruTujuanId);
                  const statusConfig = {
                    'Menunggu Konfirmasi': {
                      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
                      textColor: 'text-amber-800 dark:text-amber-300',
                      bgColor: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
                    },
                    Dijadwalkan: {
                      icon: <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
                      textColor: 'text-sky-800 dark:text-sky-300',
                      bgColor: 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
                    },
                    Selesai: {
                      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                      textColor: 'text-emerald-800 dark:text-emerald-300',
                      bgColor: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
                    },
                  }[req.status];

                  return (
                    <article key={req.id} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span className="font-mono-tabular">
                              {formatTanggalID(req.tanggalPengajuan)} · {req.jamPengajuan} WIB
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                req.tingkatUrgensi === 'Mendesak (Rahasia)'
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-1'
                                  : req.tingkatUrgensi === 'Segera'
                                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                  : 'text-slate-600 dark:text-slate-300 font-medium'
                              }
                            >
                              {req.tingkatUrgensi === 'Mendesak (Rahasia)' && (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              )}
                              Urgensi: {req.tingkatUrgensi}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                            {req.jenisKeperluan}
                          </h3>
                        </div>

                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.textColor}`}
                        >
                          {statusConfig.icon}
                          <span>{req.status}</span>
                        </div>
                      </div>

                      <p className="mt-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {req.ceritaSingkat}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Guru BK: {targetGuru?.nama || '-'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Usulan: {req.usulanWaktu}</span>
                        </span>
                      </div>

                      {(req.jadwalTanggal || req.catatanGuru) && (
                        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                          {req.jadwalTanggal && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Jadwal: {formatTanggalID(req.jadwalTanggal)} · {req.jadwalJam} WIB
                              </span>
                              {req.ruangPertemuan && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {req.ruangPertemuan}
                                </span>
                              )}
                            </div>
                          )}
                          {req.catatanGuru && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                Balasan Guru BK:{' '}
                              </span>
                              {req.catatanGuru}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};
