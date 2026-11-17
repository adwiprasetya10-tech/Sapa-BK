import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createInitialDatabase,
  getCurrentTimeHHMM,
  getTodayISO,
} from '../data/seedData';
import {
  ActivityLog,
  AppThemeId,
  AuthSession,
  AvailabilityStatus,
  CounselingCategory,
  CounselingNote,
  CounselingRequest,
  GuestVisit,
  ProgressStatus,
  SiBKDatabase,
  StaffUser,
  Student,
  ToastMessage,
  UrgencyLevel,
  VisitorCategory,
} from '../types/sibk';
import { getThemeMeta } from '../utils/themeRegistry';

const DB_STORAGE_KEY = 'sibk_database_v2';
const SESSION_STORAGE_KEY = 'sibk_session_v2';
const THEME_STORAGE_KEY = 'sibk_theme_v1';

interface SiBKContextValue {
  db: SiBKDatabase;
  session: AuthSession;
  theme: AppThemeId;
  setTheme: (themeId: AppThemeId) => void;
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
}

const SiBKContext = createContext<SiBKContextValue | null>(null);

function loadDatabase(): SiBKDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SiBKDatabase;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.staff)) {
        const hasLegacyStaff = parsed.staff.some((s) =>
          ['staff-admin', 'staff-sari', 'staff-rizky', 'staff-nadia'].includes(s.id)
        );
        if (!hasLegacyStaff && parsed.staff.length > 0) {
          return parsed;
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DB_STORAGE_KEY && e.newValue) {
        try {
          setDb(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
      return { ok: true };
    },
    [db.students, pushToast]
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
      return { ok: true };
    },
    [db.staff, pushToast]
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
      const nomorAntrean = `TM-${String(todayCount).padStart(3, '0')}`;
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
    [db.guests, pushToast]
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
    [currentStaff, pushToast]
  );

  const importGuests = useCallback(
    (
      rows: Omit<GuestVisit, 'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'>[],
      mode: 'merge' | 'replace'
    ): number => {
      const today = getTodayISO();
      const nowTime = getCurrentTimeHHMM();
      setDb((prev) => {
        const baseCount =
          mode === 'replace' ? 0 : prev.guests.filter((g) => g.tanggal === today).length;
        const imported: GuestVisit[] = rows.map((r, idx) => ({
          id: uid('gst'),
          nomorAntrean: `TM-${String(baseCount + idx + 1).padStart(3, '0')}`,
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
    [currentStaff, pushToast]
  );

  const importFullBackup = useCallback(
    (backupDb: SiBKDatabase, mode: 'merge' | 'replace') => {
      setDb((prev) => {
        if (mode === 'replace') {
          return {
            ...backupDb,
            activities: appendActivity(
              backupDb,
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

  return (
    <SiBKContext.Provider
      value={{
        db,
        session,
        theme,
        setTheme,
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
