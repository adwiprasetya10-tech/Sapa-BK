import { createInitialDatabase, getCurrentTimeHHMM, getTodayISO } from '../data/seedData.ts';
import type {
  ActivityLog,
  AppSettings,
  AttendanceVerifyStatus,
  AvailabilityStatus,
  ChatMessage,
  CounselingNote,
  CounselingRequest,
  DailyClassAttendance,
  GuestVisit,
  SiBKDatabase,
  StaffUser,
  Student,
  StudentAttendanceReport,
} from '../types/sibk.ts';
import { DEFAULT_APP_SETTINGS } from '../utils/appSettings.ts';

export interface SiBKSharedState {
  db: SiBKDatabase;
  settings: AppSettings;
}

export type SiBKAction =
  | {
      type: 'REQUEST_SUBMIT';
      payload: {
        request: CounselingRequest;
        actorLabel: string;
        targetGuruName: string;
      };
    }
  | {
      type: 'REQUEST_SCHEDULE';
      payload: {
        requestId: string;
        jadwalTanggal: string;
        jadwalJam: string;
        ruangPertemuan: string;
        catatanGuru: string;
        actorName: string;
      };
    }
  | {
      type: 'REQUEST_UPDATE';
      payload: {
        requestId: string;
        updates: Partial<CounselingRequest>;
        actorName: string;
      };
    }
  | {
      type: 'REQUEST_DELETE_BULK';
      payload: { requestIds: string[]; actorName: string };
    }
  | {
      type: 'REQUEST_COMPLETE_BULK';
      payload: { requestIds: string[]; actorName: string };
    }
  | {
      type: 'REQUEST_TRANSFER';
      payload: {
        requestId: string;
        newGuruId: string;
        alasan: string;
        actorName: string;
        targetGuruName: string;
      };
    }
  | {
      type: 'REQUEST_COMPLETE';
      payload: {
        requestId: string;
        catatanGuru?: string;
        actorName: string;
      };
    }
  | {
      type: 'NOTE_ADD';
      payload: { note: CounselingNote; actorName: string };
    }
  | {
      type: 'NOTE_UPDATE';
      payload: {
        noteId: string;
        updates: Partial<CounselingNote>;
        actorName: string;
      };
    }
  | {
      type: 'NOTE_DELETE';
      payload: { noteId: string; actorName: string };
    }
  | {
      type: 'GUEST_REGISTER';
      payload: { visit: GuestVisit; queuePrefix: string };
    }
  | {
      type: 'GUEST_UPDATE';
      payload: {
        guestId: string;
        updates: Partial<GuestVisit>;
        actorName: string;
      };
    }
  | {
      type: 'GUEST_COMPLETE';
      payload: { guestId: string; jamKeluar: string; actorName: string };
    }
  | {
      type: 'GUEST_COMPLETE_BULK';
      payload: { guestIds: string[]; jamKeluar: string; actorName: string };
    }
  | {
      type: 'GUEST_DELETE_BULK';
      payload: { guestIds: string[]; actorName: string };
    }
  | {
      type: 'STAFF_TOGGLE_AVAILABILITY';
      payload: { staffId: string; status: AvailabilityStatus };
    }
  | {
      type: 'STUDENT_UPSERT';
      payload: {
        student: Omit<Student, 'id'> & { id?: string };
        newId: string;
        actorName: string;
      };
    }
  | {
      type: 'STUDENT_DELETE';
      payload: { studentId: string; actorName: string };
    }
  | {
      type: 'STUDENT_DELETE_BULK';
      payload: { studentIds: string[]; actorName: string };
    }
  | {
      type: 'STAFF_UPSERT';
      payload: {
        staffMember: Omit<StaffUser, 'id'> & { id?: string };
        newId: string;
        actorName: string;
      };
    }
  | {
      type: 'STAFF_DELETE';
      payload: { staffId: string; actorName: string };
    }
  | {
      type: 'STAFF_DELETE_BULK';
      payload: { staffIds: string[]; actorName: string };
    }
  | {
      type: 'STUDENTS_IMPORT';
      payload: {
        rows: Student[];
        mode: 'merge' | 'replace';
        actorName: string;
      };
    }
  | {
      type: 'GUESTS_IMPORT';
      payload: {
        rows: Omit<
          GuestVisit,
          'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'
        >[];
        newIds: string[];
        tanggal: string;
        jamMasuk: string;
        queuePrefix: string;
        mode: 'merge' | 'replace';
        actorName: string;
      };
    }
  | {
      type: 'FULL_BACKUP_IMPORT';
      payload: {
        backupDb: SiBKDatabase;
        mode: 'merge' | 'replace';
        actorName: string;
      };
    }
  | {
      type: 'DEMO_DATA_RESET';
      payload: { freshDb: SiBKDatabase };
    }
  | {
      type: 'STUDENT_TOGGLE_SECRETARY';
      payload: { studentId: string; enabled: boolean; actorName: string };
    }
  | {
      type: 'ATTENDANCE_SUBMIT';
      payload: { report: StudentAttendanceReport; actorLabel: string };
    }
  | {
      type: 'ATTENDANCE_VERIFY';
      payload: {
        reportId: string;
        statusVerifikasi: AttendanceVerifyStatus;
        catatanGuru?: string;
        actorName: string;
      };
    }
  | {
      type: 'ATTENDANCE_DELETE_BULK';
      payload: { reportIds: string[]; actorName: string };
    }
  | {
      type: 'CLASS_ATTENDANCE_SAVE';
      payload: { record: DailyClassAttendance };
    }
  | {
      type: 'CHAT_SEND';
      payload: { message: ChatMessage };
    }
  | {
      type: 'CHAT_MARK_READ';
      payload: {
        studentId: string;
        staffId: string;
        viewerRole: 'student' | 'staff';
      };
    }
  | {
      type: 'SETTINGS_UPDATE';
      payload: { updates: Partial<AppSettings> };
    }
  | {
      type: 'SETTINGS_REPLACE';
      payload: { next: AppSettings };
    }
  | {
      type: 'SETTINGS_RESET';
    };

