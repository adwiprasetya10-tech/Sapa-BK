import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  EyeOff,
  FilePlus2,
  Lock,
  Phone,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import {
  CounselingCategory,
  CounselingNote,
  CounselingRequest,
  ProgressStatus,
} from '../../types/sibk';
import {
  CounselingAISuggestion,
  generateCounselingSuggestion,
} from '../../utils/counselingHelper';
import { exportStudentNotesCSV } from '../../utils/dataTransfer';

interface StudentNotesTabProps {
  prefillFromRequest: CounselingRequest | null;
  onClearPrefill: () => void;
}

const SERVICE_TYPES: CounselingCategory[] = [
  'Konseling Pribadi',
  'Konseling Sosial',
  'Konseling Belajar',
  'Perencanaan Karir',
  'Mediasi Masalah',
  'Permohonan Surat/Izin',
];

const PROGRESS_OPTIONS: ProgressStatus[] = [
  'Membaik',
  'Perlu Pemantauan',
  'Panggilan Orang Tua',
];

export const StudentNotesTab: React.FC<StudentNotesTabProps> = ({
  prefillFromRequest,
  onClearPrefill,
}) => {
  const {
    db,
    currentStaff,
    addCounselingNote,
    updateCounselingNote,
    deleteCounselingNote,
    openStudentInfo,
    pushToast,
  } = useSiBK();

  const isAdmin = currentStaff?.role === 'admin';

  const accessibleStudents = db.students.filter((student) => {
    if (isAdmin) return true;
    const isAdvisor = student.guruBkId === currentStaff?.id;
    const hasRequestToMe = db.requests.some(
      (r) => r.studentId === student.id && r.guruTujuanId === currentStaff?.id
    );
    const hasNoteByMe = db.notes.some(
      (n) => n.studentId === student.id && n.guruId === currentStaff?.id
    );
    return isAdvisor || hasRequestToMe || hasNoteByMe;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    prefillFromRequest?.studentId || accessibleStudents[0]?.id || ''
  );

  // Add/Edit Note Form State
  const [showAddForm, setShowAddForm] = useState(Boolean(prefillFromRequest));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState(getTodayISO());
  const [jenisLayanan, setJenisLayanan] = useState<CounselingCategory>(
    prefillFromRequest?.jenisKeperluan || 'Konseling Pribadi'
  );
  const [deskripsiPermasalahan, setDeskripsiPermasalahan] = useState(
    prefillFromRequest ? `Tindak lanjut permohonan siswa: ${prefillFromRequest.ceritaSingkat}` : ''
  );
  const [hasilAsesmen, setHasilAsesmen] = useState('');
  const [rencanaTindakLanjut, setRencanaTindakLanjut] = useState('');
  const [statusPerkembangan, setStatusPerkembangan] =
    useState<ProgressStatus>('Membaik');
  const [isRahasia, setIsRahasia] = useState(
    prefillFromRequest?.tingkatUrgensi === 'Mendesak (Rahasia)'
  );
  const [linkedRequestId, setLinkedRequestId] = useState<string | undefined>(
    prefillFromRequest?.id
  );

  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<CounselingAISuggestion | null>(null);

  useEffect(() => {
    if (prefillFromRequest) {
      setSelectedStudentId(prefillFromRequest.studentId);
      setEditingNoteId(null);
      setShowAddForm(true);
      setTanggal(getTodayISO());
      setJenisLayanan(prefillFromRequest.jenisKeperluan);
      setDeskripsiPermasalahan(
        `Tindak lanjut permohonan siswa: ${prefillFromRequest.ceritaSingkat}`
      );
      setHasilAsesmen('');
      setRencanaTindakLanjut('');
      setIsRahasia(prefillFromRequest.tingkatUrgensi === 'Mendesak (Rahasia)');
      setLinkedRequestId(prefillFromRequest.id);
      setAiSuggestion(null);
    }
  }, [prefillFromRequest]);

  const filteredStudents = accessibleStudents.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.nama.toLowerCase().includes(q) ||
      s.kelas.toLowerCase().includes(q) ||
      s.nis.toLowerCase().includes(q)
    );
  });

  const selectedStudent =
    accessibleStudents.find((s) => s.id === selectedStudentId) ||
    filteredStudents[0] ||
    null;

  const studentNotes = selectedStudent
    ? db.notes
        .filter((n) => n.studentId === selectedStudent.id)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    : [];

  const visibleNotesForAI = studentNotes.filter(
    (n) => !n.isRahasia || n.guruId === currentStaff?.id
  );

  const handleRunAIHelper = () => {
    if (!selectedStudent) return;
    const result = generateCounselingSuggestion(selectedStudent, visibleNotesForAI, {
      jenisLayanan,
      deskripsiPermasalahan,
      hasilAsesmen,
    });
    setAiSuggestion(result);
    pushToast({
      type: 'info',
      title: 'Ringkasan & Saran Tindak Lanjut Siap',
      message: `Analisis disusun berdasarkan rekam jejak ${selectedStudent.nama}.`,
    });
  };

  const handleApplySuggestionToForm = () => {
    if (!aiSuggestion) return;
    setShowAddForm(true);
    setRencanaTindakLanjut(aiSuggestion.draftRencanaTeks);
    pushToast({
      type: 'success',
      title: 'Saran Disalin ke Rencana Tindak Lanjut',
    });
  };

  const startEditNote = (note: CounselingNote) => {
    setEditingNoteId(note.id);
    setShowAddForm(true);
    setTanggal(note.tanggal);
    setJenisLayanan(note.jenisLayanan);
    setDeskripsiPermasalahan(note.deskripsiPermasalahan);
    setHasilAsesmen(note.hasilAsesmen);
    setRencanaTindakLanjut(note.rencanaTindakLanjut);
    setStatusPerkembangan(note.statusPerkembangan);
    setIsRahasia(note.isRahasia);
    setLinkedRequestId(undefined);
  };

  const resetNoteForm = () => {
    setEditingNoteId(null);
    setDeskripsiPermasalahan('');
    setHasilAsesmen('');
    setRencanaTindakLanjut('');
    setIsRahasia(false);
    setShowAddForm(false);
    setLinkedRequestId(undefined);
    if (prefillFromRequest) onClearPrefill();
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!deskripsiPermasalahan.trim() || !hasilAsesmen.trim() || !rencanaTindakLanjut.trim()) {
      pushToast({
        type: 'warning',
        title: 'Lengkapi Formulir Catatan',
        message: 'Deskripsi permasalahan, hasil asesmen, dan rencana tindak lanjut wajib diisi.',
      });
      return;
    }

    if (editingNoteId) {
      updateCounselingNote(editingNoteId, {
        tanggal,
        jenisLayanan,
        deskripsiPermasalahan,
        hasilAsesmen,
        rencanaTindakLanjut,
        statusPerkembangan,
        isRahasia,
      });
    } else {
      addCounselingNote({
        studentId: selectedStudent.id,
        tanggal,
        jenisLayanan,
        deskripsiPermasalahan,
        hasilAsesmen,
        rencanaTindakLanjut,
        statusPerkembangan,
        isRahasia,
        requestId: linkedRequestId,
      });
    }
    resetNoteForm();
  };

  const handleExportStudentTimeline = () => {
    if (!selectedStudent || !currentStaff) return;
    exportStudentNotesCSV(selectedStudent, studentNotes, currentStaff.id);
    pushToast({
      type: 'success',
      title: 'Rekam Jejak Diekspor (CSV)',
      message: `Riwayat konseling ${selectedStudent.nama} berhasil diunduh.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Buku Catatan Digital & Rekam Jejak Siswa
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {isAdmin
            ? 'Akses seluruh profil siswa. Catatan bertanda Rahasia tetap terlindungi oleh pembuatnya.'
            : 'Menampilkan daftar siswa bimbingan Anda beserta linimasa catatan konseling.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Student Directory */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama, Kelas, atau NIS..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {filteredStudents.length} siswa ditampilkan
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Siswa tidak ditemukan.
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedStudent?.id === s.id;
                const notesOfStudent = db.notes
                  .filter((n) => n.studentId === s.id)
                  .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
                const latestNote = notesOfStudent[0];

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setAiSuggestion(null);
                      setEditingNoteId(null);
                    }}
                    className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/40 border-r-2 border-teal-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isSelected
                            ? 'text-teal-900 dark:text-teal-300'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {s.nama}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                        {s.kelas} · NIS {s.nis}
                      </p>
                      {latestNote && (
                        <p
                          className={`text-[11px] mt-1 font-medium ${
                            latestNote.statusPerkembangan === 'Panggilan Orang Tua'
                              ? 'text-rose-600 dark:text-rose-400'
                              : latestNote.statusPerkembangan === 'Perlu Pemantauan'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          Status: {latestNote.statusPerkembangan}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
                      {notesOfStudent.length} catatan
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Detail Profil + AI Helper + Form + Timeline */}
        <section className="lg:col-span-8 space-y-5">
          {!selectedStudent ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Pilih siswa dari daftar di sebelah kiri
              </p>
            </div>
          ) : (
            <>
              {/* Student Profile Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {selectedStudent.linkFoto && (
                      <button
                        type="button"
                        onClick={() => openStudentInfo(selectedStudent.id)}
                        title="Lihat informasi lengkap siswa"
                        className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
                      >
                        <img
                          src={selectedStudent.linkFoto}
                          alt={selectedStudent.nama}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <button
                          type="button"
                          onClick={() => openStudentInfo(selectedStudent.id)}
                          title="Klik untuk lihat informasi lengkap siswa"
                          className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-4 text-left transition-colors"
                        >
                          {selectedStudent.nama}
                        </button>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => openStudentInfo(selectedStudent.id)}
                          title="Klik untuk lihat informasi lengkap siswa"
                          className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4 transition-colors"
                        >
                          {selectedStudent.kelas}
                        </button>
                        {selectedStudent.noAbsen && (
                          <span className="text-xs font-mono-tabular px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Absen {selectedStudent.noAbsen}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                        <span>NIS: {selectedStudent.nis}</span>
                        <span>NISN: {selectedStudent.nisn}</span>
                        {selectedStudent.noHp && <span>HP: {selectedStudent.noHp}</span>}
                        {selectedStudent.email && (
                          <span className="font-sans">{selectedStudent.email}</span>
                        )}
                        {selectedStudent.ttl && (
                          <span className="font-sans">TTL: {selectedStudent.ttl}</span>
                        )}
                        <span className="font-sans">
                          Wali: {selectedStudent.namaWali} ({selectedStudent.noHpWali})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportStudentTimeline}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRunAIHelper}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 px-3.5 py-2 text-xs font-semibold text-violet-800 dark:text-violet-300 hover:bg-violet-100"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ringkas & Beri Saran Tindak Lanjut</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(null);
                        setShowAddForm((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-3.5 py-2 text-xs font-semibold shadow-xs"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>{showAddForm ? 'Tutup Form' : 'Tambah Catatan Baru'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Helper Output */}
                {aiSuggestion && (
                  <div className="mt-5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/30 p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-200/60 dark:border-violet-800/60 pb-2.5">
                      <div className="flex items-center gap-2 text-violet-900 dark:text-violet-300 font-display font-bold text-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>Asisten Analisis & Rekomendasi BK</span>
                      </div>
                      <span className="text-xs font-semibold text-violet-800 dark:text-violet-300">
                        Prioritas: {aiSuggestion.tingkatPrioritas}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiSuggestion.ringkasanKasus}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                          Pola Teridentifikasi
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                          {aiSuggestion.polaTerdeteksi.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                          Saran Rencana Tindak Lanjut
                        </h4>
                        <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                          {aiSuggestion.rekomendasiTindakLanjut.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAiSuggestion(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        onClick={handleApplySuggestionToForm}
                        className="inline-flex items-center gap-1.5 rounded-lg sibk-btn-primary px-3.5 py-1.5 text-xs font-semibold"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Salin ke Rencana Tindak Lanjut</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add / Edit Note Form */}
              {showAddForm && (
                <form
                  onSubmit={handleSaveNote}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-300 dark:border-teal-700 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {editingNoteId
                        ? 'Edit Catatan Konseling'
                        : 'Tambah Catatan Konseling Baru'}
                    </h4>
                    {linkedRequestId && (
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Terhubung dengan penyelesaian antrean siswa
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Tanggal Sesi
                      </label>
                      <input
                        type="date"
                        required
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Jenis Layanan
                      </label>
                      <select
                        value={jenisLayanan}
                        onChange={(e) => setJenisLayanan(e.target.value as CounselingCategory)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        {SERVICE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Status Perkembangan
                      </label>
                      <select
                        value={statusPerkembangan}
                        onChange={(e) =>
                          setStatusPerkembangan(e.target.value as ProgressStatus)
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      >
                        {PROGRESS_OPTIONS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Deskripsi Permasalahan
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={deskripsiPermasalahan}
                      onChange={(e) => setDeskripsiPermasalahan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Hasil Asesmen / Wawancara
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={hasilAsesmen}
                      onChange={(e) => setHasilAsesmen(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Rencana Tindak Lanjut
                      </label>
                      <button
                        type="button"
                        onClick={handleRunAIHelper}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Bantu Susun Saran</span>
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      required
                      value={rencanaTindakLanjut}
                      onChange={(e) => setRencanaTindakLanjut(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  {/* Confidential Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Tandai Sebagai Catatan Rahasia
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Isi catatan akan disensor dan dikunci bagi pengguna lain selain Anda.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRahasia}
                      onClick={() => setIsRahasia((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        isRahasia ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          isRahasia ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={resetNoteForm}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                    >
                      {editingNoteId ? 'Simpan Perubahan' : 'Simpan Catatan Konseling'}
                    </button>
                  </div>
                </form>
              )}

              {/* Counseling Notes Timeline */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                  <h4 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Linimasa Catatan Konseling ({studentNotes.length})
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Urutan terbaru
                  </span>
                </div>

                {studentNotes.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                    Belum ada catatan rekam jejak konseling untuk siswa ini.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                    {studentNotes.map((note) => {
                      const isLockedSecret =
                        note.isRahasia && note.guruId !== currentStaff?.id;
                      const canModify =
                        !isLockedSecret &&
                        (note.guruId === currentStaff?.id || isAdmin);

                      const statusMeta = {
                        Membaik: {
                          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                          cls: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
                        },
                        'Perlu Pemantauan': {
                          icon: <AlertTriangle className="w-3.5 h-3.5" />,
                          cls: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
                        },
                        'Panggilan Orang Tua': {
                          icon: <Phone className="w-3.5 h-3.5" />,
                          cls: 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
                        },
                      }[note.statusPerkembangan];

                      return (
                        <article key={note.id} className="relative">
                          <span
                            className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-xs ${
                              note.isRahasia ? 'bg-violet-600' : 'bg-teal-500'
                            }`}
                          />

                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                                    {formatTanggalID(note.tanggal)}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>Oleh: {note.guruNama}</span>
                                  {note.isRahasia && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="inline-flex items-center gap-1 font-semibold text-violet-700 dark:text-violet-400">
                                        <Lock className="w-3 h-3" />
                                        Catatan Rahasia
                                      </span>
                                    </>
                                  )}
                                </div>
                                <h5 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                                  {note.jenisLayanan}
                                </h5>
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusMeta.cls}`}
                                >
                                  {statusMeta.icon}
                                  <span>{note.statusPerkembangan}</span>
                                </span>
                                {canModify && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEditNote(note)}
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="Edit catatan"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteNoteId(note.id)}
                                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                      title="Hapus catatan"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isLockedSecret ? (
                              <div className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                <EyeOff className="w-5 h-5 text-slate-500 shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                                    Konten Disensor (Privasi Konseling)
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                    Catatan ini ditandai rahasia dan hanya dapat dibuka oleh pembuat catatan ({note.guruNama}).
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3.5 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                <div>
                                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                                    Deskripsi Permasalahan
                                  </span>
                                  <p className="leading-relaxed">{note.deskripsiPermasalahan}</p>
                                </div>
                                <div>
                                  <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                                    Hasil Asesmen / Wawancara
                                  </span>
                                  <p className="leading-relaxed">{note.hasilAsesmen}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 p-3">
                                  <span className="block text-xs font-semibold text-teal-700 dark:text-teal-400 mb-0.5">
                                    Rencana Tindak Lanjut
                                  </span>
                                  <p className="leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                                    {note.rencanaTindakLanjut}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Confirm Delete Note Modal */}
      {confirmDeleteNoteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Hapus Catatan Konseling
              </h3>
              <button
                type="button"
                onClick={() => setConfirmDeleteNoteId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus catatan konseling ini dari rekam jejak siswa?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteNoteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCounselingNote(confirmDeleteNoteId);
                  setConfirmDeleteNoteId(null);
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
