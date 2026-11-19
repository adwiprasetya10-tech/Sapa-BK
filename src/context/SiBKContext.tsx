import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createInitialDatabase,
  getCurrentTimeHHMM,
  getTodayISO,
} from '../data/seedData';
import {
  applySiBKAction,
  normalizeAppSettings,
  normalizeDatabase,
} from '../shared/sibkActions';
import type { SiBKAction } from '../shared/sibkActions';
import {
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

interface ServerSyncEnvelope {
  type?: 'state:init' | 'state:sync';
  ok?: boolean;
  revision?: number;
  originClientId?: string;
  actionType?: string;
  db: Partial<SiBKDatabase>;
  settings: Partial<AppSettings>;
}

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

function loadCachedDatabase(): SiBKDatabase {
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
  return createInitialDatabase();
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
  const [db, setDb] = useState<SiBKDatabase>(() => loadCachedDatabase());
  const [session, setSession] = useState<AuthSession>(() => loadSession());
  const [theme, setThemeState] = useState<AppThemeId>(() => loadTheme());
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedStudentInfoId, setSelectedStudentInfoId] = useState<string | null>(null);

  const clientIdRef = useRef<string>(uid('client'));
  const revisionRef = useRef<number>(0);
  const pendingActionsRef = useRef<number>(0);
  const hasHydratedRef = useRef<boolean>(false);
  const actionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const wsRef = useRef<WebSocket | null>(null);

  const dbRef = useRef(db);
  dbRef.current = db;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sessionRef = useRef(session);
  sessionRef.current = session;

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

  const notifyIncomingChanges = useCallback(
    (prevDb: SiBKDatabase, nextDb: SiBKDatabase, cfg: AppSettings) => {
      const activeSession = sessionRef.current;
      if (!activeSession) return;

      const prevChatIds = new Set(prevDb.chats.map((c) => c.id));
      const newChats = nextDb.chats.filter((c) => !prevChatIds.has(c.id));

      if (activeSession.type === 'student') {
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
              message:
                verifiedNow.catatanGuru ||
                `Laporan tanggal ${verifiedNow.tanggal} telah diperiksa.`,
            });
          }
        }

        const scheduledReq = nextDb.requests.find((req) => {
          if (req.studentId !== activeSession.studentId) return false;
          const prevReq = prevDb.requests.find((p) => p.id === req.id);
          return (
            prevReq &&
            prevReq.status !== req.status &&
            req.status === 'Dijadwalkan'
          );
        });
        if (scheduledReq) {
          if (cfg.enableSoundNotification) playNotificationSound('attendance');
          if (cfg.enableTextNotification) {
            pushToast({
              type: 'success',
              title: 'Jadwal Konseling Diterbitkan',
              message: `${scheduledReq.jadwalTanggal || ''} pukul ${scheduledReq.jadwalJam || ''} · ${scheduledReq.ruangPertemuan || 'Ruang BK'}`,
            });
          }
        }
      } else if (activeSession.type === 'staff') {
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

        const prevReqIds = new Set(prevDb.requests.map((r) => r.id));
        const newReqs = nextDb.requests.filter(
          (r) =>
            !prevReqIds.has(r.id) &&
            (isAdmin || r.guruTujuanId === activeSession.staffId)
        );
        if (newReqs.length > 0) {
          const latestReq = newReqs[0];
          const st = nextDb.students.find((s) => s.id === latestReq.studentId);
          if (cfg.enableSoundNotification) playNotificationSound('attendance');
          if (cfg.enableTextNotification) {
            pushToast({
              type: 'info',
              title: `Permohonan Konseling Baru`,
              message: `${st?.nama || 'Siswa'} (${latestReq.jenisKeperluan} · ${latestReq.tingkatUrgensi})`,
            });
          }
        }

        const prevGuestIds = new Set(prevDb.guests.map((g) => g.id));
        const newGuests = nextDb.guests.filter((g) => !prevGuestIds.has(g.id));
        if (newGuests.length > 0) {
          const latestGuest = newGuests[0];
          if (cfg.enableTextNotification) {
            pushToast({
              type: 'info',
              title: `Tamu Check-in (${latestGuest.nomorAntrean})`,
              message: `${latestGuest.namaLengkap} menemui ${latestGuest.pihakDituju}`,
            });
          }
        }
      }
    },
    [pushToast]
  );

  const applyIncomingServerState = useCallback(
    (payload: ServerSyncEnvelope, source: 'init' | 'sync' | 'poll') => {
      if (!payload || !payload.db || !payload.settings) return;
      const incomingRev = typeof payload.revision === 'number' ? payload.revision : 0;
      if (incomingRev > 0 && incomingRev < revisionRef.current) {
        return;
      }

      const nextDb = normalizeDatabase(payload.db);
      const nextSettings = normalizeAppSettings(payload.settings);
      const isFromAnotherDevice = payload.originClientId !== clientIdRef.current;

      if (hasHydratedRef.current && isFromAnotherDevice && source !== 'init') {
        notifyIncomingChanges(dbRef.current, nextDb, nextSettings);
      }

      if (incomingRev > 0) {
        revisionRef.current = Math.max(revisionRef.current, incomingRev);
      }
      hasHydratedRef.current = true;

      if (pendingActionsRef.current === 0 || source === 'init' || isFromAnotherDevice) {
        dbRef.current = nextDb;
        settingsRef.current = nextSettings;
        setDb(nextDb);
        setSettings(nextSettings);
      }
    },
    [notifyIncomingChanges]
  );

  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as ServerSyncEnvelope;
      applyIncomingServerState(data, hasHydratedRef.current ? 'poll' : 'init');
    } catch {
      // ignore temporary network hiccup
    }
  }, [applyIncomingServerState]);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    fetchServerState();

    const connectWs = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          attempt = 0;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as ServerSyncEnvelope;
            if (msg.type === 'state:init') {
              applyIncomingServerState(msg, 'init');
            } else if (msg.type === 'state:sync') {
              applyIncomingServerState(msg, 'sync');
            }
          } catch {
            // ignore malformed socket frame
          }
        };

        ws.onclose = () => {
          if (wsRef.current === ws) {
            wsRef.current = null;
          }
          if (disposed) return;
          attempt += 1;
          const delay = Math.min(500 * Math.pow(1.5, attempt - 1), 5000);
          reconnectTimer = setTimeout(connectWs, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        attempt += 1;
        reconnectTimer = setTimeout(connectWs, 2500);
      }
    };

    connectWs();

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        fetchServerState();
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          connectWs();
        }
      }
    };

    window.addEventListener('online', handleVisibilityOrOnline);
    document.addEventListener('visibilitychange', handleVisibilityOrOnline);

    // Safety polling fallback only when WebSocket is disconnected
    const fallbackTimer = setInterval(() => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        fetchServerState();
      }
    }, 10000);

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(fallbackTimer);
      window.removeEventListener('online', handleVisibilityOrOnline);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [applyIncomingServerState, fetchServerState]);

  const dispatchSharedAction = useCallback(
    (action: SiBKAction) => {
      const optimisticState = applySiBKAction(
        { db: dbRef.current, settings: settingsRef.current },
        action
      );
      if (optimisticState.db !== dbRef.current) {
        dbRef.current = optimisticState.db;
        setDb(optimisticState.db);
      }
      if (optimisticState.settings !== settingsRef.current) {
        settingsRef.current = optimisticState.settings;
        setSettings(optimisticState.settings);
      }

      pendingActionsRef.current += 1;
      actionQueueRef.current = actionQueueRef.current
        .then(async () => {
          try {
            const res = await fetch('/api/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action,
                clientId: clientIdRef.current,
              }),
            });
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const data = (await res.json()) as ServerSyncEnvelope;
            if (typeof data.revision === 'number') {
              revisionRef.current = Math.max(revisionRef.current, data.revision);
            }
            hasHydratedRef.current = true;
            if (pendingActionsRef.current <= 1 && data.db && data.settings) {
              const authDb = normalizeDatabase(data.db);
              const authSettings = normalizeAppSettings(data.settings);
              dbRef.current = authDb;
              settingsRef.current = authSettings;
              setDb(authDb);
              setSettings(authSettings);
            }
          } catch {
            fetchServerState();
          } finally {
            pendingActionsRef.current = Math.max(0, pendingActionsRef.current - 1);
          }
        })
        .catch(() => {
          pendingActionsRef.current = Math.max(0, pendingActionsRef.current - 1);
        });
    },
    [fetchServerState]
  );

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
      dispatchSharedAction({ type: 'SETTINGS_UPDATE', payload: { updates } });
      if (!silent) {
        pushToast({
          type: 'success',
          title: 'Pengaturan Sistem Disimpan',
          message: 'Perubahan diterapkan ke seluruh perangkat secara langsung.',
        });
      }
    },
    [dispatchSharedAction, pushToast]
  );

  const replaceSettings = useCallback(
    (next: AppSettings) => {
      dispatchSharedAction({ type: 'SETTINGS_REPLACE', payload: { next } });
      pushToast({
        type: 'success',
        title: 'Pengaturan Diperbarui',
        message: 'Konfigurasi aplikasi telah disinkronkan ke seluruh perangkat.',
      });
    },
    [dispatchSharedAction, pushToast]
  );

  const resetSettings = useCallback(() => {
    dispatchSharedAction({ type: 'SETTINGS_RESET' });
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
  }, [dispatchSharedAction, pushToast]);

  const currentStudent =
    session?.type === 'student'
      ? db.students.find((s) => s.id === session.studentId) || null
      : null;

  const currentStaff =
    session?.type === 'staff'
      ? db.staff.find((g) => g.id === session.staffId) || null
      : null;

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
      const request: CounselingRequest = {
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

      dispatchSharedAction({
        type: 'REQUEST_SUBMIT',
        payload: {
          request,
          actorLabel: `${currentStudent.nama} (${currentStudent.kelas})`,
          targetGuruName: targetGuru?.nama || 'Guru BK',
        },
      });

      pushToast({
        type: 'success',
        title: 'Pengajuan Layanan Terkirim',
        message: `Permohonan ${payload.jenisKeperluan} menunggu konfirmasi ${targetGuru?.nama || 'Guru BK'}.`,
      });
    },
    [currentStudent, db.staff, dispatchSharedAction, pushToast]
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
      dispatchSharedAction({
        type: 'REQUEST_SCHEDULE',
        payload: {
          requestId,
          ...payload,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Sesi Konseling Dijadwalkan',
        message: 'Jadwal pertemuan telah dikirim ke portal siswa.',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const updateRequest = useCallback(
    (requestId: string, updates: Partial<CounselingRequest>) => {
      dispatchSharedAction({
        type: 'REQUEST_UPDATE',
        payload: {
          requestId,
          updates,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Antrean Diperbarui',
        message: 'Perubahan data permohonan konseling berhasil disimpan.',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const deleteRequests = useCallback(
    (requestIds: string[]) => {
      dispatchSharedAction({
        type: 'REQUEST_DELETE_BULK',
        payload: {
          requestIds,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'info',
        title: `${requestIds.length} Antrean Dihapus`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const completeRequestsBulk = useCallback(
    (requestIds: string[]) => {
      dispatchSharedAction({
        type: 'REQUEST_COMPLETE_BULK',
        payload: {
          requestIds,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'success',
        title: `${requestIds.length} Antrean Selesai`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const transferRequest = useCallback(
    (requestId: string, newGuruId: string, alasan: string) => {
      const targetGuru = db.staff.find((g) => g.id === newGuruId);
      dispatchSharedAction({
        type: 'REQUEST_TRANSFER',
        payload: {
          requestId,
          newGuruId,
          alasan,
          actorName: currentStaff?.nama || 'Guru BK',
          targetGuruName: targetGuru?.nama || 'Guru BK lain',
        },
      });
      pushToast({
        type: 'info',
        title: 'Permohonan Dialihkan',
        message: `Antrean diteruskan ke ${targetGuru?.nama || 'Guru BK tujuan'}.`,
      });
    },
    [currentStaff, db.staff, dispatchSharedAction, pushToast]
  );

  const completeRequest = useCallback(
    (requestId: string, catatanGuru?: string) => {
      dispatchSharedAction({
        type: 'REQUEST_COMPLETE',
        payload: {
          requestId,
          catatanGuru,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Layanan Ditandai Selesai',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
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

      dispatchSharedAction({
        type: 'NOTE_ADD',
        payload: {
          note: newNote,
          actorName: currentStaff.nama,
        },
      });

      pushToast({
        type: 'success',
        title: 'Catatan Konseling Tersimpan',
        message: payload.isRahasia
          ? 'Catatan ditandai Rahasia dan terkunci bagi selain pembuatnya.'
          : 'Rekam jejak perkembangan siswa diperbarui.',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const updateCounselingNote = useCallback(
    (noteId: string, updates: Partial<CounselingNote>) => {
      dispatchSharedAction({
        type: 'NOTE_UPDATE',
        payload: {
          noteId,
          updates,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Catatan Konseling Diperbarui',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const deleteCounselingNote = useCallback(
    (noteId: string) => {
      dispatchSharedAction({
        type: 'NOTE_DELETE',
        payload: {
          noteId,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'info',
        title: 'Catatan Konseling Dihapus',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
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
      const todayCount = dbRef.current.guests.filter((g) => g.tanggal === today).length + 1;
      const rawPrefix = (settingsRef.current.guestQueuePrefix || 'TM-').trim().toUpperCase();
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

      dispatchSharedAction({
        type: 'GUEST_REGISTER',
        payload: {
          visit,
          queuePrefix: settingsRef.current.guestQueuePrefix || 'TM-',
        },
      });

      pushToast({
        type: 'success',
        title: `Registrasi Tamu Berhasil (${nomorAntrean})`,
        message: 'Kartu Bukti Kunjungan Digital telah diterbitkan.',
      });

      return visit;
    },
    [dispatchSharedAction, pushToast]
  );

  const updateGuestVisit = useCallback(
    (guestId: string, updates: Partial<GuestVisit>) => {
      dispatchSharedAction({
        type: 'GUEST_UPDATE',
        payload: {
          guestId,
          updates,
          actorName: currentStaff?.nama || 'Staf BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Data Tamu Diperbarui',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const markGuestCompleted = useCallback(
    (guestId: string) => {
      const jamKeluar = getCurrentTimeHHMM();
      dispatchSharedAction({
        type: 'GUEST_COMPLETE',
        payload: {
          guestId,
          jamKeluar,
          actorName: currentStaff?.nama || 'Resepsionis BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Kunjungan Tamu Selesai',
        message: `Jam keluar dicatat pukul ${jamKeluar} WIB.`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const completeGuestsBulk = useCallback(
    (guestIds: string[]) => {
      const jamKeluar = getCurrentTimeHHMM();
      dispatchSharedAction({
        type: 'GUEST_COMPLETE_BULK',
        payload: {
          guestIds,
          jamKeluar,
          actorName: currentStaff?.nama || 'Staf BK',
        },
      });
      pushToast({
        type: 'success',
        title: `${guestIds.length} Kunjungan Ditandai Selesai`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const deleteGuests = useCallback(
    (guestIds: string[]) => {
      dispatchSharedAction({
        type: 'GUEST_DELETE_BULK',
        payload: {
          guestIds,
          actorName: currentStaff?.nama || 'Staf BK',
        },
      });
      pushToast({
        type: 'info',
        title: `${guestIds.length} Log Tamu Dihapus`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const toggleStaffAvailability = useCallback(
    (staffId: string, status: AvailabilityStatus) => {
      dispatchSharedAction({
        type: 'STAFF_TOGGLE_AVAILABILITY',
        payload: { staffId, status },
      });
      pushToast({
        type: 'info',
        title: 'Status Ketersediaan Diperbarui',
        message: `Status layanan saat ini: ${status}`,
      });
    },
    [dispatchSharedAction, pushToast]
  );

  const upsertStudent = useCallback(
    (student: Omit<Student, 'id'> & { id?: string }) => {
      dispatchSharedAction({
        type: 'STUDENT_UPSERT',
        payload: {
          student,
          newId: uid('std'),
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'success',
        title: 'Data Siswa Tersimpan',
        message: `${student.nama} (${student.kelas}) berhasil disimpan.`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const deleteStudent = useCallback(
    (studentId: string) => {
      dispatchSharedAction({
        type: 'STUDENT_DELETE',
        payload: {
          studentId,
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'info',
        title: 'Data Siswa Dihapus',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const deleteStudentsBulk = useCallback(
    (studentIds: string[]) => {
      dispatchSharedAction({
        type: 'STUDENT_DELETE_BULK',
        payload: {
          studentIds,
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'info',
        title: `${studentIds.length} Data Siswa Dihapus`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const upsertStaff = useCallback(
    (staffMember: Omit<StaffUser, 'id'> & { id?: string }) => {
      dispatchSharedAction({
        type: 'STAFF_UPSERT',
        payload: {
          staffMember,
          newId: uid('staff'),
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'success',
        title: 'Data Guru BK Tersimpan',
        message: `${staffMember.nama} berhasil disimpan.`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
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
      dispatchSharedAction({
        type: 'STAFF_DELETE',
        payload: {
          staffId,
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'info',
        title: 'Data Guru BK Dihapus',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
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
      dispatchSharedAction({
        type: 'STAFF_DELETE_BULK',
        payload: {
          staffIds: safeIds,
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'info',
        title: `${safeIds.length} Akun Guru BK Dihapus`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const importStudents = useCallback(
    (rows: Omit<Student, 'id'>[], mode: 'merge' | 'replace'): number => {
      const withIds: Student[] = rows.map((r) => ({ ...r, id: uid('std') }));
      dispatchSharedAction({
        type: 'STUDENTS_IMPORT',
        payload: {
          rows: withIds,
          mode,
          actorName: currentStaff?.nama || 'Admin',
        },
      });
      pushToast({
        type: 'success',
        title: `Impor Siswa Berhasil`,
        message: `${rows.length} baris data siswa telah diproses ke Data Master.`,
      });
      return rows.length;
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const importGuests = useCallback(
    (
      rows: Omit<GuestVisit, 'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'>[],
      mode: 'merge' | 'replace'
    ): number => {
      dispatchSharedAction({
        type: 'GUESTS_IMPORT',
        payload: {
          rows,
          newIds: rows.map(() => uid('gst')),
          tanggal: getTodayISO(),
          jamMasuk: getCurrentTimeHHMM(),
          queuePrefix: settingsRef.current.guestQueuePrefix || 'TM-',
          mode,
          actorName: currentStaff?.nama || 'Staf BK',
        },
      });
      pushToast({
        type: 'success',
        title: 'Impor Buku Tamu Berhasil',
        message: `${rows.length} data pengunjung ditambahkan.`,
      });
      return rows.length;
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const importFullBackup = useCallback(
    (backupDb: SiBKDatabase, mode: 'merge' | 'replace') => {
      dispatchSharedAction({
        type: 'FULL_BACKUP_IMPORT',
        payload: {
          backupDb,
          mode,
          actorName: currentStaff?.nama || 'Admin',
        },
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
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDatabase();
    dispatchSharedAction({
      type: 'DEMO_DATA_RESET',
      payload: { freshDb: fresh },
    });
    pushToast({
      type: 'info',
      title: 'Data Simulasi Direset',
      message: 'Seluruh data dikembalikan ke kondisi awal demo di semua perangkat.',
    });
  }, [dispatchSharedAction, pushToast]);

  const toggleStudentSecretaryAccess = useCallback(
    (studentId: string, enabled: boolean) => {
      dispatchSharedAction({
        type: 'STUDENT_TOGGLE_SECRETARY',
        payload: {
          studentId,
          enabled,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: enabled ? 'success' : 'info',
        title: enabled ? 'Akses Sekretaris Kelas Aktif' : 'Akses Sekretaris Kelas Dicabut',
        message: enabled
          ? 'Siswa kini dapat menginput data kehadiran harian teman sekelasnya.'
          : 'Menu Sekretaris Kelas disembunyikan dari portal siswa tersebut.',
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
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

      dispatchSharedAction({
        type: 'ATTENDANCE_SUBMIT',
        payload: {
          report,
          actorLabel: `${currentStudent.nama} (${currentStudent.kelas})`,
        },
      });

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
    [
      currentStudent,
      dispatchSharedAction,
      pushToast,
      settings.enableSoundNotification,
      settings.enableTextNotification,
    ]
  );

  const verifyStudentAttendance = useCallback(
    (reportId: string, statusVerifikasi: AttendanceVerifyStatus, catatanGuru?: string) => {
      dispatchSharedAction({
        type: 'ATTENDANCE_VERIFY',
        payload: {
          reportId,
          statusVerifikasi,
          catatanGuru,
          actorName: currentStaff?.nama || 'Guru BK',
        },
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
    [currentStaff, dispatchSharedAction, pushToast, settings.enableSoundNotification]
  );

  const deleteStudentAttendances = useCallback(
    (reportIds: string[]) => {
      dispatchSharedAction({
        type: 'ATTENDANCE_DELETE_BULK',
        payload: {
          reportIds,
          actorName: currentStaff?.nama || 'Guru BK',
        },
      });
      pushToast({
        type: 'info',
        title: `${reportIds.length} Laporan Kehadiran Dihapus`,
      });
    },
    [currentStaff, dispatchSharedAction, pushToast]
  );

  const saveDailyClassAttendance = useCallback(
    (kelas: string, tanggal: string, entries: ClassAttendanceEntry[]) => {
      const actorName = currentStudent
        ? `${currentStudent.nama} (Sekretaris Kelas)`
        : currentStaff?.nama || 'Guru BK';

      const existing = dbRef.current.classAttendances.find(
        (c) => c.kelas === kelas && c.tanggal === tanggal
      );
      const record: DailyClassAttendance = {
        id: existing?.id || uid('cls-att'),
        kelas,
        tanggal,
        inputByStudentId: currentStudent?.id,
        inputByName: actorName,
        entries,
        updatedAt: new Date().toISOString(),
      };

      dispatchSharedAction({
        type: 'CLASS_ATTENDANCE_SAVE',
        payload: { record },
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
    [
      currentStaff,
      currentStudent,
      dispatchSharedAction,
      pushToast,
      settings.enableSoundNotification,
    ]
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

      dispatchSharedAction({
        type: 'CHAT_SEND',
        payload: { message: newMsg },
      });

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
      dispatchSharedAction,
      pushToast,
      settings.enableSoundNotification,
      settings.enableTextNotification,
    ]
  );

  const markChatRead = useCallback(
    (studentId: string, staffId: string, viewerRole: 'student' | 'staff') => {
      const hasUnread = dbRef.current.chats.some(
        (c) =>
          c.studentId === studentId &&
          c.staffId === staffId &&
          ((viewerRole === 'student' && !c.readByStudent) ||
            (viewerRole === 'staff' && !c.readByStaff))
      );
      if (!hasUnread) return;
      dispatchSharedAction({
        type: 'CHAT_MARK_READ',
        payload: { studentId, staffId, viewerRole },
      });
    },
    [dispatchSharedAction]
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
      message:
        'Bunyi lonceng dan banner tulisan akan muncul otomatis saat pesan atau laporan baru masuk.',
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
