import React, { useEffect, useState } from 'react';
import {
  CheckCheck,
  ClipboardCheck,
  Save,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import { ClassAttendanceEntry, ClassAttendanceStatus } from '../../types/sibk';

const CLASS_STATUS_OPTIONS: {
  status: ClassAttendanceStatus;
  activeCls: string;
}[] = [
  {
    status: 'Hadir',
    activeCls: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    status: 'Sakit',
    activeCls: 'bg-rose-600 text-white border-rose-600',
  },
  {
    status: 'Izin',
    activeCls: 'bg-sky-600 text-white border-sky-600',
  },
  {
    status: 'Terlambat',
    activeCls: 'bg-amber-500 text-white border-amber-500',
  },
  {
    status: 'Alpa',
    activeCls: 'bg-slate-700 text-white border-slate-700',
  },
];

export const ClassSecretarySection: React.FC = () => {
  const { db, currentStudent, saveDailyClassAttendance, openStudentInfo } = useSiBK();
  const [tanggal, setTanggal] = useState(getTodayISO());

  const classmates = currentStudent
    ? db.students
        .filter((s) => s.kelas === currentStudent.kelas)
        .sort((a, b) => a.nama.localeCompare(b.nama))
    : [];

  const existingRecord = currentStudent
    ? db.classAttendances.find(
        (c) => c.kelas === currentStudent.kelas && c.tanggal === tanggal
      )
    : undefined;

  const [entriesMap, setEntriesMap] = useState<
    Record<string, { status: ClassAttendanceStatus; keterangan: string }>
  >({});

  useEffect(() => {
    const next: Record<string, { status: ClassAttendanceStatus; keterangan: string }> = {};
    classmates.forEach((student) => {
      const saved = existingRecord?.entries.find((e) => e.studentId === student.id);
      next[student.id] = {
        status: saved?.status || 'Hadir',
        keterangan: saved?.keterangan || '',
      };
    });
    setEntriesMap(next);
  }, [tanggal, currentStudent?.kelas, existingRecord?.id, classmates.length]);

  if (!currentStudent || !currentStudent.isSekretarisKelas) return null;

  const updateStudentRow = (
    studentId: string,
    patch: Partial<{ status: ClassAttendanceStatus; keterangan: string }>
  ) => {
    setEntriesMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'Hadir',
        keterangan: prev[studentId]?.keterangan || '',
        ...patch,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const next: Record<string, { status: ClassAttendanceStatus; keterangan: string }> = {};
    classmates.forEach((st) => {
      next[st.id] = { status: 'Hadir', keterangan: '' };
    });
    setEntriesMap(next);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const entries: ClassAttendanceEntry[] = classmates.map((st) => ({
      studentId: st.id,
      status: entriesMap[st.id]?.status || 'Hadir',
      keterangan: entriesMap[st.id]?.keterangan?.trim() || undefined,
    }));
    saveDailyClassAttendance(currentStudent.kelas, tanggal, entries);
  };

  const summary = {
    Hadir: 0,
    Sakit: 0,
    Izin: 0,
    Terlambat: 0,
    Alpa: 0,
  };
  classmates.forEach((st) => {
    const stVal = entriesMap[st.id]?.status || 'Hadir';
    summary[stVal] += 1;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Khusus Sekretaris Kelas ({currentStudent.kelas})</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Input Kehadiran Harian Kelas {currentStudent.kelas}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Anda diberikan wewenang oleh Guru BK / Admin untuk merekap presensi harian siswa sekelas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label
                htmlFor="sec-att-date"
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                Tanggal Presensi
              </label>
              <input
                id="sec-att-date"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-mono-tabular text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="self-end inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Tandai Semua Hadir</span>
            </button>
          </div>
        </div>

        {/* Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-5">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-3 py-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Total Siswa
            </span>
            <span className="font-mono-tabular text-lg font-bold text-slate-900 dark:text-white">
              {classmates.length}
            </span>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300">Hadir</span>
            <span className="block font-mono-tabular text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {summary.Hadir}
            </span>
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-2">
            <span className="text-[11px] text-rose-700 dark:text-rose-300">Sakit</span>
            <span className="block font-mono-tabular text-lg font-bold text-rose-800 dark:text-rose-200">
              {summary.Sakit}
            </span>
          </div>
          <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-2">
            <span className="text-[11px] text-sky-700 dark:text-sky-300">Izin</span>
            <span className="block font-mono-tabular text-lg font-bold text-sky-800 dark:text-sky-200">
              {summary.Izin}
            </span>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <span className="text-[11px] text-amber-700 dark:text-amber-300">Terlambat</span>
            <span className="block font-mono-tabular text-lg font-bold text-amber-800 dark:text-amber-200">
              {summary.Terlambat}
            </span>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-2">
            <span className="text-[11px] text-slate-600 dark:text-slate-300">Alpa</span>
            <span className="block font-mono-tabular text-lg font-bold text-slate-800 dark:text-slate-100">
              {summary.Alpa}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">NIS & Nama Siswa</th>
                  <th className="py-3 px-4">Status Kehadiran</th>
                  <th className="py-3 px-4">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {classmates.map((st, index) => {
                  const currentVal = entriesMap[st.id] || {
                    status: 'Hadir' as ClassAttendanceStatus,
                    keterangan: '',
                  };
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-3 px-4 font-mono-tabular text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
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
                            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2"
                          >
                            ({st.kelas})
                          </button>
                          {st.id === currentStudent.id && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                          NIS {st.nis}{st.noAbsen ? ` · Absen ${st.noAbsen}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {CLASS_STATUS_OPTIONS.map((opt) => {
                            const active = currentVal.status === opt.status;
                            return (
                              <button
                                key={opt.status}
                                type="button"
                                onClick={() =>
                                  updateStudentRow(st.id, { status: opt.status })
                                }
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                                  active
                                    ? opt.activeCls
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {opt.status}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <input
                          type="text"
                          value={currentVal.keterangan}
                          onChange={(e) =>
                            updateStudentRow(st.id, { keterangan: e.target.value })
                          }
                          placeholder="Opsional (mis. surat menyusul)"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {existingRecord
                ? `Terakhir disimpan oleh ${existingRecord.inputByName} (${formatTanggalID(existingRecord.tanggal)}).`
                : `Belum ada data tersimpan untuk tanggal ${formatTanggalID(tanggal)}.`}
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-2.5 text-sm font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Kehadiran Harian Kelas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