function actUid(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendActivity(
  prev: SiBKDatabase,
  actor: string,
  type: ActivityLog['type'],
  description: string
): ActivityLog[] {
  const entry: ActivityLog = {
    id: actUid(),
    timestamp: getCurrentTimeHHMM(),
    tanggal: getTodayISO(),
    actor,
    type,
    description,
  };
  return [entry, ...prev.activities].slice(0, 40);
}

export function normalizeDatabase(rawDb: Partial<SiBKDatabase>): SiBKDatabase {
  const initial = createInitialDatabase();
  const initialById = new Map(initial.students.map((s) => [s.id, s]));
  const isFirstAttendanceMigration =
    !Array.isArray(rawDb.studentAttendances) &&
    !Array.isArray(rawDb.classAttendances) &&
    !Array.isArray(rawDb.chats);

  const baseStudents = Array.isArray(rawDb.students)
    ? rawDb.students
    : initial.students;
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

export function normalizeAppSettings(
  raw?: Partial<AppSettings> | null
): AppSettings {
  if (!raw) return DEFAULT_APP_SETTINGS;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...raw,
    extraGuestTargets: Array.isArray(raw.extraGuestTargets)
      ? raw.extraGuestTargets
      : DEFAULT_APP_SETTINGS.extraGuestTargets,
  };
}

export function applySiBKAction(
  state: SiBKSharedState,
  action: SiBKAction
): SiBKSharedState {
  const prev = state.db;

  switch (action.type) {
    case 'REQUEST_SUBMIT': {
      const { request, actorLabel, targetGuruName } = action.payload;
      if (prev.requests.some((r) => r.id === request.id)) return state;
      return {
        ...state,
        db: {
          ...prev,
          requests: [request, ...prev.requests],
          activities: appendActivity(
            prev,
            actorLabel,
            'request',
            `Mengajukan layanan ${request.jenisKeperluan} (${request.tingkatUrgensi}) kepada ${targetGuruName}.`
          ),
        },
      };
    }

    case 'REQUEST_SCHEDULE': {
      const {
        requestId,
        jadwalTanggal,
        jadwalJam,
        ruangPertemuan,
        catatanGuru,
        actorName,
      } = action.payload;
      const req = prev.requests.find((r) => r.id === requestId);
      const student = prev.students.find((s) => s.id === req?.studentId);
      return {
        ...state,
        db: {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'Dijadwalkan',
                  jadwalTanggal,
                  jadwalJam,
                  ruangPertemuan,
                  catatanGuru,
                }
              : r
          ),
          activities: appendActivity(
            prev,
            actorName,
            'schedule',
            `Menjadwalkan sesi konseling untuk ${student?.nama || 'Siswa'} pada ${jadwalTanggal} pukul ${jadwalJam}.`
          ),
        },
      };
    }

    case 'REQUEST_UPDATE': {
      const { requestId, updates, actorName } = action.payload;
      return {
        ...state,
        db: {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId ? { ...r, ...updates } : r
          ),
          activities: appendActivity(
            prev,
            actorName,
            'schedule',
            `Memperbarui detail permohonan konseling.`
          ),
        },
      };
    }

    case 'REQUEST_DELETE_BULK': {
      const idSet = new Set(action.payload.requestIds);
      return {
        ...state,
        db: {
          ...prev,
          requests: prev.requests.filter((r) => !idSet.has(r.id)),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'schedule',
            `Menghapus ${action.payload.requestIds.length} data antrean konseling.`
          ),
        },
      };
    }

    case 'REQUEST_COMPLETE_BULK': {
      const idSet = new Set(action.payload.requestIds);
      return {
        ...state,
        db: {
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
            action.payload.actorName,
            'schedule',
            `Menyelesaikan ${action.payload.requestIds.length} permohonan konseling terpilih.`
          ),
        },
      };
    }

    case 'REQUEST_TRANSFER': {
      const { requestId, newGuruId, alasan, actorName, targetGuruName } =
        action.payload;
      const req = prev.requests.find((r) => r.id === requestId);
      const student = prev.students.find((s) => s.id === req?.studentId);
      return {
        ...state,
        db: {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  guruTujuanId: newGuruId,
                  catatanPengalihan: `Dialihkan dari ${actorName}: ${alasan}`,
                }
              : r
          ),
          activities: appendActivity(
            prev,
            actorName,
            'schedule',
            `Mengalihkan permohonan ${student?.nama || 'Siswa'} kepada ${targetGuruName}.`
          ),
        },
      };
    }

    case 'REQUEST_COMPLETE': {
      const { requestId, catatanGuru, actorName } = action.payload;
      const req = prev.requests.find((r) => r.id === requestId);
      const student = prev.students.find((s) => s.id === req?.studentId);
      return {
        ...state,
        db: {
          ...prev,
          requests: prev.requests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: 'Selesai',
                  catatanGuru:
                    catatanGuru || r.catatanGuru || 'Sesi konseling telah dilaksanakan.',
                }
              : r
          ),
          activities: appendActivity(
            prev,
            actorName,
            'schedule',
            `Menyelesaikan sesi ${req?.jenisKeperluan || 'konseling'} untuk ${student?.nama || 'Siswa'}.`
          ),
        },
      };
    }

    case 'NOTE_ADD': {
      const { note, actorName } = action.payload;
      if (prev.notes.some((n) => n.id === note.id)) return state;
      const student = prev.students.find((s) => s.id === note.studentId);
      const updatedRequests = note.requestId
        ? prev.requests.map((r) =>
            r.id === note.requestId
              ? {
                  ...r,
                  status: 'Selesai' as const,
                  catatanGuru:
                    r.catatanGuru || 'Sesi selesai dan tercatat dalam rekam jejak BK.',
                }
              : r
          )
        : prev.requests;

      return {
        ...state,
        db: {
          ...prev,
          notes: [note, ...prev.notes],
          requests: updatedRequests,
          activities: appendActivity(
            prev,
            actorName,
            'note',
            `Menambahkan catatan ${note.isRahasia ? 'rahasia ' : ''}(${note.statusPerkembangan}) pada ${student?.nama || 'Siswa'}.`
          ),
        },
      };
    }

    case 'NOTE_UPDATE': {
      const { noteId, updates, actorName } = action.payload;
      return {
        ...state,
        db: {
          ...prev,
          notes: prev.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
          activities: appendActivity(
            prev,
            actorName,
            'note',
            `Memperbarui catatan konseling siswa.`
          ),
        },
      };
    }

    case 'NOTE_DELETE': {
      return {
        ...state,
        db: {
          ...prev,
          notes: prev.notes.filter((n) => n.id !== action.payload.noteId),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'note',
            `Menghapus satu entri catatan konseling.`
          ),
        },
      };
    }

    case 'GUEST_REGISTER': {
      const { visit, queuePrefix } = action.payload;
      if (prev.guests.some((g) => g.id === visit.id)) return state;
      const rawPrefix = (queuePrefix || 'TM-').trim().toUpperCase();
      const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
      const todayCount =
        prev.guests.filter((g) => g.tanggal === visit.tanggal).length + 1;
      const nomorAntrean = `${prefix}${String(todayCount).padStart(3, '0')}`;
      const normalizedVisit: GuestVisit = {
        ...visit,
        nomorAntrean,
      };
      return {
        ...state,
        db: {
          ...prev,
          guests: [normalizedVisit, ...prev.guests],
          activities: appendActivity(
            prev,
            `${normalizedVisit.namaLengkap} (${normalizedVisit.kategori})`,
            'guest',
            `Check-in Buku Tamu Digital (${normalizedVisit.nomorAntrean}) menemui ${normalizedVisit.pihakDituju}.`
          ),
        },
      };
    }

    case 'GUEST_UPDATE': {
      const { guestId, updates, actorName } = action.payload;
      return {
        ...state,
        db: {
          ...prev,
          guests: prev.guests.map((g) =>
            g.id === guestId ? { ...g, ...updates } : g
          ),
          activities: appendActivity(
            prev,
            actorName,
            'guest',
            `Memperbarui data kunjungan tamu.`
          ),
        },
      };
    }

    case 'GUEST_COMPLETE': {
      const { guestId, jamKeluar, actorName } = action.payload;
      const guest = prev.guests.find((g) => g.id === guestId);
      return {
        ...state,
        db: {
          ...prev,
          guests: prev.guests.map((g) =>
            g.id === guestId ? { ...g, status: 'Selesai', jamKeluar } : g
          ),
          activities: appendActivity(
            prev,
            actorName,
            'guest',
            `Menandai kunjungan ${guest?.namaLengkap || 'Tamu'} (${guest?.nomorAntrean || ''}) selesai pada ${jamKeluar}.`
          ),
        },
      };
    }

    case 'GUEST_COMPLETE_BULK': {
      const { guestIds, jamKeluar, actorName } = action.payload;
      const idSet = new Set(guestIds);
      return {
        ...state,
        db: {
          ...prev,
          guests: prev.guests.map((g) =>
            idSet.has(g.id)
              ? { ...g, status: 'Selesai', jamKeluar: g.jamKeluar || jamKeluar }
              : g
          ),
          activities: appendActivity(
            prev,
            actorName,
            'guest',
            `Menandai ${guestIds.length} kunjungan tamu selesai.`
          ),
        },
      };
    }

    case 'GUEST_DELETE_BULK': {
      const idSet = new Set(action.payload.guestIds);
      return {
        ...state,
        db: {
          ...prev,
          guests: prev.guests.filter((g) => !idSet.has(g.id)),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'guest',
            `Menghapus ${action.payload.guestIds.length} entri log buku tamu.`
          ),
        },
      };
    }

    case 'STAFF_TOGGLE_AVAILABILITY': {
      const { staffId, status } = action.payload;
      return {
        ...state,
        db: {
          ...prev,
          staff: prev.staff.map((g) =>
            g.id === staffId ? { ...g, statusKetersediaan: status } : g
          ),
        },
      };
    }

    case 'STUDENT_UPSERT': {
      const { student, newId, actorName } = action.payload;
      const exists = Boolean(
        student.id && prev.students.some((s) => s.id === student.id)
      );
      const updatedStudents = exists
        ? prev.students.map((s) =>
            s.id === student.id ? ({ ...student, id: student.id } as Student) : s
          )
        : prev.students.some((s) => s.id === newId)
        ? prev.students
        : [{ ...student, id: newId }, ...prev.students];

      return {
        ...state,
        db: {
          ...prev,
          students: updatedStudents,
          activities: appendActivity(
            prev,
            actorName,
            'master',
            `${exists ? 'Memperbarui' : 'Menambahkan'} data siswa ${student.nama} (${student.kelas}).`
          ),
        },
      };
    }

    case 'STUDENT_DELETE': {
      const { studentId, actorName } = action.payload;
      const target = prev.students.find((s) => s.id === studentId);
      return {
        ...state,
        db: {
          ...prev,
          students: prev.students.filter((s) => s.id !== studentId),
          activities: appendActivity(
            prev,
            actorName,
            'master',
            `Menghapus data siswa ${target?.nama || studentId}.`
          ),
        },
      };
    }

    case 'STUDENT_DELETE_BULK': {
      const idSet = new Set(action.payload.studentIds);
      return {
        ...state,
        db: {
          ...prev,
          students: prev.students.filter((s) => !idSet.has(s.id)),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'master',
            `Menghapus ${action.payload.studentIds.length} data siswa terpilih.`
          ),
        },
      };
    }

    case 'STAFF_UPSERT': {
      const { staffMember, newId, actorName } = action.payload;
      const exists = Boolean(
        staffMember.id && prev.staff.some((g) => g.id === staffMember.id)
      );
      const updatedStaff = exists
        ? prev.staff.map((g) =>
            g.id === staffMember.id
              ? ({ ...staffMember, id: staffMember.id } as StaffUser)
              : g
          )
        : prev.staff.some((g) => g.id === newId)
        ? prev.staff
        : [...prev.staff, { ...staffMember, id: newId }];

      return {
        ...state,
        db: {
          ...prev,
          staff: updatedStaff,
          activities: appendActivity(
            prev,
            actorName,
            'master',
            `${exists ? 'Memperbarui' : 'Menambahkan'} akun ${staffMember.nama}.`
          ),
        },
      };
    }

    case 'STAFF_DELETE': {
      const { staffId, actorName } = action.payload;
      const target = prev.staff.find((g) => g.id === staffId);
      return {
        ...state,
        db: {
          ...prev,
          staff: prev.staff.filter((g) => g.id !== staffId),
          activities: appendActivity(
            prev,
            actorName,
            'master',
            `Menghapus akun Guru BK ${target?.nama || staffId}.`
          ),
        },
      };
    }

    case 'STAFF_DELETE_BULK': {
      const idSet = new Set(action.payload.staffIds);
      return {
        ...state,
        db: {
          ...prev,
          staff: prev.staff.filter((g) => !idSet.has(g.id)),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'master',
            `Menghapus ${action.payload.staffIds.length} akun Guru BK terpilih.`
          ),
        },
      };
    }

    case 'STUDENTS_IMPORT': {
      const { rows, mode, actorName } = action.payload;
      if (mode === 'replace') {
        return {
          ...state,
          db: {
            ...prev,
            students: rows,
            activities: appendActivity(
              prev,
              actorName,
              'master',
              `Mengimpor & mengganti data master siswa (${rows.length} siswa).`
            ),
          },
        };
      }
      const existingNis = new Set(prev.students.map((s) => s.nis));
      const newOnes = rows.filter((s) => !existingNis.has(s.nis));
      const updated = prev.students.map((s) => {
        const match = rows.find((w) => w.nis === s.nis);
        return match ? { ...s, ...match, id: s.id } : s;
      });
      return {
        ...state,
        db: {
          ...prev,
          students: [...newOnes, ...updated],
          activities: appendActivity(
            prev,
            actorName,
            'master',
            `Mengimpor ${rows.length} data siswa (Mode Gabung).`
          ),
        },
      };
    }

    case 'GUESTS_IMPORT': {
      const { rows, newIds, tanggal, jamMasuk, queuePrefix, mode, actorName } =
        action.payload;
      const rawPrefix = (queuePrefix || 'TM-').trim().toUpperCase();
      const prefix = rawPrefix.endsWith('-') ? rawPrefix : `${rawPrefix}-`;
      const baseCount =
        mode === 'replace'
          ? 0
          : prev.guests.filter((g) => g.tanggal === tanggal).length;

      const imported: GuestVisit[] = rows.map((r, idx) => ({
        id: newIds[idx] || `gst-${Date.now()}-${idx}`,
        nomorAntrean: `${prefix}${String(baseCount + idx + 1).padStart(3, '0')}`,
        namaLengkap: r.namaLengkap,
        kategori: r.kategori,
        namaSiswaTerkait: r.namaSiswaTerkait,
        noWhatsApp: r.noWhatsApp,
        pihakDituju: r.pihakDituju,
        keperluan: r.keperluan,
        tanggal,
        jamMasuk,
        status: 'Berkunjung',
      }));

      return {
        ...state,
        db: {
          ...prev,
          guests: mode === 'replace' ? imported : [...imported, ...prev.guests],
          activities: appendActivity(
            prev,
            actorName,
            'guest',
            `Mengimpor ${imported.length} log kunjungan buku tamu.`
          ),
        },
      };
    }

    case 'FULL_BACKUP_IMPORT': {
      const { backupDb, mode, actorName } = action.payload;
      if (mode === 'replace') {
        const normalized = normalizeDatabase(backupDb);
        return {
          ...state,
          db: {
            ...normalized,
            activities: appendActivity(
              normalized,
              actorName,
              'master',
              'Memulihkan seluruh database dari file cadangan JSON.'
            ),
          },
        };
      }
      const mergeById = <T extends { id: string }>(curr: T[], incoming: T[]): T[] => {
        const map = new Map(curr.map((item) => [item.id, item]));
        incoming.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      };
      return {
        ...state,
        db: {
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
            actorName,
            'master',
            'Menggabungkan data cadangan JSON ke database aktif.'
          ),
        },
      };
    }

    case 'DEMO_DATA_RESET': {
      return {
        ...state,
        db: action.payload.freshDb,
      };
    }

    case 'STUDENT_TOGGLE_SECRETARY': {
      const { studentId, enabled, actorName } = action.payload;
      const target = prev.students.find((s) => s.id === studentId);
      return {
        ...state,
        db: {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, isSekretarisKelas: enabled } : s
          ),
          activities: appendActivity(
            prev,
            actorName,
            'attendance',
            `${enabled ? 'Memberikan' : 'Mencabut'} akses Sekretaris Kelas untuk ${target?.nama || 'Siswa'} (${target?.kelas || '-'}).`
          ),
        },
      };
    }

    case 'ATTENDANCE_SUBMIT': {
      const { report, actorLabel } = action.payload;
      if (prev.studentAttendances.some((a) => a.id === report.id)) return state;
      return {
        ...state,
        db: {
          ...prev,
          studentAttendances: [report, ...prev.studentAttendances],
          activities: appendActivity(
            prev,
            actorLabel,
            'attendance',
            `Mengirim info kehadiran (${report.status})${report.fotoLampiranDataUrl ? ' beserta foto lampiran' : ''}.`
          ),
        },
      };
    }

    case 'ATTENDANCE_VERIFY': {
      const { reportId, statusVerifikasi, catatanGuru, actorName } = action.payload;
      const target = prev.studentAttendances.find((a) => a.id === reportId);
      const st = prev.students.find((s) => s.id === target?.studentId);
      return {
        ...state,
        db: {
          ...prev,
          studentAttendances: prev.studentAttendances.map((a) =>
            a.id === reportId
              ? {
                  ...a,
                  statusVerifikasi,
                  catatanGuru: catatanGuru?.trim() || a.catatanGuru,
                  verifiedBy: actorName,
                }
              : a
          ),
          activities: appendActivity(
            prev,
            actorName,
            'attendance',
            `Menandai info kehadiran ${st?.nama || 'Siswa'} sebagai "${statusVerifikasi}".`
          ),
        },
      };
    }

    case 'ATTENDANCE_DELETE_BULK': {
      const idSet = new Set(action.payload.reportIds);
      return {
        ...state,
        db: {
          ...prev,
          studentAttendances: prev.studentAttendances.filter((a) => !idSet.has(a.id)),
          activities: appendActivity(
            prev,
            action.payload.actorName,
            'attendance',
            `Menghapus ${action.payload.reportIds.length} laporan kehadiran siswa.`
          ),
        },
      };
    }

    case 'CLASS_ATTENDANCE_SAVE': {
      const { record } = action.payload;
      const existingIndex = prev.classAttendances.findIndex(
        (c) => c.kelas === record.kelas && c.tanggal === record.tanggal
      );
      const updatedList =
        existingIndex >= 0
          ? prev.classAttendances.map((c, idx) =>
              idx === existingIndex ? { ...record, id: c.id } : c
            )
          : [record, ...prev.classAttendances];

      return {
        ...state,
        db: {
          ...prev,
          classAttendances: updatedList,
          activities: appendActivity(
            prev,
            record.inputByName,
            'attendance',
            `Menyimpan presensi harian kelas ${record.kelas} tanggal ${record.tanggal} (${record.entries.length} siswa).`
          ),
        },
      };
    }

    case 'CHAT_SEND': {
      const { message } = action.payload;
      if (prev.chats.some((c) => c.id === message.id)) return state;
      return {
        ...state,
        db: {
          ...prev,
          chats: [...prev.chats, message],
          activities: appendActivity(
            prev,
            message.senderName,
            'chat',
            `Mengirim pesan konsultasi ${message.senderRole === 'student' ? 'ke Guru BK' : 'ke Siswa'}.`
          ),
        },
      };
    }

    case 'CHAT_MARK_READ': {
      const { studentId, staffId, viewerRole } = action.payload;
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
      if (!changed) return state;
      return {
        ...state,
        db: {
          ...prev,
          chats: nextChats,
        },
      };
    }

    case 'SETTINGS_UPDATE': {
      return {
        ...state,
        settings: normalizeAppSettings({
          ...state.settings,
          ...action.payload.updates,
        }),
      };
    }

    case 'SETTINGS_REPLACE': {
      return {
        ...state,
        settings: normalizeAppSettings(action.payload.next),
      };
    }

    case 'SETTINGS_RESET': {
      return {
        ...state,
        settings: DEFAULT_APP_SETTINGS,
      };
    }

    default:
      return state;
  }
}
