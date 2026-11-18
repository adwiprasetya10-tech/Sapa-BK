import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Cake,
  Camera,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  GraduationCap,
  Hash,
  IdCard,
  Link2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useSiBK } from '../context/SiBKContext';
import { compressImageFile } from '../utils/imageCompress';

export const StudentInfoModal: React.FC = () => {
  const {
    db,
    currentStaff,
    selectedStudentInfoId,
    closeStudentInfo,
    upsertStudent,
    pushToast,
  } = useSiBK();

  const student = selectedStudentInfoId
    ? db.students.find((s) => s.id === selectedStudentInfoId) || null
    : null;

  const [isEditing, setIsEditing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit form fields
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [noAbsen, setNoAbsen] = useState('');
  const [ttl, setTtl] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [linkFoto, setLinkFoto] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [noHpWali, setNoHpWali] = useState('');

  useEffect(() => {
    if (student) {
      setIsEditing(false);
      setImgError(false);
      setNis(student.nis || '');
      setNisn(student.nisn || '');
      setNama(student.nama || '');
      setKelas(student.kelas || '');
      setNoAbsen(student.noAbsen || '');
      setTtl(student.ttl || '');
      setEmail(student.email || '');
      setNoHp(student.noHp || '');
      setLinkFoto(student.linkFoto || '');
      setNamaWali(student.namaWali || '');
      setNoHpWali(student.noHpWali || '');
    }
  }, [student?.id, selectedStudentInfoId]);

  if (!student) return null;

  const advisor = db.staff.find((g) => g.id === student.guruBkId);
  const initials = student.nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const handleCopy = async (label: string, value?: string) => {
    if (!value || value === '-') return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await compressImageFile(file, 600, 0.8);
      setLinkFoto(res.dataUrl);
      setImgError(false);
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Memuat Foto',
        message: err instanceof Error ? err.message : 'File tidak valid.',
      });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim() || !nisn.trim() || !nama.trim() || !kelas.trim()) return;
    upsertStudent({
      ...student,
      nis: nis.trim(),
      nisn: nisn.trim(),
      nama: nama.trim(),
      kelas: kelas.trim(),
      noAbsen: noAbsen.trim() || undefined,
      ttl: ttl.trim() || undefined,
      email: email.trim() || undefined,
      noHp: noHp.trim() || undefined,
      linkFoto: linkFoto.trim() || undefined,
      namaWali: namaWali.trim() || '-',
      noHpWali: noHpWali.trim() || '-',
    });
    setIsEditing(false);
  };

  const activePhoto = isEditing ? linkFoto : student.linkFoto;
  const isExternalHttpUrl = Boolean(
    activePhoto && (activePhoto.startsWith('http://') || activePhoto.startsWith('https://'))
  );

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={closeStudentInfo}
      role="dialog"
      aria-modal="true"
      aria-label={`Informasi Siswa ${student.nama}`}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner + Photo */}
        <div className="relative sibk-hero-gradient px-6 pt-6 pb-5 text-white">
          <button
            type="button"
            onClick={closeStudentInfo}
            aria-label="Tutup pop-up informasi siswa"
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 pr-8">
            <div className="w-24 h-24 rounded-2xl border-2 border-white/60 shadow-lg overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
              {activePhoto && !imgError ? (
                <img
                  src={activePhoto}
                  alt={`Foto ${student.nama}`}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-white">
                  {initials || <User className="w-8 h-8" />}
                </span>
              )}
            </div>

            <div className="text-center sm:text-left min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/20 text-[11px] font-bold">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{student.kelas}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/20 text-[11px] font-mono-tabular font-bold">
                  <Hash className="w-3 h-3" />
                  <span>No. Absen {student.noAbsen || '-'}</span>
                </span>
                {student.isSekretarisKelas && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-400/25 border border-white/30 text-[11px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Sekretaris Kelas</span>
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                {student.nama}
              </h3>
              <p className="text-xs text-white/85 font-mono-tabular mt-0.5">
                NIS {student.nis} · NISN {student.nisn}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!isEditing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    key: 'nis',
                    label: 'NIS',
                    value: student.nis,
                    icon: <IdCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
                    mono: true,
                    copyable: true,
                  },
                  {
                    key: 'nisn',
                    label: 'NISN',
                    value: student.nisn,
                    icon: <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                    mono: true,
                    copyable: true,
                  },
                  {
                    key: 'nama',
                    label: 'Nama Lengkap',
                    value: student.nama,
                    icon: <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
                  },
                  {
                    key: 'kelas',
                    label: 'Kelas',
                    value: student.kelas,
                    icon: <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                  },
                  {
                    key: 'noAbsen',
                    label: 'No. Absen',
                    value: student.noAbsen || '-',
                    icon: <Hash className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
                    mono: true,
                  },
                  {
                    key: 'ttl',
                    label: 'Tempat, Tanggal Lahir (TTL)',
                    value: student.ttl || '-',
                    icon: <Cake className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
                  },
                  {
                    key: 'email',
                    label: 'Email Siswa',
                    value: student.email || '-',
                    icon: <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
                    copyable: Boolean(student.email),
                  },
                  {
                    key: 'noHp',
                    label: 'No. HP Siswa',
                    value: student.noHp || '-',
                    icon: <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                    mono: true,
                    copyable: Boolean(student.noHp),
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">{item.icon}</div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {item.label}
                        </span>
                        <span
                          className={`block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all mt-0.5 ${
                            item.mono ? 'font-mono-tabular' : ''
                          }`}
                        >
                          {item.value}
                        </span>
                      </div>
                    </div>
                    {item.copyable && item.value !== '-' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(item.key, item.value)}
                        title={`Salin ${item.label}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-800 shrink-0"
                      >
                        {copiedField === item.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Link Foto Row */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Link2 className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Link Foto
                    </span>
                    <span className="block text-xs font-mono-tabular text-slate-800 dark:text-slate-200 truncate max-w-md mt-0.5">
                      {student.linkFoto
                        ? student.linkFoto.startsWith('data:image/')
                          ? 'Foto terpasang (Gambar tersimpan lokal / SVG)'
                          : student.linkFoto
                        : 'Belum ada link foto'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {student.linkFoto && (
                    <button
                      type="button"
                      onClick={() => handleCopy('linkFoto', student.linkFoto)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                    >
                      {copiedField === 'linkFoto' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Salin</span>
                    </button>
                  )}
                  {isExternalHttpUrl && (
                    <a
                      href={student.linkFoto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Wali & Pembimbing Summary */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  <strong className="text-slate-900 dark:text-white">Wali Murid:</strong>{' '}
                  {student.namaWali} ({student.noHpWali})
                </span>
                <span>
                  <strong className="text-slate-900 dark:text-white">Guru BK:</strong>{' '}
                  {advisor?.nama || '-'}
                </span>
              </div>
            </>
          ) : (
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    NIS
                  </label>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
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
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    No. Absen
                  </label>
                  <input
                    type="text"
                    value={noAbsen}
                    onChange={(e) => setNoAbsen(e.target.value)}
                    placeholder="Contoh: 04"
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
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
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
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Tempat, Tgl Lahir (TTL)
                  </label>
                  <input
                    type="text"
                    value={ttl}
                    onChange={(e) => setTtl(e.target.value)}
                    placeholder="Kota, DD Bulan YYYY"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Email Siswa
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@siswa.sch.id"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    No. HP Siswa
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Link Foto (URL) atau Unggah Foto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkFoto}
                    onChange={(e) => {
                      setLinkFoto(e.target.value);
                      setImgError(false);
                    }}
                    placeholder="https://... atau unggah foto"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                  <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shrink-0">
                    <Camera className="w-4 h-4" />
                    <span>Unggah</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Wali Murid
                  </label>
                  <input
                    type="text"
                    value={namaWali}
                    onChange={(e) => setNamaWali(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    No. HP Wali
                  </label>
                  <input
                    type="text"
                    value={noHpWali}
                    onChange={(e) => setNoHpWali(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!isEditing && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center justify-between gap-3">
            {currentStaff ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Informasi Siswa</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Data Identitas Resmi Siswa SiBK
              </span>
            )}
            <button
              type="button"
              onClick={closeStudentInfo}
              className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
