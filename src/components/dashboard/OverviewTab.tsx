import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Users,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { getTodayISO } from '../../data/seedData';
import { CounselingCategory } from '../../types/sibk';

interface OverviewTabProps {
  onNavigate: (menu: 'overview' | 'queue' | 'notes' | 'guests' | 'master') => void;
}

const CORE_CATEGORIES: {
  key: CounselingCategory;
  label: string;
  barGradient: string;
  dotColor: string;
}[] = [
  {
    key: 'Konseling Pribadi',
    label: 'Pribadi',
    barGradient: 'from-teal-500 to-emerald-500',
    dotColor: 'bg-teal-500',
  },
  {
    key: 'Konseling Sosial',
    label: 'Sosial',
    barGradient: 'from-violet-500 to-purple-500',
    dotColor: 'bg-violet-500',
  },
  {
    key: 'Konseling Belajar',
    label: 'Belajar',
    barGradient: 'from-sky-500 to-blue-500',
    dotColor: 'bg-sky-500',
  },
  {
    key: 'Perencanaan Karir',
    label: 'Karir',
    barGradient: 'from-amber-500 to-orange-500',
    dotColor: 'bg-amber-500',
  },
  {
    key: 'Mediasi Masalah',
    label: 'Mediasi',
    barGradient: 'from-rose-500 to-pink-500',
    dotColor: 'bg-rose-500',
  },
  {
    key: 'Permohonan Surat/Izin',
    label: 'Surat/Izin',
    barGradient: 'from-cyan-500 to-teal-500',
    dotColor: 'bg-cyan-500',
  },
];

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { db, currentStaff } = useSiBK();
  const today = getTodayISO();
  const isAdmin = currentStaff?.role === 'admin';

  const scopedStudentIds = new Set(
    isAdmin
      ? db.students.map((s) => s.id)
      : db.students
          .filter((s) => s.guruBkId === currentStaff?.id)
          .map((s) => s.id)
  );

  const scopedRequests = isAdmin
    ? db.requests
    : db.requests.filter(
        (r) => r.guruTujuanId === currentStaff?.id || scopedStudentIds.has(r.studentId)
      );

  const scopedNotes = isAdmin
    ? db.notes
    : db.notes.filter(
        (n) => n.guruId === currentStaff?.id || scopedStudentIds.has(n.studentId)
      );

  const todayGuests = db.guests.filter((g) => g.tanggal === today);
  const todayCounselingVisits = scopedRequests.filter(
    (r) =>
      (r.jadwalTanggal === today || r.tanggalPengajuan === today) &&
      (r.status === 'Dijadwalkan' || r.status === 'Selesai')
  );

  const totalKunjunganHariIni = todayGuests.length + todayCounselingVisits.length;
  const antreanMenunggu = scopedRequests.filter(
    (r) => r.status === 'Menunggu Konfirmasi'
  ).length;

  const latestNoteByStudent = new Map<string, (typeof scopedNotes)[number]>();
  [...scopedNotes]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .forEach((n) => {
      if (!latestNoteByStudent.has(n.studentId)) {
        latestNoteByStudent.set(n.studentId, n);
      }
    });

  const kasusPemantauanKhusus = Array.from(latestNoteByStudent.values()).filter(
    (n) =>
      n.statusPerkembangan === 'Perlu Pemantauan' ||
      n.statusPerkembangan === 'Panggilan Orang Tua'
  ).length;

  const categoryCounts = CORE_CATEGORIES.map((cat) => {
    const reqCount = scopedRequests.filter((r) => r.jenisKeperluan === cat.key).length;
    const noteCount = scopedNotes.filter((n) => n.jenisLayanan === cat.key).length;
    return {
      ...cat,
      count: reqCount + noteCount,
    };
  });

  const totalIssues = categoryCounts.reduce((sum, c) => sum + c.count, 0) || 1;
  const maxCategoryCount = Math.max(...categoryCounts.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      {/* Scope indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Ringkasan Layanan BK & Tamu
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Menampilkan rekap seluruh unit Bimbingan Konseling dan Buku Tamu Sekolah.'
              : `Menampilkan ringkasan antrean dan siswa bimbingan ${currentStaff?.nama}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('queue')}
          className="inline-flex items-center gap-2 self-start rounded-xl sibk-btn-primary px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-sm transition-all whitespace-nowrap"
        >
          <span>Buka Antrean Konseling</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Vibrant KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Kunjungan Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {totalKunjunganHariIni}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {todayCounselingVisits.length} sesi siswa · {todayGuests.length} tamu umum
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('queue')}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Antrean Konseling Menunggu
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {antreanMenunggu}
          </p>
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
            {antreanMenunggu > 0
              ? 'Perlu penjadwalan atau konfirmasi'
              : 'Semua pengajuan telah ditangani'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('notes')}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-rose-400 dark:hover:border-rose-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kasus Pemantauan Khusus
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {kasusPemantauanKhusus}
          </p>
          <p className="mt-1.5 text-xs text-rose-700 dark:text-rose-400 font-medium">
            Status Perlu Pemantauan / Panggilan Ortu
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('guests')}
          className="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tamu Umum Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {todayGuests.length}
          </p>
          <p className="mt-1.5 text-xs text-sky-700 dark:text-sky-400 font-medium">
            {todayGuests.filter((g) => g.status === 'Berkunjung').length} masih berada di sekolah
          </p>
        </button>
      </div>

      {/* Distribution Chart + Real-Time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Distribusi Kategori Masalah & Layanan Siswa
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Akumulasi dari pengajuan siswa dan catatan rekam jejak BK
              </p>
            </div>
            <span className="text-xs font-mono-tabular font-semibold text-slate-600 dark:text-slate-300">
              Total: {categoryCounts.reduce((a, b) => a + b.count, 0)} Kasus
            </span>
          </div>

          <div className="space-y-4">
            {categoryCounts.map((item) => {
              const pct = Math.round((item.count / totalIssues) * 100);
              const barWidth = Math.max(
                (item.count / maxCategoryCount) * 100,
                item.count > 0 ? 8 : 0
              );
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.key}
                    </span>
                    <span className="font-mono-tabular text-slate-600 dark:text-slate-300 font-semibold">
                      {item.count} kasus ({pct}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${item.barGradient} transition-all duration-300`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4-Pillar Colorful Summary */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {categoryCounts.slice(0, 4).map((c) => (
              <div
                key={c.key}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3 py-2.5"
              >
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Bidang {c.label}
                </span>
                <span className="font-mono-tabular text-lg font-bold text-slate-900 dark:text-white">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Real-time Activity Log */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Aktivitas Terbaru
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Real-Time</span>
          </div>

          {db.activities.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[360px] overflow-y-auto pr-1">
              {db.activities.slice(0, 10).map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {act.actor}
                    </span>
                    <span className="font-mono-tabular shrink-0">{act.timestamp} WIB</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
