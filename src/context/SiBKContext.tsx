import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createInitialDatabase,
  getCurrentTimeHHMM,
  getTodayISO,
} from '../data/seedData';
import {
  ActivityLog,
  AppSettings,
  AppThemeId,
  AttendanceVerifyStatus,
  AuthSession,
  AvailabilityStatus,
  ChatMessage,
  ClassAttendanceEntry,
  CounselingCategory,
  CounselingNote,
  CounselingRequest,
  DailyClassAttendance,
  GuestVisit,
  ProgressStatus,
  SiBKDatabase,
  StaffUser,
  Student,
  StudentAttendanceReport,
  StudentAttendanceStatus,
  ToastMessage,
  UrgencyLevel,
  VisitorCategory,
} from '../types/sibk';
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  SETTINGS_STORAGE_KEY,
} from '../utils/appSettings';
import {
  playNotificationSound,
  registerAudioUnlock,
  showBrowserTextNotification,
} from '../utils/soundNotifier';
import { getThemeMeta } from '../utils/themeRegistry';

const DB_STORAGE_KEY = 'sibk_database_v2';
const SESSION_STORAGE_KEY = 'sibk_session_v2';
const THEME_STORAGE_KEY = 'sibk_theme_v1';

interface SiBKContextValue {
  db: SiBKDatabase;
  session: AuthSession;
  theme: AppThemeId;
  setTheme: (themeId: AppThemeId) => void;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>, silent?: boolean) => void;
  replaceSettings: (next: AppSettings) => void;
  resetSettings: () => void;
  currentStudent: Student | null;
  currentStaff: StaffUser | null;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  loginStudent: (nis: string, nisn: string) => { ok: boolean; error?: string };
  loginStaff: (identifier: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  submitCounselingRequest: (payload: {
    jenisKeperluan: CounselingCategory;
    guruTujuanId: string;
    tingkatUrgensi: UrgencyLevel;
    ceritaSingkat: string;
    usulanWaktu: string;
  }) => void;
  scheduleRequest: (
    requestId: string,
    payload: {
      jadwalTanggal: string;
      jadwalJam: string;
      ruangPertemuan: string;
      catatanGuru: string;
    }
  ) => void;
  updateRequest: (requestId: string, updates: Partial<CounselingRequest>) => void;
  deleteRequests: (requestIds: string[]) => void;
  completeRequestsBulk: (requestIds: string[]) => void;
  transferRequest: (requestId: string, newGuruId: string, alasan: string) => void;
  completeRequest: (requestId: string, catatanGuru?: string) => void;
  addCounselingNote: (payload: {
    studentId: string;
    tanggal: string;
    jenisLayanan: CounselingCategory;
    deskripsiPermasalahan: string;
    hasilAsesmen: string;
    rencanaTindakLanjut: string;
    statusPerkembangan: ProgressStatus;
    isRahasia: boolean;
    requestId?: string;
  }) => void;
  updateCounselingNote: (noteId: string, updates: Partial<CounselingNote>) => void;
  deleteCounselingNote: (noteId: string) => void;
  registerGuestVisit: (payload: {
    namaLengkap: string;
    kategori: VisitorCategory;
    namaSiswaTerkait?: string;
    noWhatsApp: string;
    pihakDituju: string;
    keperluan: string;
  }) => GuestVisit;
  updateGuestVisit: (guestId: string, updates: Partial<GuestVisit>) => void;
  markGuestCompleted: (guestId: string) => void;
  completeGuestsBulk: (guestIds: string[]) => void;
  deleteGuests: (guestIds: string[]) => void;
  toggleStaffAvailability: (staffId: string, status: AvailabilityStatus) => void;
  upsertStudent: (student: Omit<Student, 'id'> & { id?: string }) => void;
  deleteStudent: (studentId: string) => void;
  deleteStudentsBulk: (studentIds: string[]) => void;
  upsertStaff: (staffMember: Omit<StaffUser, 'id'> & { id?: string }) => void;
  deleteStaff: (staffId: string) => void;
  deleteStaffBulk: (staffIds: string[]) => void;
  importStudents: (rows: Omit<Student, 'id'>[], mode: 'merge' | 'replace') => number;
  importGuests: (
    rows: Omit<GuestVisit, 'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'>[],
    mode: 'merge' | 'replace'
  ) => number;
  importFullBackup: (backupDb: SiBKDatabase, mode: 'merge' | 'replace') => void;
  resetDemoData: () => void;
  toggleStudentSecretaryAccess: (studentId: string, enabled: boolean) => void;
  submitStudentAttendance: (payload: {
    tanggal: string;
    status: StudentAttendanceStatus;
    keterangan: string;
    fotoLampiranDataUrl?: string;
    fotoLampiranName?: string;
  }) => void;
  verifyStudentAttendance: (
    reportId: string,
    statusVerifikasi: AttendanceVerifyStatus,
    catatanGuru?: string
  ) => void;
  deleteStudentAttendances: (reportIds: string[]) => void;
  saveDailyClassAttendance: (
    kelas: string,
    tanggal: string,
    entries: ClassAttendanceEntry[]
  ) => void;
  sendChatMessage: (payload: {
    studentId: string;
    staffId: string;
    senderRole: 'student' | 'staff';
    message: string;
    attachmentDataUrl?: string;
    attachmentName?: string;
  }) => void;
  markChatRead: (studentId: string, staffId: string, viewerRole: 'student' | 'staff') => void;
  testNotificationSound: () => void;
  selectedStudentInfoId: string | null;
  openStudentInfo: (studentId: string) => void;
  closeStudentInfo: () => void;
}

const SiBKContext = createContext<SiBKContextValue | null>(null);

