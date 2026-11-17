import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  MapPin,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { formatTanggalID } from '../data/seedData';
import { CounselingCategory, UrgencyLevel } from '../types/sibk';
import { ThemeSwitcher } from './ThemeSwitcher';

const SERVICE_CATEGORIES: CounselingCategory[] = [
  'Konseling Pribadi',
  'Konseling Sosial',
  'Konseling Belajar',
  'Perencanaan Karir',
  'Mediasi Masalah',
  'Permohonan Surat/Izin',
];

const URGENCY_LEVELS: UrgencyLevel[] = ['Normal', 'Segera', 'Mendesak (Rahasia)'];

export const StudentPortal: React.FC = () => {
  const { db, currentStudent, logout, submitCounselingRequest } = useSiBK();

  const counselors = db.staff.filter((s) => s.role === 'guru_bk' || s.role === 'admin');
  const defaultCounselor =
    counselors.find((g) => g.id === currentStudent?.guruBkId)?.id ||
    counselors[0]?.id ||
    '';

  const [jenisKeperluan, setJenisKeperluan] =
    useState<CounselingCategory>('Konseling Pribadi');
  const [guruTujuanId, setGuruTujuanId] = useState(defaultCounselor);
  const [tingkatUrgensi, setTingkatUrgensi] = useState<UrgencyLevel>('Normal');
  const [ceritaSingkat, setCeritaSingkat] = useState('');
  const [usulanWaktu, setUsulanWaktu] = useState('');
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  if (!currentStudent) return null;

  const myAdvisor = db.staff.find((g) => g.id === currentStudent.guruBkId);
  const myRequests = db.requests.filter((r) => r.studentId === currentStudent.id);
  const filteredRequests =
    filterStatus === 'Semua'
      ? myRequests
      : myRequests.filter((r) => r.status === filterStatus);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Profile Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl sibk-gradient-hero text-white flex items-center justify-center font-display font-bold text-base shrink-0 shadow-xs">
              {currentStudent.nama
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h1 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {currentStudent.nama}
                </h1>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {currentStudent.kelas}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                <span>NIS: {currentStudent.nis}</span>
                <span aria-hidden="true">·</span>
                <span>NISN: {currentStudent.nisn}</span>
                {myAdvisor && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-sans">Pembimbing: {myAdvisor.nama}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            <ThemeSwitcher />
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-2 rounded-xl font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privasi Terjaga</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
              <div className="grid grid-cols-3 gap-2">
                {URGENCY_LEVELS.map((lvl) => {
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
      </main>
    </div>
  );
};
