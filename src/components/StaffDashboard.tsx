import React, { useState } from 'react';
import {
  BookOpenCheck,
  ClipboardCheck,
  Database,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { CounselingRequest } from '../types/sibk';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitcher } from './ThemeSwitcher';
import { AttendanceMonitorTab } from './dashboard/AttendanceMonitorTab';
import { ChatCenterTab } from './dashboard/ChatCenterTab';
import { GuestMonitorTab } from './dashboard/GuestMonitorTab';
import { MasterExportTab } from './dashboard/MasterExportTab';
import { OverviewTab } from './dashboard/OverviewTab';
import { QueueInboxTab } from './dashboard/QueueInboxTab';
import { SettingsTab } from './dashboard/SettingsTab';
import { StudentNotesTab } from './dashboard/StudentNotesTab';

type DashboardMenu =
  | 'overview'
  | 'queue'
  | 'notes'
  | 'attendance'
  | 'chat'
  | 'guests'
  | 'master'
  | 'settings';

export const StaffDashboard: React.FC = () => {
  const { db, currentStaff, settings, updateSettings, logout, toggleStaffAvailability } =
    useSiBK();
  const [activeMenu, setActiveMenu] = useState<DashboardMenu>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [prefillRequestForNote, setPrefillRequestForNote] =
    useState<CounselingRequest | null>(null);

  if (!currentStaff) return null;

  const isAdmin = currentStaff.role === 'admin';
  const scopedStudentIds = new Set(
    isAdmin
      ? db.students.map((s) => s.id)
      : db.students.filter((s) => s.guruBkId === currentStaff.id).map((s) => s.id)
  );

  const pendingQueueCount = db.requests.filter((r) => {
    const inScope = isAdmin || r.guruTujuanId === currentStaff.id;
    return inScope && r.status === 'Menunggu Konfirmasi';
  }).length;

  const pendingAttendanceCount = db.studentAttendances.filter(
    (a) =>
      (isAdmin || scopedStudentIds.has(a.studentId)) &&
      a.statusVerifikasi === 'Menunggu Verifikasi'
  ).length;

  const unreadChatCount = db.chats.filter(
    (c) =>
      c.senderRole === 'student' &&
      !c.readByStaff &&
      (isAdmin || c.staffId === currentStaff.id)
  ).length;

  const navItems: {
    id: DashboardMenu;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Ringkasan Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'queue',
      label: 'Kotak Masuk & Antrean',
      icon: <Inbox className="w-4 h-4 shrink-0" />,
      badge:
        settings.showSidebarQueueBadge && pendingQueueCount > 0
          ? pendingQueueCount
          : undefined,
    },
    {
      id: 'notes',
      label: 'Catatan & Rekam Jejak',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'attendance',
      label: 'Kehadiran & Sekretaris',
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      badge: pendingAttendanceCount > 0 ? pendingAttendanceCount : undefined,
    },
    {
      id: 'chat',
      label: 'Chat Siswa & BK',
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
    {
      id: 'guests',
      label: 'Monitoring Tamu Umum',
      icon: <BookOpenCheck className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'master',
      label: 'Data Master & Ekspor/Impor',
      icon: <Database className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings',
      label: 'Pengaturan Web & Sistem',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleSelectMenu = (menu: DashboardMenu) => {
    setActiveMenu(menu);
    setMobileMenuOpen(false);
  };

  const handleStartNoteFromRequest = (req: CounselingRequest) => {
    setPrefillRequestForNote(req);
    setActiveMenu('notes');
  };

  const activeTitle =
    navItems.find((n) => n.id === activeMenu)?.label || 'Dashboard';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-[272px] lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <BrandLogo size="md" />
          <div className="min-w-0">
            <span className="font-display font-bold text-base text-slate-900 dark:text-white block leading-tight truncate">
              {settings.appName} Panel
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
              {isAdmin ? 'Admin Utama BK' : 'Portal Guru BK'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto" aria-label="Menu Dashboard">
          {navItems.map((item) => {
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectMenu(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'sibk-btn-primary shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`font-mono-tabular text-xs font-bold ${
                      active ? 'text-white' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Staff Profile & Availability */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/70 dark:bg-slate-900/80">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {currentStaff.nama}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {currentStaff.jabatan}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            {(['Tersedia', 'Sedang Sesi'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStaffAvailability(currentStaff.id, status)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  currentStaff.statusKetersediaan === status
                    ? status === 'Tersedia'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandLogo size="sm" />
                <span className="font-display font-bold text-slate-900 dark:text-white truncate">
                  {settings.appName} Panel
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 dark:text-slate-400 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMenu(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? 'sibk-btn-primary font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="font-mono-tabular text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {currentStaff.nama}
              </p>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[272px] print:pl-0 flex flex-col min-w-0">
        {/* Top Context Bar */}
        <header className="no-print bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              <span className="hidden sm:inline">{settings.appName}</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {activeTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
              onClick={() => handleSelectMenu('settings')}
              title="Pengaturan Web & Sistem"
              aria-label="Buka Pengaturan Web & Sistem"
              className={`p-2 rounded-xl border transition-colors ${
                activeMenu === 'settings'
                  ? 'sibk-btn-primary border-transparent shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>{isAdmin ? 'Admin Utama' : 'Guru BK'}</span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                {currentStaff.nama}
              </span>
            </div>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 max-w-7xl print:max-w-none w-full mx-auto">
          {activeMenu === 'overview' && (
            <OverviewTab onNavigate={(menu) => handleSelectMenu(menu)} />
          )}
          {activeMenu === 'queue' && (
            <QueueInboxTab onStartNoteFromRequest={handleStartNoteFromRequest} />
          )}
          {activeMenu === 'notes' && (
            <StudentNotesTab
              prefillFromRequest={prefillRequestForNote}
              onClearPrefill={() => setPrefillRequestForNote(null)}
            />
          )}
          {activeMenu === 'attendance' && <AttendanceMonitorTab />}
          {activeMenu === 'chat' && <ChatCenterTab />}
          {activeMenu === 'guests' && <GuestMonitorTab />}
          {activeMenu === 'master' && <MasterExportTab />}
          {activeMenu === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
};