function normalizeDatabase(rawDb: Partial<SiBKDatabase>): SiBKDatabase {
  const initial = createInitialDatabase();
  const initialById = new Map(initial.students.map((s) => [s.id, s]));
  const isFirstAttendanceMigration =
    !Array.isArray(rawDb.studentAttendances) &&
    !Array.isArray(rawDb.classAttendances) &&
    !Array.isArray(rawDb.chats);

  const baseStudents = Array.isArray(rawDb.students) ? rawDb.students : initial.students;
  const mergedRoster = isFirstAttendanceMigration
    ? (() => {
        const existingIds = new Set(baseStudents.map((s) => s.id));
        const extraClassmates = initial.students.filter((s) => !existingIds.has(s.id));
        return [
          ...baseStudents.map((s) =>
            s.id === 'std-1' && s.isSekretarisKelas === undefined
              ? { ...s, isSekretarisKelas: true }
              : s
          ),
          ...extraClassmates,
        ];
      })()
    : baseStudents;

  const students = mergedRoster.map((s) => {
    const seedMatch = initialById.get(s.id);
    if (!seedMatch) return s;
    return {
      ...s,
      noAbsen: s.noAbsen ?? seedMatch.noAbsen,
      ttl: s.ttl ?? seedMatch.ttl,
      email: s.email ?? seedMatch.email,
      noHp: s.noHp ?? seedMatch.noHp,
      linkFoto: s.linkFoto ?? seedMatch.linkFoto,
    };
  });

  return {
    students,
    staff: Array.isArray(rawDb.staff) ? rawDb.staff : initial.staff,
    requests: Array.isArray(rawDb.requests) ? rawDb.requests : initial.requests,
    notes: Array.isArray(rawDb.notes) ? rawDb.notes : initial.notes,
    guests: Array.isArray(rawDb.guests) ? rawDb.guests : initial.guests,
    activities: Array.isArray(rawDb.activities) ? rawDb.activities : initial.activities,
    studentAttendances: Array.isArray(rawDb.studentAttendances)
      ? rawDb.studentAttendances
      : initial.studentAttendances,
    classAttendances: Array.isArray(rawDb.classAttendances)
      ? rawDb.classAttendances
      : initial.classAttendances,
    chats: Array.isArray(rawDb.chats) ? rawDb.chats : initial.chats,
  };
}

function loadDatabase(): SiBKDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SiBKDatabase>;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.staff)) {
        const hasLegacyStaff = parsed.staff.some((s) =>
          ['staff-admin', 'staff-sari', 'staff-rizky', 'staff-nadia'].includes(s.id)
        );
        if (!hasLegacyStaff && parsed.staff.length > 0) {
          return normalizeDatabase(parsed);
        }
      }
    }
  } catch {
    // fallback
  }
  const initial = createInitialDatabase();
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function loadSession(): AuthSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthSession;
  } catch {
    // ignore
  }
  return null;
}

