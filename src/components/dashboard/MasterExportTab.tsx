import React, { useState } from 'react';
import {
  Download,
  Edit3,
  FileJson,
  FileSpreadsheet,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { getTodayISO } from '../../data/seedData';
import { PrintReportSection } from './PrintReportSection';
import {
  AvailabilityStatus,
  SiBKDatabase,
  StaffRole,
  StaffUser,
  Student,
} from '../../types/sibk';
import { exportSiBKReportCSV } from '../../utils/csvExport';
import {
  downloadGuestCSVTemplate,
  downloadStudentCSVTemplate,
  exportFullBackupJSON,
  exportStaffCSV,
  exportStudentsCSV,
  parseCsvRows,
} from '../../utils/dataTransfer';

type SubTab = 'siswa' | 'guru' | 'laporan';

export const MasterExportTab: React.FC<{ initialSubTab?: SubTab }> = ({
  initialSubTab = 'siswa',
}) => {
  const {
    db,
    currentStaff,
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
    pushToast,
  } = useSiBK();

  const isAdmin = currentStaff?.role === 'admin';
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab);

  React.useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);
  const [reportMonth, setReportMonth] = useState<string>(getTodayISO().slice(0, 7));
  const [confirmReset, setConfirmReset] = useState(false);

  // Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [confirmDeleteStudentIds, setConfirmDeleteStudentIds] = useState<string[] | null>(
    null
  );
  const [confirmDeleteStaffIds, setConfirmDeleteStaffIds] = useState<string[] | null>(
    null
  );

  // Student Modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({});

  // Staff Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffUser>>({});

  // Import Hub state
  const [importTarget, setImportTarget] = useState<'students' | 'guests' | 'backup'>(
    'students'
  );
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [previewInfo, setPreviewInfo] = useState<{
    fileName: string;
    countLabel: string;
    studentRows?: Omit<Student, 'id'>[];
    guestRows?: Parameters<typeof importGuests>[0];
    backupDb?: SiBKDatabase;
  } | null>(null);

  const visibleStudents = isAdmin
    ? db.students
    : db.students.filter((s) => s.guruBkId === currentStaff?.id);

  // Student Selection Handlers
  const allStudentsSelected =
    visibleStudents.length > 0 &&
    visibleStudents.every((s) => selectedStudentIds.includes(s.id));

  const toggleAllStudents = () => {
    setSelectedStudentIds(
      allStudentsSelected ? [] : visibleStudents.map((s) => s.id)
    );
  };

  const toggleOneStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Staff Selection Handlers
  const allStaffSelected =
    db.staff.length > 0 && db.staff.every((g) => selectedStaffIds.includes(g.id));

  const toggleAllStaff = () => {
    setSelectedStaffIds(allStaffSelected ? [] : db.staff.map((g) => g.id));
  };

  const toggleOneStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const openAddStudent = () => {
    setEditingStudent({
      nis: '',
      nisn: '',
      nama: '',
      kelas: 'X Merdeka 1',
      jenisKelamin: 'P',
      namaWali: '',
      noHpWali: '',
      guruBkId: currentStaff?.id || db.staff[1]?.id || db.staff[0]?.id || '',
    });
    setStudentModalOpen(true);
  };

  const openEditStudent = (s: Student) => {
    setEditingStudent({ ...s });
    setStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent.nis || !editingStudent.nisn || !editingStudent.nama || !editingStudent.kelas) {
      return;
    }
    upsertStudent({
      id: editingStudent.id,
      nis: editingStudent.nis,
      nisn: editingStudent.nisn,
      nama: editingStudent.nama,
      kelas: editingStudent.kelas,
      jenisKelamin: editingStudent.jenisKelamin || 'P',
      namaWali: editingStudent.namaWali || '-',
      noHpWali: editingStudent.noHpWali || '-',
      guruBkId: editingStudent.guruBkId || db.staff[0]?.id || '',
    });
    setStudentModalOpen(false);
  };

  const openAddStaff = () => {
    setEditingStaff({
      nip: '',
      username: '',
      password: '123',
      nama: '',
      role: 'guru_bk',
      jabatan: 'Guru BK',
      spesialisasi: 'Konseling Umum',
      statusKetersediaan: 'Tersedia',
      ruang: 'Ruang Konseling',
    });
    setStaffModalOpen(true);
  };

  const openEditStaff = (g: StaffUser) => {
    setEditingStaff({ ...g });
    setStaffModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff.nip || !editingStaff.username || !editingStaff.nama || !editingStaff.password) {
      return;
    }
    upsertStaff({
      id: editingStaff.id,
      nip: editingStaff.nip,
      username: editingStaff.username,
      password: editingStaff.password,
      nama: editingStaff.nama,
      role: (editingStaff.role as StaffRole) || 'guru_bk',
      jabatan: editingStaff.jabatan || 'Guru BK',
      spesialisasi: editingStaff.spesialisasi || 'Layanan Bimbingan Konseling',
      statusKetersediaan:
        (editingStaff.statusKetersediaan as AvailabilityStatus) || 'Tersedia',
      ruang: editingStaff.ruang || 'Ruang Konseling',
    });
    setStaffModalOpen(false);
  };

  const handleExportCSV = () => {
    exportSiBKReportCSV({
      monthPrefix: reportMonth || 'all',
      students: db.students,
      staff: db.staff,
      requests: db.requests,
      notes: db.notes,
      guests: db.guests,
    });
    pushToast({
      type: 'success',
      title: 'Laporan CSV/Excel Diunduh',
      message: `File Laporan_SiBK_${reportMonth || 'all'}.csv berhasil dibuat.`,
    });
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      if (importTarget === 'backup' || file.name.toLowerCase().endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const candidateDb: SiBKDatabase = parsed.data || parsed;
          if (!Array.isArray(candidateDb.students) || !Array.isArray(candidateDb.staff)) {
            throw new Error('Struktur JSON bukan cadangan SiBK.');
          }
          setImportTarget('backup');
          setPreviewInfo({
            fileName: file.name,
            countLabel: `${candidateDb.students.length} siswa · ${candidateDb.requests?.length || 0} antrean · ${candidateDb.notes?.length || 0} catatan · ${candidateDb.guests?.length || 0} tamu`,
            backupDb: candidateDb,
          });
        } catch {
          pushToast({
            type: 'error',
            title: 'File JSON Tidak Valid',
            message: 'Pastikan Anda memilih file backup SiBK (*.json) yang benar.',
          });
        }
        return;
      }

      const rows = parseCsvRows(content);
      if (rows.length < 2) {
        pushToast({
          type: 'error',
          title: 'File CSV Kosong',
          message: 'Minimal terdapat 1 baris header dan 1 baris data.',
        });
        return;
      }

      if (importTarget === 'students') {
        const defaultAdvisor = currentStaff?.id || db.staff[1]?.id || db.staff[0]?.id || '';
        const studentRows: Omit<Student, 'id'>[] = rows.slice(1).map((cols) => ({
          nis: cols[0] || `2025${Math.floor(100 + Math.random() * 899)}`,
          nisn: cols[1] || `008${Math.floor(1000000 + Math.random() * 8999999)}`,
          nama: cols[2] || 'Siswa Baru',
          kelas: cols[3] || 'X Merdeka 1',
          jenisKelamin: cols[4]?.toUpperCase() === 'L' ? 'L' : 'P',
          namaWali: cols[5] || '-',
          noHpWali: cols[6] || '-',
          guruBkId: defaultAdvisor,
        }));
        setPreviewInfo({
          fileName: file.name,
          countLabel: `${studentRows.length} data siswa siap diimpor`,
          studentRows,
        });
      } else {
        const guestRows = rows.slice(1).map((cols) => ({
          namaLengkap: cols[0] || 'Tamu',
          kategori: (['Wali Murid', 'Instansi/Dinas', 'Alumni', 'Umum'].includes(cols[1])
            ? cols[1]
            : 'Umum') as 'Wali Murid' | 'Instansi/Dinas' | 'Alumni' | 'Umum',
          namaSiswaTerkait: cols[2] && cols[2] !== '-' ? cols[2] : undefined,
          noWhatsApp: cols[3] || '-',
          pihakDituju: cols[4] || db.staff[0]?.nama || 'Guru BK',
          keperluan: cols[5] || 'Kunjungan sekolah',
        }));
        setPreviewInfo({
          fileName: file.name,
          countLabel: `${guestRows.length} log tamu siap diimpor`,
          guestRows,
        });
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (!previewInfo) return;
    if (previewInfo.backupDb) {
      importFullBackup(previewInfo.backupDb, importMode);
    } else if (previewInfo.studentRows) {
      importStudents(previewInfo.studentRows, importMode);
    } else if (previewInfo.guestRows) {
      importGuests(previewInfo.guestRows, importMode);
    }
    setPreviewInfo(null);
  };

  const monthFilter = (dateStr: string) =>
    !reportMonth || reportMonth === 'all' ? true : dateStr.startsWith(reportMonth);

  const reportRequests = db.requests.filter((r) => monthFilter(r.tanggalPengajuan));
  const reportNotes = db.notes.filter((n) => monthFilter(n.tanggal));
  const reportGuests = db.guests.filter((g) => monthFilter(g.tanggal));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Data Master, Ekspor & Impor
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih, edit, hapus, ekspor CSV/JSON, impor data massal, dan cetak laporan bulanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Demo</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-1.5">
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                Kembalikan data awal?
              </span>
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setConfirmReset(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="no-print flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setSubTab('siswa')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            subTab === 'siswa'
              ? 'sibk-btn-primary shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Siswa ({visibleStudents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('guru')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            subTab === 'guru'
              ? 'sibk-btn-primary shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Data Guru BK ({db.staff.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('laporan')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            subTab === 'laporan'
              ? 'sibk-btn-primary shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor, Impor & Laporan</span>
        </button>
      </div>

      {/* SUBTAB 1: DATA SISWA */}
      {subTab === 'siswa' && (
        <div className="space-y-4">
          {selectedStudentIds.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-semibold text-indigo-900 dark:text-indigo-200 font-mono-tabular">
                {selectedStudentIds.length} siswa dipilih
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = visibleStudents.filter((s) =>
                      selectedStudentIds.includes(s.id)
                    );
                    exportStudentsCSV(chosen, db.staff, 'Siswa_Terpilih');
                    pushToast({
                      type: 'success',
                      title: `Ekspor ${chosen.length} Siswa Berhasil`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Terpilih</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteStudentIds(selectedStudentIds)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Data Master Siswa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilih, edit, hapus, ekspor CSV, atau impor daftar siswa secara massal.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportTarget('students');
                    setSubTab('laporan');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportStudentsCSV(visibleStudents, db.staff, 'Siswa');
                    pushToast({
                      type: 'success',
                      title: 'Data Siswa Diekspor (CSV)',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
                <button
                  type="button"
                  onClick={openAddStudent}
                  className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-4 py-2 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Siswa</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allStudentsSelected}
                        onChange={toggleAllStudents}
                        aria-label="Pilih semua siswa"
                        className="w-4 h-4 rounded border-slate-300 text-teal-600"
                      />
                    </th>
                    <th className="py-3 px-4">NIS / NISN</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Wali Murid</th>
                    <th className="py-3 px-4">Guru BK Pembimbing</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {visibleStudents.map((s) => {
                    const advisor = db.staff.find((g) => g.id === s.guruBkId);
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={
                          isChecked
                            ? 'bg-teal-50/60 dark:bg-teal-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOneStudent(s.id)}
                            aria-label={`Pilih ${s.nama}`}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {s.nis}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">{s.nisn}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {s.nama}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                          {s.kelas}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          <div>{s.namaWali}</div>
                          <div className="font-mono-tabular text-slate-400">{s.noHpWali}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                          {advisor?.nama || '-'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditStudent(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 mr-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStudentIds([s.id])}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DATA GURU BK */}
      {subTab === 'guru' && (
        <div className="space-y-4">
          {selectedStaffIds.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs sm:text-sm font-semibold text-indigo-900 dark:text-indigo-200 font-mono-tabular">
                {selectedStaffIds.length} staf dipilih
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const chosen = db.staff.filter((g) => selectedStaffIds.includes(g.id));
                    exportStaffCSV(chosen, 'GuruBK_Terpilih');
                    pushToast({
                      type: 'success',
                      title: `Ekspor ${chosen.length} Staf Berhasil`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Terpilih</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStaffIds(selectedStaffIds)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpilih</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds([])}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Data Master Guru BK & Administrator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAdmin
                    ? 'Kelola akun Guru BK, ruang konseling, ekspor CSV, dan hak akses.'
                    : 'Mode lihat & ekspor. Pengelolaan akun staf khusus Admin Utama.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportStaffCSV(db.staff, 'GuruBK');
                    pushToast({
                      type: 'success',
                      title: 'Data Guru BK Diekspor (CSV)',
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={openAddStaff}
                    className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-4 py-2 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Guru BK</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khusus Admin Utama</span>
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={allStaffSelected}
                        onChange={toggleAllStaff}
                        aria-label="Pilih semua Guru BK"
                        className="w-4 h-4 rounded border-slate-300 text-teal-600"
                      />
                    </th>
                    <th className="py-3 px-4">NIP & Username</th>
                    <th className="py-3 px-4">Nama & Jabatan</th>
                    <th className="py-3 px-4">Peran Akses</th>
                    <th className="py-3 px-4">Ruang & Ketersediaan</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                  {db.staff.map((g) => {
                    const isChecked = selectedStaffIds.includes(g.id);
                    return (
                      <tr
                        key={g.id}
                        className={
                          isChecked
                            ? 'bg-teal-50/60 dark:bg-teal-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOneStaff(g.id)}
                            aria-label={`Pilih ${g.nama}`}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-xs">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {g.nip}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            @{g.username}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {g.nama}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {g.jabatan} · {g.spesialisasi}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          {g.role === 'admin' ? (
                            <span className="text-violet-700 dark:text-violet-400">
                              Admin Utama
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">
                              Guru BK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {g.ruang}
                          </div>
                          <div
                            className={
                              g.statusKetersediaan === 'Tersedia'
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-amber-600 dark:text-amber-400 font-semibold'
                            }
                          >
                            {g.statusKetersediaan}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEditStaff(g)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 mr-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStaffIds([g.id])}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: EKSPOR, IMPOR & CETAK LAPORAN BULANAN */}
      {subTab === 'laporan' && (
        <div className="space-y-6">
          {/* Interactive Import & Backup Center */}
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Pusat Impor Data (CSV / JSON Backup)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Unggah file CSV siswa, CSV buku tamu, atau pulihkan cadangan JSON SiBK.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'students', label: 'Impor Siswa (CSV)' },
                  { id: 'guests', label: 'Impor Tamu (CSV)' },
                  { id: 'backup', label: 'Restore Backup (JSON)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setImportTarget(opt.id as typeof importTarget);
                      setPreviewInfo(null);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      importTarget === opt.id
                        ? 'sibk-btn-primary border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  Unduh template siap pakai untuk uji impor:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={downloadStudentCSVTemplate}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                  >
                    Template Siswa CSV
                  </button>
                  <button
                    type="button"
                    onClick={downloadGuestCSVTemplate}
                    className="font-semibold text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    Template Tamu CSV
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <input
                  type="file"
                  accept={importTarget === 'backup' ? '.json,application/json' : '.csv,text/csv,.json'}
                  onChange={handleImportFileSelect}
                  className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 dark:file:bg-teal-950 file:text-teal-800 dark:file:text-teal-300"
                />

                <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                    />
                    <span>Gabungkan (Merge)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>Ganti Semua (Replace)</span>
                  </label>
                </div>
              </div>

              {previewInfo && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      File siap: {previewInfo.fileName}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {previewInfo.countLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={executeImport}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Jalankan Impor Data</span>
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Cadangan & Ekspor Database Penuh
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Unduh seluruh data SiBK dalam format JSON untuk arsip sekolah atau transfer
                  antar perangkat, atau ekspor laporan CSV untuk diolah di Microsoft Excel.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    exportFullBackupJSON(db);
                    pushToast({
                      type: 'success',
                      title: 'Backup JSON Berhasil Diunduh',
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:brightness-110 transition-all"
                >
                  <FileJson className="w-4 h-4" />
                  <span>Ekspor Full Backup Database (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:brightness-110 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Laporan ke CSV/Excel</span>
                </button>
              </div>
            </div>
          </div>

          <PrintReportSection
            reportMonth={reportMonth}
            setReportMonth={setReportMonth}
            reportRequests={reportRequests}
            reportNotes={reportNotes}
            reportGuests={reportGuests}
            db={db}
            currentStaff={currentStaff}
            pushToast={pushToast}
          />
        </div>
      )}

      {/* MODAL: ADD/EDIT STUDENT */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingStudent.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nis || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nis: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    NISN
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nisn || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nisn: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nama || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nama: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.kelas || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, kelas: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Wali Murid
                  </label>
                  <input
                    type="text"
                    value={editingStudent.namaWali || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, namaWali: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    No. HP Wali
                  </label>
                  <input
                    type="text"
                    value={editingStudent.noHpWali || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, noHpWali: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Guru BK Pembimbing
                </label>
                <select
                  value={editingStudent.guruBkId || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, guruBkId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {db.staff.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT STAFF */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {editingStaff.id ? 'Edit Data Guru BK' : 'Tambah Akun Guru BK'}
              </h3>
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    NIP
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.nip || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, nip: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.username || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, username: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={editingStaff.nama || ''}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, nama: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Peran Akses
                  </label>
                  <select
                    value={editingStaff.role || 'guru_bk'}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        role: e.target.value as StaffRole,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="guru_bk">Guru BK</option>
                    <option value="admin">Admin Utama</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Password Login
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.password || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, password: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={editingStaff.jabatan || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, jabatan: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Ruang Konseling
                  </label>
                  <input
                    type="text"
                    value={editingStaff.ruang || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, ruang: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE STUDENTS */}
      {confirmDeleteStudentIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus Siswa
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Anda yakin ingin menghapus <strong>{confirmDeleteStudentIds.length}</strong> data
              siswa dari Data Master?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStudentIds(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteStudentIds.length === 1) {
                    deleteStudent(confirmDeleteStudentIds[0]);
                  } else {
                    deleteStudentsBulk(confirmDeleteStudentIds);
                  }
                  setSelectedStudentIds((prev) =>
                    prev.filter((id) => !confirmDeleteStudentIds.includes(id))
                  );
                  setConfirmDeleteStudentIds(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE STAFF */}
      {confirmDeleteStaffIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus Guru BK
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Anda yakin ingin menghapus <strong>{confirmDeleteStaffIds.length}</strong> akun Guru
              BK terpilih?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStaffIds(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDeleteStaffIds.length === 1) {
                    deleteStaff(confirmDeleteStaffIds[0]);
                  } else {
                    deleteStaffBulk(confirmDeleteStaffIds);
                  }
                  setSelectedStaffIds((prev) =>
                    prev.filter((id) => !confirmDeleteStaffIds.includes(id))
                  );
                  setConfirmDeleteStaffIds(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
