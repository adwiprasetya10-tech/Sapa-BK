import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  Image as ImageIcon,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import { StudentAttendanceStatus } from '../../types/sibk';
import { compressImageFile } from '../../utils/imageCompress';

const ATTENDANCE_STATUSES: {
  value: StudentAttendanceStatus;
  desc: string;
  activeClass: string;
}[] = [
  {
    value: 'Hadir',
    desc: 'Hadir tepat waktu',
    activeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300',
  },
  {
    value: 'Sakit',
    desc: 'Izin sakit / surat dokter',
    activeClass:
      'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300',
  },
  {
    value: 'Izin',
    desc: 'Izin keluarga / lomba',
    activeClass:
      'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-800 dark:text-sky-300',
  },
  {
    value: 'Terlambat',
    desc: 'Kendala perjalanan',
    activeClass:
      'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-300',
  },
];

export const StudentAttendanceSection: React.FC = () => {
  const { db, currentStudent, submitStudentAttendance, pushToast } = useSiBK();

  const [tanggal, setTanggal] = useState(getTodayISO());
  const [status, setStatus] = useState<StudentAttendanceStatus>('Sakit');
  const [keterangan, setKeterangan] = useState('');
  const [fotoDataUrl, setFotoDataUrl] = useState<string | undefined>(undefined);
  const [fotoName, setFotoName] = useState<string | undefined>(undefined);
  const [fotoSizeKB, setFotoSizeKB] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    url: string;
    title: string;
  } | null>(null);

  if (!currentStudent) return null;

  const myReports = db.studentAttendances.filter(
    (a) => a.studentId === currentStudent.id
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const result = await compressImageFile(file, 1000, 0.78);
      setFotoDataUrl(result.dataUrl);
      setFotoName(result.name);
      setFotoSizeKB(result.sizeKB);
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Memuat Foto',
        message: err instanceof Error ? err.message : 'Pastikan file berupa gambar valid.',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!tanggal || !keterangan.trim()) {
      setFormError('Mohon isi tanggal dan keterangan informasi kehadiran.');
      return;
    }

    submitStudentAttendance({
      tanggal,
      status,
      keterangan,
      fotoLampiranDataUrl: fotoDataUrl,
      fotoLampiranName: fotoName,
    });

    setKeterangan('');
    setFotoDataUrl(undefined);
    setFotoName(undefined);
    setFotoSizeKB(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Form Kirim Info Kehadiran & Foto */}
      <section className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Kirim Info Kehadiran & Foto</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Laporkan kehadiran, keterlambatan, atau izin tidak masuk beserta foto surat/bukti untuk diteruskan ke Guru BK.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="att-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Tanggal Kehadiran
            </label>
            <input
              id="att-date"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Status Kehadiran
            </span>
            <div className="grid grid-cols-2 gap-2">
              {ATTENDANCE_STATUSES.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? opt.activeClass
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.value}</span>
                    <span className="block text-[11px] opacity-80">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="att-note"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Keterangan / Alasan Lengkap
            </label>
            <textarea
              id="att-note"
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Izin sakit demam sejak tadi malam, terlampir foto surat keterangan dokter..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Lampiran Foto (Surat Izin / Surat Dokter / Bukti Kehadiran)
            </span>

            {!fotoDataUrl ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-6 cursor-pointer hover:border-teal-500 transition-colors">
                <Upload className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                  {uploading
                    ? 'Memproses & mengompres foto...'
                    : 'Klik untuk pilih foto dari HP/Komputer'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Format JPG, PNG, WEBP (otomatis dioptimalkan)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2.5">
                <div className="relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900 max-h-48 flex items-center justify-center">
                  <img
                    src={fotoDataUrl}
                    alt="Pratinjau lampiran kehadiran"
                    className="max-h-48 w-auto object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                    {fotoName || 'lampiran.jpg'}
                    {fotoSizeKB ? ` (${fotoSizeKB} KB)` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFotoDataUrl(undefined);
                      setFotoName(undefined);
                      setFotoSizeKB(null);
                    }}
                    className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold hover:underline shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl sibk-btn-primary px-5 py-3 text-sm font-semibold shadow-sm transition-all disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Informasi Kehadiran</span>
          </button>
        </form>
      </section>

      {/* Right: Riwayat Laporan Kehadiran Siswa */}
      <section className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Riwayat Info Kehadiran Saya
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau status verifikasi dari Guru BK atas laporan kehadiran yang Anda kirim.
            </p>
          </div>
          <span className="text-xs font-mono-tabular font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            {myReports.length} Laporan
          </span>
        </div>

        {myReports.length === 0 ? (
          <div className="py-12 text-center">
            <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Belum ada info kehadiran dikirim
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gunakan formulir di samping bila ingin melapor izin, sakit, atau kehadiran beserta foto bukti.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {myReports.map((rep) => {
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
                <article key={rep.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        <span>{formatTanggalID(rep.tanggal)}</span>
                        <span>·</span>
                        <span>Dikirim {rep.jamKirim} WIB</span>
                      </div>
                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        Status: {rep.status}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold ${verifyBadge.cls}`}
                    >
                      {verifyBadge.icon}
                      <span>{rep.statusVerifikasi}</span>
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {rep.keterangan}
                  </p>

                  {rep.fotoLampiranDataUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoModal({
                            url: rep.fotoLampiranDataUrl!,
                            title: `Lampiran ${rep.status} (${formatTanggalID(rep.tanggal)})`,
                          })
                        }
                        className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-28 h-20 bg-slate-100 dark:bg-slate-800 shrink-0"
                      >
                        <img
                          src={rep.fotoLampiranDataUrl}
                          alt={rep.fotoLampiranName || 'Lampiran'}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                          <Eye className="w-3.5 h-3.5" /> Lihat
                        </span>
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          Foto Lampiran Terpasang
                        </p>
                        <p className="truncate max-w-[220px]">
                          {rep.fotoLampiranName || 'lampiran.jpg'}
                        </p>
                      </div>
                    </div>
                  )}

                  {rep.catatanGuru && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Catatan {rep.verifiedBy || 'Guru BK'}:{' '}
                      </span>
                      {rep.catatanGuru}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {previewPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {previewPhotoModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 max-h-[70vh] flex items-center justify-center">
              <img
                src={previewPhotoModal.url}
                alt={previewPhotoModal.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