function loadTheme(): AppThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) as AppThemeId | null;
    if (raw && ['aurora', 'sunset', 'indigo', 'ocean', 'midnight'].includes(raw)) {
      return raw;
    }
  } catch {
    // ignore
  }
  return 'aurora';
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const SiBKProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<SiBKDatabase>(() => loadDatabase());
  const [session, setSession] = useState<AuthSession>(() => loadSession());
  const [theme, setThemeState] = useState<AppThemeId>(() => loadTheme());
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedStudentInfoId, setSelectedStudentInfoId] = useState<string | null>(null);

  const openStudentInfo = useCallback((studentId: string) => {
    setSelectedStudentInfoId(studentId);
  }, []);

  const closeStudentInfo = useCallback(() => {
    setSelectedStudentInfoId(null);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const meta = getThemeMeta(theme);
    if (meta.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore
    }
  }, [db]);

  useEffect(() => {
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [session]);

  useEffect(() => {
    saveAppSettings(settings);
    document.title = settings.appTagline
      ? `${settings.appName} — ${settings.appTagline}`
      : `${settings.appName} — ${settings.schoolName}`;
    document.documentElement.setAttribute('data-font', settings.fontPreset);

    if (settings.faviconSync) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      if (settings.webLogoDataUrl) {
        link.href = settings.webLogoDataUrl;
      } else {
        const themeColors = getThemeMeta(theme).swatchColors;
        const initial = (settings.appName || 'S').trim().charAt(0).toUpperCase();
        const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${themeColors[0]}"/><stop offset="100%" stop-color="${themeColors[1]}"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><text x="32" y="42" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="800" fill="#ffffff">${initial}</text></svg>`;
        link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgFavicon)}`;
      }
    }
  }, [settings, theme]);

  const dbRef = useRef(db);
  dbRef.current = db;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    registerAudioUnlock();
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = uid('toast');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DB_STORAGE_KEY && e.newValue) {
        try {
          const nextDb = normalizeDatabase(JSON.parse(e.newValue));
          const prevDb = dbRef.current;
          const activeSession = sessionRef.current;
          const cfg = settingsRef.current;

          // Detect newly arrived chat messages from the other party across tabs
          const prevChatIds = new Set(prevDb.chats.map((c) => c.id));
          const newChats = nextDb.chats.filter((c) => !prevChatIds.has(c.id));

          if (activeSession?.type === 'student') {
            const incomingForStudent = newChats.filter(
              (c) => c.studentId === activeSession.studentId && c.senderRole === 'staff'
            );
            if (incomingForStudent.length > 0) {
              const latest = incomingForStudent[incomingForStudent.length - 1];
              if (cfg.enableSoundNotification) playNotificationSound('chat');
              if (cfg.enableTextNotification) {
                pushToast({
                  type: 'info',
                  title: `Pesan Baru dari ${latest.senderName}`,
                  message: latest.message || 'Mengirim lampiran foto',
                });
              }
              if (cfg.enableBrowserNotification) {
                showBrowserTextNotification(
                  `${cfg.appName}: Pesan dari ${latest.senderName}`,
                  latest.message || 'Mengirim lampiran foto'
                );
              }
            }

            // Detect verified attendance update for this student
            const verifiedNow = nextDb.studentAttendances.find((att) => {
              if (att.studentId !== activeSession.studentId) return false;
              const prevAtt = prevDb.studentAttendances.find((p) => p.id === att.id);
              return (
                prevAtt &&
                prevAtt.statusVerifikasi !== att.statusVerifikasi &&
                att.statusVerifikasi !== 'Menunggu Verifikasi'
              );
            });
            if (verifiedNow) {
              if (cfg.enableSoundNotification) playNotificationSound('attendance');
              if (cfg.enableTextNotification) {
                pushToast({
                  type: 'success',
                  title: `Info Kehadiran ${verifiedNow.statusVerifikasi}`,
                  message: verifiedNow.catatanGuru || `Laporan tanggal ${verifiedNow.tanggal} telah diperiksa.`,
                });
              }
            }
          } else if (activeSession?.type === 'staff') {
            const staffUser = nextDb.staff.find((g) => g.id === activeSession.staffId);
            const isAdmin = staffUser?.role === 'admin';
            const incomingForStaff = newChats.filter(
              (c) =>
                c.senderRole === 'student' &&
                (isAdmin || c.staffId === activeSession.staffId)
            );
            if (incomingForStaff.length > 0) {
              const latest = incomingForStaff[incomingForStaff.length - 1];
              if (cfg.enableSoundNotification) playNotificationSound('chat');
              if (cfg.enableTextNotification) {
                pushToast({
                  type: 'info',
                  title: `Chat Siswa: ${latest.senderName}`,
                  message: latest.message || 'Mengirim lampiran foto',
                });
              }
              if (cfg.enableBrowserNotification) {
                showBrowserTextNotification(
                  `${cfg.appName}: Chat dari ${latest.senderName}`,
                  latest.message || 'Mengirim lampiran foto'
                );
              }
            }

            // Detect newly submitted student attendance reports across tabs
            const prevAttIds = new Set(prevDb.studentAttendances.map((a) => a.id));
            const newAtts = nextDb.studentAttendances.filter((a) => !prevAttIds.has(a.id));
            if (newAtts.length > 0) {
              const latestAtt = newAtts[0];
              const st = nextDb.students.find((s) => s.id === latestAtt.studentId);
              if (isAdmin || st?.guruBkId === activeSession.staffId) {
                if (cfg.enableSoundNotification) playNotificationSound('attendance');
                if (cfg.enableTextNotification) {
                  pushToast({
                    type: 'info',
                    title: `Info Kehadiran Baru (${latestAtt.status})`,
                    message: `${st?.nama || 'Siswa'} (${st?.kelas || '-'}) mengirim laporan kehadiran.`,
                  });
                }
                if (cfg.enableBrowserNotification) {
                  showBrowserTextNotification(
                    `${cfg.appName}: Info Kehadiran Baru`,
                    `${st?.nama || 'Siswa'} (${latestAtt.status})`
                  );
                }
              }
            }
          }

          setDb(nextDb);
        } catch {
          // ignore
        }
      }
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [pushToast]);

  const setTheme = useCallback(
    (themeId: AppThemeId) => {
      setThemeState(themeId);
      const meta = getThemeMeta(themeId);
      pushToast({
        type: 'info',
        title: `Tema: ${meta.name}`,
        message: meta.subtitle,
      });
    },
    [pushToast]
  );

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>, silent = true) => {
      setSettings((prev) => ({ ...prev, ...updates }));
      if (!silent) {
        pushToast({
          type: 'success',
          title: 'Pengaturan Sistem Disimpan',
          message: 'Perubahan diterapkan ke seluruh halaman secara langsung.',
        });
      }
    },
    [pushToast]
  );

  const replaceSettings = useCallback(
    (next: AppSettings) => {
      setSettings(next);
      pushToast({
        type: 'success',
        title: 'Pengaturan Diperbarui',
        message: 'Konfigurasi aplikasi telah diterapkan.',
      });
    },
    [pushToast]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_APP_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // ignore
    }
    pushToast({
      type: 'info',
      title: 'Pengaturan Direset ke Default',
      message: 'Logo web, identitas, dan konfigurasi dikembalikan ke setelan awal.',
    });
  }, [pushToast]);

  const currentStudent =
    session?.type === 'student'
      ? db.students.find((s) => s.id === session.studentId) || null
      : null;

  const currentStaff =
    session?.type === 'staff'
      ? db.staff.find((g) => g.id === session.staffId) || null
      : null;

  const appendActivity = (
    prev: SiBKDatabase,
    actor: string,
    type: ActivityLog['type'],
    description: string
  ): ActivityLog[] => {
    const entry: ActivityLog = {
      id: uid('act'),
      timestamp: getCurrentTimeHHMM(),
      tanggal: getTodayISO(),
      actor,
      type,
      description,
    };
    return [entry, ...prev.activities].slice(0, 30);
  };

  const loginStudent = useCallback(
    (nis: string, nisn: string) => {
      const found = db.students.find(
        (s) => s.nis === nis.trim() && s.nisn === nisn.trim()
      );
      if (!found) {
        pushToast({
          type: 'error',
          title: 'Login Siswa Gagal',
          message: 'Kombinasi NIS dan NISN tidak ditemukan pada data master siswa.',
        });
        return { ok: false, error: 'Kombinasi NIS dan NISN tidak sesuai.' };
      }
      setSession({ type: 'student', studentId: found.id });
      pushToast({
        type: 'success',
        title: `Selamat Datang, ${found.nama}`,
        message: `Masuk ke Portal Siswa · Kelas ${found.kelas}`,
      });
      const unreadChats = db.chats.filter(
        (c) => c.studentId === found.id && c.senderRole === 'staff' && !c.readByStudent
      );
      if (unreadChats.length > 0) {
        if (settings.enableSoundNotification) {
          playNotificationSound('chat');
        }
        if (settings.enableTextNotification) {
          const last = unreadChats[unreadChats.length - 1];
          pushToast({
            type: 'info',
            title: `${unreadChats.length} Pesan Baru dari ${last.senderName}`,
            message: last.message || 'Buka tab Chat Guru BK untuk membaca.',
          });
        }
      }
      return { ok: true };
    },
    [
      db.chats,
      db.students,
      pushToast,
      settings.enableSoundNotification,
      settings.enableTextNotification,
    ]
  );

  const loginStaff = useCallback(
    (identifier: string, password: string) => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();

      let found = db.staff.find(
        (g) =>
          (g.username.toLowerCase() === cleanId ||
            g.nip === cleanId ||
            g.nama.toLowerCase() === cleanId ||
            (cleanId === 'admin' && g.role === 'admin')) &&
          g.password === cleanPass
      );

      if (!found && cleanId.length >= 3) {
        const partialMatches = db.staff.filter(
          (g) => g.nama.toLowerCase().includes(cleanId) && g.password === cleanPass
        );
        if (partialMatches.length === 1) {
          found = partialMatches[0];
        }
      }

      if (!found) {
        pushToast({
          type: 'error',
          title: 'Login Staf Gagal',
          message: 'NIP/Username/Nama atau kata sandi tidak sesuai. (Sandi demo: 123)',
        });
        return { ok: false, error: 'NIP/Username/Nama atau kata sandi salah.' };
      }
      setSession({ type: 'staff', staffId: found.id });
      pushToast({
        type: 'success',
        title: `Berhasil Masuk`,
        message: `${found.nama} (${found.role === 'admin' ? 'Admin Utama' : 'Guru BK'})`,
      });
      const unreadForStaff = db.chats.filter(
        (c) =>
          c.senderRole === 'student' &&
          !c.readByStaff &&
          (found.role === 'admin' || c.staffId === found.id)
      );
      if (unreadForStaff.length > 0) {
        if (settings.enableSoundNotification) {
          playNotificationSound('chat');
        }
        if (settings.enableTextNotification) {
          pushToast({
            type: 'info',
            title: `${unreadForStaff.length} Pesan Siswa Belum Dibaca`,
            message: `Terbaru dari ${unreadForStaff[unreadForStaff.length - 1].senderName}.`,
          });
        }
      }
      return { ok: true };
    },
    [
      db.chats,
      db.staff,
      pushToast,
      settings.enableSoundNotification,
      settings.enableTextNotification,
    ]
  );

  const logout = useCallback(() => {
    setSession(null);
    pushToast({
      type: 'info',
      title: 'Sesi Berakhir',
      message: 'Anda telah keluar dari sistem SiBK.',
    });
  }, [pushToast]);

  const submitCounselingRequest = useCallback(
    (payload: {
      jenisKeperluan: CounselingCategory;
      guruTujuanId: string;
      tingkatUrgensi: UrgencyLevel;
      ceritaSingkat: string;
      usulanWaktu: string;
    }) => {
      if (!currentStudent) return;
      const targetGuru = db.staff.find((g) => g.id === payload.guruTujuanId);
      const newReq: CounselingRequest = {
        id: uid('req'),
        studentId: currentStudent.id,
        guruTujuanId: payload.guruTujuanId,
        jenisKeperluan: payload.jenisKeperluan,
        tingkatUrgensi: payload.tingkatUrgensi,
        ceritaSingkat: payload.ceritaSingkat.trim(),
        usulanWaktu: payload.usulanWaktu.trim(),
        status: 'Menunggu Konfirmasi',
        tanggalPengajuan: getTodayISO(),
        jamPengajuan: getCurrentTimeHHMM(),
      };

      setDb((prev) => ({
        ...prev,
        requests: [newReq, ...prev.requests],
        activities: appendActivity(
          prev,
          `${currentStudent.nama} (${currentStudent.kelas})`,
          'request',
          `Mengajukan layanan ${payload.jenisKeperluan} (${payload.tingkatUrgensi}) kepada ${targetGuru?.nama || 'Guru BK'}.`
        ),
      }));

      pushToast({
        type: 'success',
        title: 'Pengajuan Layanan Terkirim',
        message: `Permohonan ${payload.jenisKeperluan} menunggu konfirmasi ${targetGuru?.nama || 'Guru BK'}.`,
      });
    },
    [currentStudent, db.staff, pushToast]
  );

  const scheduleRequest = useCallback(
    (
      requestId: string,
      payload: {
        jadwalTanggal: string;
        jadwalJam: string;
        ruangPertemuan: string;
        catatanGuru: string;
      }
    ) => {
      setDb((prev) => {
        const req = prev.requests.find((r) => r.id === requestId);
        const student = prev.students.find((s) => s.id === req?.studentId);
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'Dijadwalkan',
                  ...payload,
                }
              : r
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Guru BK',
            'schedule',
            `Menjadwalkan sesi konseling untuk ${student?.nama || 'Siswa'} pada ${payload.jadwalTanggal} pukul ${payload.jadwalJam}.`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Sesi Konseling Dijadwalkan',
        message: 'Jadwal pertemuan telah dikirim ke portal siswa.',
      });
    },
    [currentStaff, pushToast]
  );

  const updateRequest = useCallback(
    (requestId: string, updates: Partial<CounselingRequest>) => {
      setDb((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          r.id === requestId ? { ...r, ...updates } : r
        ),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'schedule',
          `Memperbarui detail permohonan konseling.`
        ),
      }));
      pushToast({
        type: 'success',
        title: 'Antrean Diperbarui',
        message: 'Perubahan data permohonan konseling berhasil disimpan.',
      });
    },
    [currentStaff, pushToast]
  );

  const deleteRequests = useCallback(
    (requestIds: string[]) => {
      const idSet = new Set(requestIds);
      setDb((prev) => ({
        ...prev,
        requests: prev.requests.filter((r) => !idSet.has(r.id)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'schedule',
          `Menghapus ${requestIds.length} data antrean konseling.`
        ),
      }));
      pushToast({
        type: 'info',
        title: `${requestIds.length} Antrean Dihapus`,
      });
    },
    [currentStaff, pushToast]
  );

  const completeRequestsBulk = useCallback(
    (requestIds: string[]) => {
      const idSet = new Set(requestIds);
      setDb((prev) => ({
        ...prev,
        requests: prev.requests.map((r) =>
          idSet.has(r.id)
            ? {
                ...r,
                status: 'Selesai',
                catatanGuru: r.catatanGuru || 'Ditandai selesai secara kolektif.',
              }
            : r
        ),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'schedule',
          `Menyelesaikan ${requestIds.length} permohonan konseling terpilih.`
        ),
      }));
      pushToast({
        type: 'success',
        title: `${requestIds.length} Antrean Selesai`,
      });
    },
    [currentStaff, pushToast]
  );

  const transferRequest = useCallback(
    (requestId: string, newGuruId: string, alasan: string) => {
      const targetGuru = db.staff.find((g) => g.id === newGuruId);
      setDb((prev) => {
        const req = prev.requests.find((r) => r.id === requestId);
        const student = prev.students.find((s) => s.id === req?.studentId);
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  guruTujuanId: newGuruId,
                  catatanPengalihan: `Dialihkan dari ${currentStaff?.nama || 'Guru BK'}: ${alasan}`,
                }
              : r
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Guru BK',
            'schedule',
            `Mengalihkan permohonan ${student?.nama || 'Siswa'} kepada ${targetGuru?.nama || 'Guru BK lain'}.`
          ),
        };
      });
      pushToast({
        type: 'info',
        title: 'Permohonan Dialihkan',
        message: `Antrean diteruskan ke ${targetGuru?.nama || 'Guru BK tujuan'}.`,
      });
    },
    [currentStaff, db.staff, pushToast]
  );

  const completeRequest = useCallback(
    (requestId: string, catatanGuru?: string) => {
      setDb((prev) => {
        const req = prev.requests.find((r) => r.id === requestId);
        const student = prev.students.find((s) => s.id === req?.studentId);
        return {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'Selesai',
                  catatanGuru: catatanGuru || r.catatanGuru || 'Sesi konseling telah dilaksanakan.',
                }
              : r
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Guru BK',
            'schedule',
            `Menyelesaikan sesi ${req?.jenisKeperluan || 'konseling'} untuk ${student?.nama || 'Siswa'}.`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Layanan Ditandai Selesai',
      });
    },
    [currentStaff, pushToast]
  );

  const addCounselingNote = useCallback(
    (payload: {
      studentId: string;
      tanggal: string;
      jenisLayanan: CounselingCategory;
      deskripsiPermasalahan: string;
      hasilAsesmen: string;
      rencanaTindakLanjut: string;
      statusPerkembangan: ProgressStatus;
      isRahasia: boolean;
      requestId?: string;
    }) => {
      if (!currentStaff) return;
      const newNote: CounselingNote = {
        id: uid('note'),
        studentId: payload.studentId,
        guruId: currentStaff.id,
        guruNama: currentStaff.nama,
        tanggal: payload.tanggal,
        jenisLayanan: payload.jenisLayanan,
        deskripsiPermasalahan: payload.deskripsiPermasalahan.trim(),
        hasilAsesmen: payload.hasilAsesmen.trim(),
        rencanaTindakLanjut: payload.rencanaTindakLanjut.trim(),
        statusPerkembangan: payload.statusPerkembangan,
        isRahasia: payload.isRahasia,
        requestId: payload.requestId,
        createdAt: new Date().toISOString(),
      };

      setDb((prev) => {
        const student = prev.students.find((s) => s.id === payload.studentId);
        const updatedRequests = payload.requestId
          ? prev.requests.map((r) =>
              r.id === payload.requestId
                ? {
                    ...r,
                    status: 'Selesai' as const,
                    catatanGuru: r.catatanGuru || 'Sesi selesai dan tercatat dalam rekam jejak BK.',
                  }
                : r
            )
          : prev.requests;

        return {
          ...prev,
          notes: [newNote, ...prev.notes],
          requests: updatedRequests,
          activities: appendActivity(
            prev,
            currentStaff.nama,
            'note',
            `Menambahkan catatan ${payload.isRahasia ? 'rahasia ' : ''}(${payload.statusPerkembangan}) pada ${student?.nama || 'Siswa'}.`
          ),
        };
      });

      pushToast({
        type: 'success',
        title: 'Catatan Konseling Tersimpan',
        message: payload.isRahasia
          ? 'Catatan ditandai Rahasia dan terkunci bagi selain pembuatnya.'
          : 'Rekam jejak perkembangan siswa diperbarui.',
      });
    },
    [currentStaff, pushToast]
  );

  const updateCounselingNote = useCallback(
    (noteId: string, updates: Partial<CounselingNote>) => {
      setDb((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'note',
          `Memperbarui catatan konseling siswa.`
        ),
      }));
      pushToast({
        type: 'success',
        title: 'Catatan Konseling Diperbarui',
      });
    },
    [currentStaff, pushToast]
  );

  const deleteCounselingNote = useCallback(
    (noteId: string) => {
      setDb((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'note',
          `Menghapus satu entri catatan konseling.`
        ),
      }));
      pushToast({
        type: 'info',
        title: 'Catatan Konseling Dihapus',
      });
    },
    [currentStaff, pushToast]
  );

  const registerGuestVisit = useCallback(
    (payload: {
      namaLengkap: string;
      kategori: VisitorCategory;
      namaSiswaTerkait?: string;
      noWhatsApp: string;
      pihakDituju: string;
      keperluan: string;
    }): GuestVisit => {
      const today = getTodayISO();
      const todayCount = db.guests.filter((g) => g.tanggal === today).length + 1;
      const rawPrefix = (settings.guestQueuePrefix || 'TM-').trim().toUpperCase();
      const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
      const nomorAntrean = `${prefix}${String(todayCount).padStart(3, '0')}`;
      const visit: GuestVisit = {
        id: uid('gst'),
        nomorAntrean,
        namaLengkap: payload.namaLengkap.trim(),
        kategori: payload.kategori,
        namaSiswaTerkait: payload.namaSiswaTerkait?.trim() || undefined,
        noWhatsApp: payload.noWhatsApp.trim(),
        pihakDituju: payload.pihakDituju,
        keperluan: payload.keperluan.trim(),
        tanggal: today,
        jamMasuk: getCurrentTimeHHMM(),
        status: 'Berkunjung',
      };

      setDb((prev) => ({
        ...prev,
        guests: [visit, ...prev.guests],
        activities: appendActivity(
          prev,
          `${visit.namaLengkap} (${visit.kategori})`,
          'guest',
          `Check-in Buku Tamu Digital (${visit.nomorAntrean}) menemui ${visit.pihakDituju}.`
        ),
      }));

      pushToast({
        type: 'success',
        title: `Registrasi Tamu Berhasil (${nomorAntrean})`,
        message: 'Kartu Bukti Kunjungan Digital telah diterbitkan.',
      });

      return visit;
    },
    [db.guests, pushToast, settings.guestQueuePrefix]
  );

  const updateGuestVisit = useCallback(
    (guestId: string, updates: Partial<GuestVisit>) => {
      setDb((prev) => ({
        ...prev,
        guests: prev.guests.map((g) => (g.id === guestId ? { ...g, ...updates } : g)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Staf BK',
          'guest',
          `Memperbarui data kunjungan tamu.`
        ),
      }));
      pushToast({
        type: 'success',
        title: 'Data Tamu Diperbarui',
      });
    },
    [currentStaff, pushToast]
  );

  const markGuestCompleted = useCallback(
    (guestId: string) => {
      const jamKeluar = getCurrentTimeHHMM();
      setDb((prev) => {
        const guest = prev.guests.find((g) => g.id === guestId);
        return {
          ...prev,
          guests: prev.guests.map((g) =>
            g.id === guestId ? { ...g, status: 'Selesai', jamKeluar } : g
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Resepsionis BK',
            'guest',
            `Menandai kunjungan ${guest?.namaLengkap || 'Tamu'} (${guest?.nomorAntrean || ''}) selesai pada ${jamKeluar}.`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Kunjungan Tamu Selesai',
        message: `Jam keluar dicatat pukul ${jamKeluar} WIB.`,
      });
    },
    [currentStaff, pushToast]
  );

  const completeGuestsBulk = useCallback(
    (guestIds: string[]) => {
      const jamKeluar = getCurrentTimeHHMM();
      const idSet = new Set(guestIds);
      setDb((prev) => ({
        ...prev,
        guests: prev.guests.map((g) =>
          idSet.has(g.id) ? { ...g, status: 'Selesai', jamKeluar: g.jamKeluar || jamKeluar } : g
        ),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Staf BK',
          'guest',
          `Menandai ${guestIds.length} kunjungan tamu selesai.`
        ),
      }));
      pushToast({
        type: 'success',
        title: `${guestIds.length} Kunjungan Ditandai Selesai`,
      });
    },
    [currentStaff, pushToast]
  );

  const deleteGuests = useCallback(
    (guestIds: string[]) => {
      const idSet = new Set(guestIds);
      setDb((prev) => ({
        ...prev,
        guests: prev.guests.filter((g) => !idSet.has(g.id)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Staf BK',
          'guest',
          `Menghapus ${guestIds.length} entri log buku tamu.`
        ),
      }));
      pushToast({
        type: 'info',
        title: `${guestIds.length} Log Tamu Dihapus`,
      });
    },
    [currentStaff, pushToast]
  );

  const toggleStaffAvailability = useCallback(
    (staffId: string, status: AvailabilityStatus) => {
      setDb((prev) => ({
        ...prev,
        staff: prev.staff.map((g) =>
          g.id === staffId ? { ...g, statusKetersediaan: status } : g
        ),
      }));
      pushToast({
        type: 'info',
        title: 'Status Ketersediaan Diperbarui',
        message: `Status layanan saat ini: ${status}`,
      });
    },
    [pushToast]
  );

  const upsertStudent = useCallback(
    (student: Omit<Student, 'id'> & { id?: string }) => {
      setDb((prev) => {
        const exists = student.id && prev.students.some((s) => s.id === student.id);
        const updatedStudents = exists
          ? prev.students.map((s) =>
              s.id === student.id ? ({ ...student, id: student.id } as Student) : s
            )
          : [{ ...student, id: uid('std') }, ...prev.students];

        return {
          ...prev,
          students: updatedStudents,
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            `${exists ? 'Memperbarui' : 'Menambahkan'} data siswa ${student.nama} (${student.kelas}).`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Data Siswa Tersimpan',
        message: `${student.nama} (${student.kelas}) berhasil disimpan.`,
      });
    },
    [currentStaff, pushToast]
  );

  const deleteStudent = useCallback(
    (studentId: string) => {
      setDb((prev) => {
        const target = prev.students.find((s) => s.id === studentId);
        return {
          ...prev,
          students: prev.students.filter((s) => s.id !== studentId),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            `Menghapus data siswa ${target?.nama || studentId}.`
          ),
        };
      });
      pushToast({
        type: 'info',
        title: 'Data Siswa Dihapus',
      });
    },
    [currentStaff, pushToast]
  );

  const deleteStudentsBulk = useCallback(
    (studentIds: string[]) => {
      const idSet = new Set(studentIds);
      setDb((prev) => ({
        ...prev,
        students: prev.students.filter((s) => !idSet.has(s.id)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Admin',
          'master',
          `Menghapus ${studentIds.length} data siswa terpilih.`
        ),
      }));
      pushToast({
        type: 'info',
        title: `${studentIds.length} Data Siswa Dihapus`,
      });
    },
    [currentStaff, pushToast]
  );

  const upsertStaff = useCallback(
    (staffMember: Omit<StaffUser, 'id'> & { id?: string }) => {
      setDb((prev) => {
        const exists = staffMember.id && prev.staff.some((g) => g.id === staffMember.id);
        const updatedStaff = exists
          ? prev.staff.map((g) =>
              g.id === staffMember.id
                ? ({ ...staffMember, id: staffMember.id } as StaffUser)
                : g
            )
          : [...prev.staff, { ...staffMember, id: uid('staff') }];

        return {
          ...prev,
          staff: updatedStaff,
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            `${exists ? 'Memperbarui' : 'Menambahkan'} akun ${staffMember.nama}.`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Data Guru BK Tersimpan',
        message: `${staffMember.nama} berhasil disimpan.`,
      });
    },
    [currentStaff, pushToast]
  );

  const deleteStaff = useCallback(
    (staffId: string) => {
      if (currentStaff?.id === staffId) {
        pushToast({
          type: 'error',
          title: 'Tidak Dapat Menghapus',
          message: 'Akun yang sedang aktif login tidak dapat dihapus.',
        });
        return;
      }
      setDb((prev) => {
        const target = prev.staff.find((g) => g.id === staffId);
        return {
          ...prev,
          staff: prev.staff.filter((g) => g.id !== staffId),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            `Menghapus akun Guru BK ${target?.nama || staffId}.`
          ),
        };
      });
      pushToast({
        type: 'info',
        title: 'Data Guru BK Dihapus',
      });
    },
    [currentStaff, pushToast]
  );

  const deleteStaffBulk = useCallback(
    (staffIds: string[]) => {
      const safeIds = staffIds.filter((id) => id !== currentStaff?.id);
      if (safeIds.length === 0) {
        pushToast({
          type: 'warning',
          title: 'Penghapusan Dibatalkan',
          message: 'Tidak dapat menghapus akun yang sedang aktif digunakan.',
        });
        return;
      }
      const idSet = new Set(safeIds);
      setDb((prev) => ({
        ...prev,
        staff: prev.staff.filter((g) => !idSet.has(g.id)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Admin',
          'master',
          `Menghapus ${safeIds.length} akun Guru BK terpilih.`
        ),
      }));
      pushToast({
        type: 'info',
        title: `${safeIds.length} Akun Guru BK Dihapus`,
      });
    },
    [currentStaff, pushToast]
  );

  const importStudents = useCallback(
    (rows: Omit<Student, 'id'>[], mode: 'merge' | 'replace'): number => {
      const withIds: Student[] = rows.map((r) => ({ ...r, id: uid('std') }));
      setDb((prev) => {
        if (mode === 'replace') {
          return {
            ...prev,
            students: withIds,
            activities: appendActivity(
              prev,
              currentStaff?.nama || 'Admin',
              'master',
              `Mengimpor & mengganti data master siswa (${withIds.length} siswa).`
            ),
          };
        }
        const existingNis = new Set(prev.students.map((s) => s.nis));
        const newOnes = withIds.filter((s) => !existingNis.has(s.nis));
        const updated = prev.students.map((s) => {
          const match = withIds.find((w) => w.nis === s.nis);
          return match ? { ...s, ...match, id: s.id } : s;
        });
        return {
          ...prev,
          students: [...newOnes, ...updated],
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            `Mengimpor ${withIds.length} data siswa (Mode Gabung).`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: `Impor Siswa Berhasil`,
        message: `${rows.length} baris data siswa telah diproses ke Data Master.`,
      });
      return rows.length;
    },
    [currentStaff, pushToast, settings.guestQueuePrefix]
  );

  const importGuests = useCallback(
    (
      rows: Omit<GuestVisit, 'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'>[],
      mode: 'merge' | 'replace'
    ): number => {
      const today = getTodayISO();
      const nowTime = getCurrentTimeHHMM();
      const rawPrefix = (settings.guestQueuePrefix || 'TM-').trim().toUpperCase();
      const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
      setDb((prev) => {
        const baseCount =
          mode === 'replace' ? 0 : prev.guests.filter((g) => g.tanggal === today).length;
        const imported: GuestVisit[] = rows.map((r, idx) => ({
          id: uid('gst'),
          nomorAntrean: `${prefix}${String(baseCount + idx + 1).padStart(3, '0')}`,
          namaLengkap: r.namaLengkap,
          kategori: r.kategori,
          namaSiswaTerkait: r.namaSiswaTerkait,
          noWhatsApp: r.noWhatsApp,
          pihakDituju: r.pihakDituju,
          keperluan: r.keperluan,
          tanggal: today,
          jamMasuk: nowTime,
          status: 'Berkunjung',
        }));

        return {
          ...prev,
          guests: mode === 'replace' ? imported : [...imported, ...prev.guests],
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Staf BK',
            'guest',
            `Mengimpor ${imported.length} log kunjungan buku tamu.`
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Impor Buku Tamu Berhasil',
        message: `${rows.length} data pengunjung ditambahkan.`,
      });
      return rows.length;
    },
    [currentStaff, pushToast, settings.guestQueuePrefix]
  );

  const importFullBackup = useCallback(
    (backupDb: SiBKDatabase, mode: 'merge' | 'replace') => {
      setDb((prev) => {
        if (mode === 'replace') {
          const normalized = normalizeDatabase(backupDb);
          return {
            ...normalized,
            activities: appendActivity(
              normalized,
              currentStaff?.nama || 'Admin',
              'master',
              'Memulihkan seluruh database dari file cadangan JSON.'
            ),
          };
        }
        const mergeById = <T extends { id: string }>(curr: T[], incoming: T[]): T[] => {
          const map = new Map(curr.map((item) => [item.id, item]));
          incoming.forEach((item) => map.set(item.id, item));
          return Array.from(map.values());
        };
        return {
          students: mergeById(prev.students, backupDb.students || []),
          staff: mergeById(prev.staff, backupDb.staff || []),
          requests: mergeById(prev.requests, backupDb.requests || []),
          notes: mergeById(prev.notes, backupDb.notes || []),
          guests: mergeById(prev.guests, backupDb.guests || []),
          studentAttendances: mergeById(
            prev.studentAttendances,
            backupDb.studentAttendances || []
          ),
          classAttendances: mergeById(
            prev.classAttendances,
            backupDb.classAttendances || []
          ),
          chats: mergeById(prev.chats, backupDb.chats || []),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Admin',
            'master',
            'Menggabungkan data cadangan JSON ke database aktif.'
          ),
        };
      });
      pushToast({
        type: 'success',
        title: 'Impor Backup JSON Berhasil',
        message:
          mode === 'replace'
            ? 'Seluruh database dipulihkan dari file backup.'
            : 'Data backup berhasil digabungkan.',
      });
    },
    [currentStaff, pushToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDatabase();
    setDb(fresh);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fresh));
    pushToast({
      type: 'info',
      title: 'Data Simulasi Direset',
      message: 'Seluruh data dikembalikan ke kondisi awal demo.',
    });
  }, [pushToast]);

  const toggleStudentSecretaryAccess = useCallback(
    (studentId: string, enabled: boolean) => {
      setDb((prev) => {
        const target = prev.students.find((s) => s.id === studentId);
        return {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, isSekretarisKelas: enabled } : s
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Guru BK',
            'attendance',
            `${enabled ? 'Memberikan' : 'Mencabut'} akses Sekretaris Kelas untuk ${target?.nama || 'Siswa'} (${target?.kelas || '-'}).`
          ),
        };
      });
      pushToast({
        type: enabled ? 'success' : 'info',
        title: enabled ? 'Akses Sekretaris Kelas Aktif' : 'Akses Sekretaris Kelas Dicabut',
        message: enabled
          ? 'Siswa kini dapat menginput data kehadiran harian teman sekelasnya.'
          : 'Menu Sekretaris Kelas disembunyikan dari portal siswa tersebut.',
      });
    },
    [currentStaff, pushToast]
  );

  const submitStudentAttendance = useCallback(
    (payload: {
      tanggal: string;
      status: StudentAttendanceStatus;
      keterangan: string;
      fotoLampiranDataUrl?: string;
      fotoLampiranName?: string;
    }) => {
      if (!currentStudent) return;
      const report: StudentAttendanceReport = {
        id: uid('att'),
        studentId: currentStudent.id,
        tanggal: payload.tanggal,
        jamKirim: getCurrentTimeHHMM(),
        status: payload.status,
        keterangan: payload.keterangan.trim(),
        fotoLampiranDataUrl: payload.fotoLampiranDataUrl,
        fotoLampiranName: payload.fotoLampiranName,
        statusVerifikasi: 'Menunggu Verifikasi',
        createdAt: new Date().toISOString(),
      };

      setDb((prev) => ({
        ...prev,
        studentAttendances: [report, ...prev.studentAttendances],
        activities: appendActivity(
          prev,
          `${currentStudent.nama} (${currentStudent.kelas})`,
          'attendance',
          `Mengirim info kehadiran (${payload.status})${payload.fotoLampiranDataUrl ? ' beserta foto lampiran' : ''}.`
        ),
      }));

      if (settings.enableSoundNotification) {
        playNotificationSound('attendance');
      }
      if (settings.enableTextNotification) {
        pushToast({
          type: 'success',
          title: 'Informasi Kehadiran Terkirim',
          message: `Status ${payload.status} untuk tanggal ${payload.tanggal} telah diteruskan ke Guru BK.`,
        });
      }
    },
    [currentStudent, pushToast, settings.enableSoundNotification, settings.enableTextNotification]
  );

  const verifyStudentAttendance = useCallback(
    (reportId: string, statusVerifikasi: AttendanceVerifyStatus, catatanGuru?: string) => {
      setDb((prev) => {
        const target = prev.studentAttendances.find((a) => a.id === reportId);
        const st = prev.students.find((s) => s.id === target?.studentId);
        return {
          ...prev,
          studentAttendances: prev.studentAttendances.map((a) =>
            a.id === reportId
              ? {
                  ...a,
                  statusVerifikasi,
                  catatanGuru: catatanGuru?.trim() || a.catatanGuru,
                  verifiedBy: currentStaff?.nama || 'Guru BK',
                }
              : a
          ),
          activities: appendActivity(
            prev,
            currentStaff?.nama || 'Guru BK',
            'attendance',
            `Menandai info kehadiran ${st?.nama || 'Siswa'} sebagai "${statusVerifikasi}".`
          ),
        };
      });
      if (settings.enableSoundNotification) {
        playNotificationSound('sent');
      }
      pushToast({
        type: 'success',
        title: `Status Verifikasi: ${statusVerifikasi}`,
        message: 'Catatan verifikasi telah dikirim ke portal siswa.',
      });
    },
    [currentStaff, pushToast, settings.enableSoundNotification]
  );

  const deleteStudentAttendances = useCallback(
    (reportIds: string[]) => {
      const idSet = new Set(reportIds);
      setDb((prev) => ({
        ...prev,
        studentAttendances: prev.studentAttendances.filter((a) => !idSet.has(a.id)),
        activities: appendActivity(
          prev,
          currentStaff?.nama || 'Guru BK',
          'attendance',
          `Menghapus ${reportIds.length} laporan kehadiran siswa.`
        ),
      }));
      pushToast({
        type: 'info',
        title: `${reportIds.length} Laporan Kehadiran Dihapus`,
      });
    },
    [currentStaff, pushToast]
  );

  const saveDailyClassAttendance = useCallback(
    (kelas: string, tanggal: string, entries: ClassAttendanceEntry[]) => {
      const actorName = currentStudent
        ? `${currentStudent.nama} (Sekretaris Kelas)`
        : currentStaff?.nama || 'Guru BK';

      setDb((prev) => {
        const existingIndex = prev.classAttendances.findIndex(
          (c) => c.kelas === kelas && c.tanggal === tanggal
        );
        const record: DailyClassAttendance = {
          id: existingIndex >= 0 ? prev.classAttendances[existingIndex].id : uid('cls-att'),
          kelas,
          tanggal,
          inputByStudentId: currentStudent?.id,
          inputByName: actorName,
          entries,
          updatedAt: new Date().toISOString(),
        };
        const updatedList =
          existingIndex >= 0
            ? prev.classAttendances.map((c, idx) => (idx === existingIndex ? record : c))
            : [record, ...prev.classAttendances];

        return {
          ...prev,
          classAttendances: updatedList,
          activities: appendActivity(
            prev,
            actorName,
            'attendance',
            `Menyimpan presensi harian kelas ${kelas} tanggal ${tanggal} (${entries.length} siswa).`
          ),
        };
      });

      if (settings.enableSoundNotification) {
        playNotificationSound('attendance');
      }
      pushToast({
        type: 'success',
        title: `Presensi Kelas ${kelas} Tersimpan`,
        message: `Data kehadiran harian tanggal ${tanggal} berhasil diperbarui.`,
      });
    },
    [currentStaff, currentStudent, pushToast, settings.enableSoundNotification]
  );

  const sendChatMessage = useCallback(
    (payload: {
      studentId: string;
      staffId: string;
      senderRole: 'student' | 'staff';
      message: string;
      attachmentDataUrl?: string;
      attachmentName?: string;
    }) => {
      const cleanMsg = payload.message.trim();
      if (!cleanMsg && !payload.attachmentDataUrl) return;

      const senderName =
        payload.senderRole === 'student'
          ? db.students.find((s) => s.id === payload.studentId)?.nama || 'Siswa'
          : db.staff.find((g) => g.id === payload.staffId)?.nama || 'Guru BK';

      const newMsg: ChatMessage = {
        id: uid('chat'),
        studentId: payload.studentId,
        staffId: payload.staffId,
        senderRole: payload.senderRole,
        senderName,
        message: cleanMsg,
        attachmentDataUrl: payload.attachmentDataUrl,
        attachmentName: payload.attachmentName,
        tanggal: getTodayISO(),
        jam: getCurrentTimeHHMM(),
        createdAt: new Date().toISOString(),
        readByStudent: payload.senderRole === 'student',
        readByStaff: payload.senderRole === 'staff',
      };

      setDb((prev) => ({
        ...prev,
        chats: [...prev.chats, newMsg],
        activities: appendActivity(
          prev,
          senderName,
          'chat',
          `Mengirim pesan konsultasi ${payload.senderRole === 'student' ? 'ke Guru BK' : 'ke Siswa'}.`
        ),
      }));

      if (settings.enableSoundNotification) {
        playNotificationSound('sent');
      }
      if (settings.enableTextNotification) {
        pushToast({
          type: 'success',
          title: 'Pesan Terkirim',
          message:
            payload.senderRole === 'student'
              ? 'Pesan Anda telah diteruskan ke Guru BK.'
              : 'Balasan telah dikirim ke portal siswa.',
        });
      }
    },
    [
      db.staff,
      db.students,
      pushToast,
      settings.enableSoundNotification,
      settings.enableTextNotification,
    ]
  );

  const markChatRead = useCallback(
    (studentId: string, staffId: string, viewerRole: 'student' | 'staff') => {
      setDb((prev) => {
        let changed = false;
        const nextChats = prev.chats.map((c) => {
          if (c.studentId !== studentId || c.staffId !== staffId) return c;
          if (viewerRole === 'student' && !c.readByStudent) {
            changed = true;
            return { ...c, readByStudent: true };
          }
          if (viewerRole === 'staff' && !c.readByStaff) {
            changed = true;
            return { ...c, readByStaff: true };
          }
          return c;
        });
        if (!changed) return prev;
        return { ...prev, chats: nextChats };
      });
    },
    []
  );

  const testNotificationSound = useCallback(() => {
    const played = playNotificationSound('chat');
    if (settings.enableBrowserNotification) {
      showBrowserTextNotification(
        `${settings.appName} — Tes Notifikasi`,
        'Notifikasi suara & tulisan aktif untuk chat dan kehadiran.'
      );
    }
    pushToast({
      type: 'info',
      title: played ? 'Tes Notifikasi Suara & Tulisan Berhasil' : 'Notifikasi Tulisan Aktif',
      message: 'Bunyi lonceng dan banner tulisan akan muncul otomatis saat pesan atau laporan baru masuk.',
    });
  }, [pushToast, settings.appName, settings.enableBrowserNotification]);

  return (
    <SiBKContext.Provider
      value={{
        db,
        session,
        theme,
        setTheme,
        settings,
        updateSettings,
        replaceSettings,
        resetSettings,
        currentStudent,
        currentStaff,
        toasts,
        pushToast,
        dismissToast,
        loginStudent,
        loginStaff,
        logout,
        submitCounselingRequest,
        scheduleRequest,
        updateRequest,
        deleteRequests,
        completeRequestsBulk,
        transferRequest,
        completeRequest,
        addCounselingNote,
        updateCounselingNote,
        deleteCounselingNote,
        registerGuestVisit,
        updateGuestVisit,
        markGuestCompleted,
        completeGuestsBulk,
        deleteGuests,
        toggleStaffAvailability,
        upsertStudent,
        deleteStudent,
        deleteStudentsBulk,
        upsertStaff,
        deleteStaff,
        deleteStaffBulk,
        importStudents,
        importGuests,
        importFullBackup,
        resetDemoData,
        toggleStudentSecretaryAccess,
        submitStudentAttendance,
        verifyStudentAttendance,
        deleteStudentAttendances,
        saveDailyClassAttendance,
        sendChatMessage,
        markChatRead,
        testNotificationSound,
        selectedStudentInfoId,
        openStudentInfo,
        closeStudentInfo,
      }}
    >
      {children}
    </SiBKContext.Provider>
  );
};

export function useSiBK(): SiBKContextValue {
  const ctx = useContext(SiBKContext);
  if (!ctx) {
    throw new Error('useSiBK must be used within SiBKProvider');
  }
  return ctx;
}
