import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileWarning,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import { AttendanceVerifyStatus, StudentAttendanceReport } from '../../types/sibk';

type AttendanceSubTab = 'reports' | 'daily_class' | 'secretaries';

export const AttendanceMonitorTab: React.FC = () => {
  const {
    db,
    currentStaff,
    verifyStudentAttendance,
    deleteStudentAttendances,
    toggleStudentSecretaryAccess,
    openStudentInfo,
    pushToast,
  } = useSiBK();

  const [subTab, setSubTab] = useState<AttendanceSubTab>('reports');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Semua');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());

  // Photo lightbox & verification modal
  const [photoModal, setPhotoModal] = useState<{ url: string; title: string } | null>(
    null
  );
  const [verifyingReport, setVerifyingReport] =
    useState<StudentAttendanceReport | null>(null);
  const [verifyStatusInput, setVerifyStatusInput] =
    useState<AttendanceVerifyStatus>('Diverifikasi');
  const [verifyNoteInput, setVerifyNoteInput] = useState('');

  const isAdmin = currentStaff?.role === 'admin';

  const scopedStudents = isAdmin
    ? db.students
    : db.students.filter((s) => s.guruBkId === currentStaff?.id);

  const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
  const allClasses = Array.from(
    new Set(scopedStudents.map((s) => s.kelas))
  ).sort();

  const filteredReports = db.studentAttendances.filter((rep) => {
    if (!isAdmin && !scopedStudentIds.has(rep.studentId)) return false;
    if (statusFilter !== 'Semua' && rep.statusVerifikasi !== statusFilter) return false;
    const st = db.students.find((s) => s.id === rep.studentId);
    if (selectedClassFilter !== 'Semua' && st?.kelas !== selectedClassFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hit =
        st?.nama.toLowerCase().includes(q) ||
        st?.kelas.toLowerCase().includes(q) ||
        rep.keterangan.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const pendingReportCount = db.studentAttendances.filter(
    (rep) =>
      (isAdmin || scopedStudentIds.has(rep.studentId)) &&
      rep.statusVerifikasi === 'Menunggu Verifikasi'
  ).length;

  const filteredClassRecords = db.classAttendances.filter((rec) => {
    if (selectedDate && rec.tanggal !== selectedDate) return false;
    if (selectedClassFilter !== 'Semua' && rec.kelas !== selectedClassFilter) return false;
    if (!isAdmin && !allClasses.includes(rec.kelas)) return false;
    return true;
  });

  const filteredSecretaryStudents = scopedStudents.filter((st) => {
    if (selectedClassFilter !== 'Semua' && st.kelas !== selectedClassFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        st.nama.toLowerCase().includes(q) ||
        st.nis.includes(q) ||
        st.kelas.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openVerifyModal = (rep: StudentAttendanceReport) => {
    setVerifyingReport(rep);
    setVerifyStatusInput(
      rep.statusVerifikasi === 'Menunggu Verifikasi'
        ? 'Diverifikasi'
        : rep.statusVerifikasi
    );
    setVerifyNoteInput(rep.catatanGuru || '');
  };

  const handleSaveVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingReport) return;
    verifyStudentAttendance(verifyingReport.id, verifyStatusInput, verifyNoteInput);
    setVerifyingReport(null);
  };

  const handleExportClassAttendanceCSV = () => {
    const rows: string[][] = [
      ['Tanggal', 'Kelas', 'Diinput Oleh', 'NIS', 'Nama Siswa', 'Status', 'Keterangan'],
    ];
    filteredClassRecords.forEach((rec) => {
      rec.entries.forEach((entry) => {
        const st = db.students.find((s) => s.id === entry.studentId);
        rows.push([
          rec.tanggal,
          rec.kelas,
          rec.inputByName,
          st?.nis || '-',
          st?.nama || entry.studentId,
          entry.status,
          entry.keterangan || '-',
        ]);
      });
    });

    if (rows.length <= 1) {
      pushToast({
        type: 'warning',
        title: 'Tidak Ada Data Presensi',
        message: 'Pilih tanggal atau kelas yang memiliki data absensi tersimpan.',
      });
      return;
    }

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_Kelas_${selectedDate || 'Semua'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({
      type: 'success',
      title: 'Rekap Presensi Diekspor (CSV)',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Monitoring Kehadiran & Akses Sekretaris Kelas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verifikasi info kehadiran berfoto dari siswa, pantau absensi harian kelas, dan kelola hak akses Sekretaris Kelas.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              subTab === 'reports'
                ? 'sibk-btn-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Info & Foto Siswa</span>
            {pendingReportCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center font-mono-tabular">
                {pendingReportCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('daily_class')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              subTab === 'daily_class'
                ? 'sibk-btn-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Absensi Harian Kelas</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('secretaries')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              subTab === 'secretaries'
                ? 'sibk-btn-primary shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Akses Sekretaris Kelas</span>
          </button>
        </div>
      </div>

      {/* Shared Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center gap-3">
        {subTab !== 'daily_class' ? (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, kelas, atau keterangan..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tanggal:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline px-2"
              >
                Semua Tanggal
              </button>
            )}
          </div>
        )}

        <select
          value={selectedClassFilter}
          onChange={(e) => setSelectedClassFilter(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
        >
          <option value="Semua">Semua Kelas</option>
          {allClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        {subTab === 'reports' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            <option value="Semua">Semua Status</option>
            <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
            <option value="Diverifikasi">Diverifikasi</option>
            <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
          </select>
        )}

        {subTab === 'daily_class' && (
          <button
            type="button"
            onClick={handleExportClassAttendanceCSV}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        )}
      </div>

      {/* SUBTAB 1: STUDENT ATTENDANCE + PHOTO REPORTS */}
      {subTab === 'reports' && (
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Camera className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tidak ada laporan kehadiran siswa pada filter ini
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map((rep) => {
                const st = db.students.find((s) => s.id === rep.studentId);
                const verifyBadge =
                  rep.statusVerifikasi === 'Diverifikasi'
                    ? {
                        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                        cls: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
                      }
                    : rep.statusVerifikasi === 'Perlu Tindak Lanjut'
                    ? {
                        icon: <FileWarning className="w-3.5 h-3.5" />,
                        cls: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
                      }
                    : {
                        icon: <Clock className="w-3.5 h-3.5" />,
                        cls: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
                      };

                return (
                  <article
                    key={rep.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                            <span>{formatTanggalID(rep.tanggal)}</span>
                            <span>·</span>
                            <span>{rep.jamKirim} WIB</span>
                            <span>·</span>
                            <span className="font-sans font-bold text-teal-700 dark:text-teal-300">
                              {rep.status}
                            </span>
                          </div>
                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-1 flex flex-wrap items-center gap-1.5">
                            {st ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openStudentInfo(st.id)}
                                  title="Klik untuk lihat informasi lengkap siswa"
                                  className="hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 text-left transition-colors"
                                >
                                  {st.nama}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStudentInfo(st.id)}
                                  title="Klik untuk lihat informasi lengkap siswa"
                                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2"
                                >
                                  ({st.kelas})
                                </button>
                              </>
                            ) : (
                              <span>Siswa (-)</span>
                            )}
                          </h3>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shrink-0 ${verifyBadge.cls}`}
                        >
                          {verifyBadge.icon}
                          <span>{rep.statusVerifikasi}</span>
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {rep.keterangan}
                      </p>

                      {rep.fotoLampiranDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoModal({
                              url: rep.fotoLampiranDataUrl!,
                              title: `Lampiran ${st?.nama || 'Siswa'} — ${rep.status} (${formatTanggalID(rep.tanggal)})`,
                            })
                          }
                          className="group relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 block"
                        >
                          <img
                            src={rep.fotoLampiranDataUrl}
                            alt={rep.fotoLampiranName || 'Foto lampiran'}
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                            <Eye className="w-4 h-4" /> Perbesar Foto Lampiran
                          </span>
                        </button>
                      )}

                      {rep.catatanGuru && (
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Catatan ({rep.verifiedBy || 'Guru BK'}):{' '}
                          </span>
                          {rep.catatanGuru}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => openVerifyModal(rep)}
                        className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-3.5 py-2 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verifikasi & Beri Catatan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteStudentAttendances([rep.id])}
                        title="Hapus laporan"
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DAILY CLASS ATTENDANCE SUBMITTED BY SECRETARIES */}
      {subTab === 'daily_class' && (
        <div className="space-y-4">
          {filteredClassRecords.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Belum ada rekap absensi harian kelas untuk filter ini
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Data akan muncul setelah Sekretaris Kelas menginput kehadiran harian di Portal Siswa.
              </p>
            </div>
          ) : (
            filteredClassRecords.map((rec) => {
              const counts = {
                Hadir: rec.entries.filter((e) => e.status === 'Hadir').length,
                Sakit: rec.entries.filter((e) => e.status === 'Sakit').length,
                Izin: rec.entries.filter((e) => e.status === 'Izin').length,
                Terlambat: rec.entries.filter((e) => e.status === 'Terlambat').length,
                Alpa: rec.entries.filter((e) => e.status === 'Alpa').length,
              };
              return (
                <section
                  key={rec.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Kelas {rec.kelas} — {formatTanggalID(rec.tanggal)}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Diinput oleh: <span className="font-semibold">{rec.inputByName}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-mono-tabular font-semibold">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Hadir: {counts.Hadir}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                        Sakit: {counts.Sakit}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                        Izin: {counts.Izin}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        Terlambat: {counts.Terlambat}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Alpa: {counts.Alpa}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-4">NIS</th>
                          <th className="py-2.5 px-4">Nama Siswa</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                        {rec.entries.map((entry) => {
                          const st = db.students.find((s) => s.id === entry.studentId);
                          const statusCls =
                            entry.status === 'Hadir'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : entry.status === 'Sakit'
                              ? 'text-rose-700 dark:text-rose-300'
                              : entry.status === 'Izin'
                              ? 'text-sky-700 dark:text-sky-300'
                              : entry.status === 'Terlambat'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-700 dark:text-slate-300';
                          return (
                            <tr key={entry.studentId}>
                              <td className="py-2.5 px-4 font-mono-tabular text-xs text-slate-500">
                                {st?.nis || '-'}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                                {st ? (
                                  <button
                                    type="button"
                                    onClick={() => openStudentInfo(st.id)}
                                    title="Klik untuk lihat informasi lengkap siswa"
                                    className="hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 text-left transition-colors"
                                  >
                                    {st.nama}
                                  </button>
                                ) : (
                                  entry.studentId
                                )}
                              </td>
                              <td className={`py-2.5 px-4 font-bold text-xs ${statusCls}`}>
                                {entry.status}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                                {entry.keterangan || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 3: MANAGE CLASS SECRETARY ACCESS */}
      {subTab === 'secretaries' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Pemberian Akses Sekretaris Kelas</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Siswa yang diaktifkan sebagai Sekretaris Kelas akan otomatis memperoleh menu "Input Absensi Kelas" pada Portal Siswa.
              </p>
            </div>
            <span className="text-xs font-mono-tabular font-semibold px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
              {scopedStudents.filter((s) => s.isSekretarisKelas).length} Sekretaris Aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status Akses</th>
                  <th className="py-3 px-4 text-right">Kontrol Guru BK / Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredSecretaryStudents.map((st) => {
                  const granted = Boolean(st.isSekretarisKelas);
                  return (
                    <tr
                      key={st.id}
                      className={
                        granted
                          ? 'bg-teal-50/40 dark:bg-teal-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                      }
                    >
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-500">
                        {st.nis}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => openStudentInfo(st.id)}
                          title="Klik untuk lihat informasi lengkap siswa"
                          className="hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 text-left transition-colors"
                        >
                          {st.nama}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                        <button
                          type="button"
                          onClick={() => openStudentInfo(st.id)}
                          title="Klik untuk lihat informasi lengkap siswa"
                          className="hover:underline underline-offset-2 transition-colors"
                        >
                          {st.kelas}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        {granted ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Sekretaris Kelas Aktif</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Siswa Reguler</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleStudentSecretaryAccess(st.id, !granted)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            granted
                              ? 'border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'sibk-btn-primary'
                          }`}
                        >
                          {granted ? 'Cabut Akses' : 'Berikan Akses Sekretaris'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Photo Zoom Lightbox Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          onClick={() => setPhotoModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {photoModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setPhotoModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 max-h-[72vh] flex items-center justify-center">
              <img
                src={photoModal.url}
                alt={photoModal.title}
                className="max-h-[72vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {verifyingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Verifikasi Info Kehadiran
              </h3>
              <button
                type="button"
                onClick={() => setVerifyingReport(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Keputusan Verifikasi
                </label>
                <select
                  value={verifyStatusInput}
                  onChange={(e) =>
                    setVerifyStatusInput(e.target.value as AttendanceVerifyStatus)
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="Diverifikasi">Diverifikasi (Diterima)</option>
                  <option value="Perlu Tindak Lanjut">
                    Perlu Tindak Lanjut / Konfirmasi Wali
                  </option>
                  <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Catatan Balasan untuk Siswa
                </label>
                <textarea
                  rows={3}
                  value={verifyNoteInput}
                  onChange={(e) => setVerifyNoteInput(e.target.value)}
                  placeholder="Contoh: Surat dokter diterima, semoga lekas sembuh dan susul tugas kelas."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVerifyingReport(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
