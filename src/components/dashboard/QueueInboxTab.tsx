import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Inbox,
  MapPin,
  Search,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import {
  CounselingCategory,
  CounselingRequest,
  RequestStatus,
  UrgencyLevel,
} from '../../types/sibk';
import { exportRequestsCSV } from '../../utils/dataTransfer';

interface QueueInboxTabProps {
  onStartNoteFromRequest: (req: CounselingRequest) => void;
}

const SERVICE_CATEGORIES: CounselingCategory[] = [
  'Konseling Pribadi',
  'Konseling Sosial',
  'Konseling Belajar',
  'Perencanaan Karir',
  'Mediasi Masalah',
  'Permohonan Surat/Izin',
];

export const QueueInboxTab: React.FC<QueueInboxTabProps> = ({
  onStartNoteFromRequest,
}) => {
  const {
    db,
    currentStaff,
    scheduleRequest,
    transferRequest,
    updateRequest,
    deleteRequests,
    completeRequestsBulk,
    pushToast,
  } = useSiBK();

  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Modal: Terima & Jadwalkan
  const [schedulingReq, setSchedulingReq] = useState<CounselingRequest | null>(null);
  const [jadwalTanggal, setJadwalTanggal] = useState(getTodayISO());
  const [jadwalJam, setJadwalJam] = useState('12:00');
  const [ruangPertemuan, setRuangPertemuan] = useState(
    currentStaff?.ruang || 'Ruang Konseling 1'
  );
  const [catatanGuru, setCatatanGuru] = useState('');

  // Modal: Alihkan ke Guru Lain
  const [transferReq, setTransferReq] = useState<CounselingRequest | null>(null);
  const [newGuruId, setNewGuruId] = useState('');
  const [alasanPengalihan, setAlasanPengalihan] = useState('');

  // Modal: Edit Antrean
  const [editingReq, setEditingReq] = useState<CounselingRequest | null>(null);

  const isAdmin = currentStaff?.role === 'admin';

  const scopedRequests = db.requests.filter((req) => {
    if (isAdmin) return true;
    return req.guruTujuanId === currentStaff?.id;
  });

  const filteredRequests = scopedRequests.filter((req) => {
    const student = db.students.find((s) => s.id === req.studentId);
    const matchesStatus = statusFilter === 'Semua' || req.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (student?.nama.toLowerCase().includes(q) ?? false) ||
      (student?.kelas.toLowerCase().includes(q) ?? false) ||
      req.jenisKeperluan.toLowerCase().includes(q) ||
      req.ceritaSingkat.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const allFilteredSelected =
    filteredRequests.length > 0 &&
    filteredRequests.every((r) => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportSelected = () => {
    const targets =
      selectedIds.length > 0
        ? filteredRequests.filter((r) => selectedIds.includes(r.id))
        : filteredRequests;
    exportRequestsCSV(targets, db.students, db.staff, 'Antrean_Konseling');
    pushToast({
      type: 'success',
      title: `Ekspor ${targets.length} Antrean Berhasil`,
      message: 'File CSV antrean konseling telah diunduh.',
    });
  };

  const openScheduleModal = (req: CounselingRequest) => {
    setSchedulingReq(req);
    setJadwalTanggal(req.jadwalTanggal || getTodayISO());
    setJadwalJam(req.jadwalJam || '12:00');
    setRuangPertemuan(req.ruangPertemuan || currentStaff?.ruang || 'Ruang Konseling 1');
    setCatatanGuru(
      req.catatanGuru ||
        'Permohonan diterima. Silakan hadir tepat waktu sesuai jadwal ruang konseling.'
    );
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingReq) return;
    scheduleRequest(schedulingReq.id, {
      jadwalTanggal,
      jadwalJam,
      ruangPertemuan,
      catatanGuru,
    });
    setSchedulingReq(null);
  };

  const openTransferModal = (req: CounselingRequest) => {
    setTransferReq(req);
    const otherStaff = db.staff.find((g) => g.id !== req.guruTujuanId);
    setNewGuruId(otherStaff?.id || '');
    setAlasanPengalihan('Penyesuaian spesialisasi layanan / jadwal ketersediaan.');
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferReq || !newGuruId) return;
    transferRequest(transferReq.id, newGuruId, alasanPengalihan);
    setTransferReq(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    updateRequest(editingReq.id, {
      jenisKeperluan: editingReq.jenisKeperluan,
      tingkatUrgensi: editingReq.tingkatUrgensi,
      ceritaSingkat: editingReq.ceritaSingkat,
      usulanWaktu: editingReq.usulanWaktu,
      status: editingReq.status,
      catatanGuru: editingReq.catatanGuru,
    });
    setEditingReq(null);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteIds || confirmDeleteIds.length === 0) return;
    deleteRequests(confirmDeleteIds);
    setSelectedIds((prev) => prev.filter((id) => !confirmDeleteIds.includes(id)));
    setConfirmDeleteIds(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Kotak Masuk & Antrean Konseling
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Mode Admin Utama: pilih, edit, jadwalkan, ekspor, atau hapus permohonan lintas Guru BK.'
              : `Kelola antrean konseling yang ditujukan kepada ${currentStaff?.nama}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportSelected}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          <span>
            {selectedIds.length > 0
              ? `Ekspor Terpilih (${selectedIds.length})`
              : 'Ekspor Semua Antrean (CSV)'}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Pilih Semua</span>
          </label>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['Semua', 'Menunggu Konfirmasi', 'Dijadwalkan', 'Selesai'].map((st) => {
              const count =
                st === 'Semua'
                  ? scopedRequests.length
                  : scopedRequests.filter((r) => r.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'sibk-btn-primary shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st === 'Menunggu Konfirmasi' ? 'Menunggu' : st}{' '}
                  <span className="font-mono-tabular opacity-75 ml-1">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, kelas, topik..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Contextual Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-semibold text-indigo-900 dark:text-indigo-200 font-mono-tabular">
            {selectedIds.length} item dipilih
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                completeRequestsBulk(selectedIds);
                setSelectedIds([]);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tandai Selesai</span>
            </button>
            <button
              type="button"
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteIds(selectedIds)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-14 px-6 text-center">
          <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Tidak ada permohonan konseling yang sesuai filter
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const student = db.students.find((s) => s.id === req.studentId);
            const targetGuru = db.staff.find((g) => g.id === req.guruTujuanId);
            const isChecked = selectedIds.includes(req.id);

            const statusBadge = {
              'Menunggu Konfirmasi':
                'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
              Dijadwalkan:
                'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300',
              Selesai:
                'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
            }[req.status];

            return (
              <div
                key={req.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 transition-colors ${
                  isChecked
                    ? 'border-teal-500 ring-1 ring-teal-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelectOne(req.id)}
                      aria-label={`Pilih permohonan ${student?.nama || req.id}`}
                      className="mt-1.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
                    />
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {student?.nama || 'Siswa'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {student?.kelas || '-'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          NIS {student?.nis || '-'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">
                          {formatTanggalID(req.tanggalPengajuan)} {req.jamPengajuan} WIB
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                          {req.jenisKeperluan}
                        </h3>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                          /
                        </span>
                        <span
                          className={`text-xs font-semibold inline-flex items-center gap-1 ${
                            req.tingkatUrgensi === 'Mendesak (Rahasia)'
                              ? 'text-rose-600 dark:text-rose-400'
                              : req.tingkatUrgensi === 'Segera'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {req.tingkatUrgensi === 'Mendesak (Rahasia)' && (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          {req.tingkatUrgensi}
                        </span>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {req.ceritaSingkat}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>
                            Tujuan:{' '}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {targetGuru?.nama}
                            </strong>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Usulan: {req.usulanWaktu}</span>
                        </span>
                      </div>

                      {req.jadwalTanggal && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-sky-800 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 rounded-xl px-3.5 py-2.5">
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
                    </div>
                  </div>

                  {/* Right Status + Actions */}
                  <div className="flex flex-col items-start lg:items-end justify-between gap-3 shrink-0 pl-7 lg:pl-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold ${statusBadge}`}
                    >
                      {req.status === 'Selesai' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : req.status === 'Dijadwalkan' ? (
                        <Calendar className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {req.status}
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {req.status !== 'Selesai' && (
                        <>
                          <button
                            type="button"
                            onClick={() => openScheduleModal(req)}
                            className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Terima & Jadwalkan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openTransferModal(req)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Alihkan</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onStartNoteFromRequest(req)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai & Buat Catatan</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingReq({ ...req })}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit permohonan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteIds([req.id])}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-800 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Hapus permohonan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: TERIMA & JADWALKAN */}
      {schedulingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Jadwalkan Sesi Konseling
              </h3>
              <button
                type="button"
                onClick={() => setSchedulingReq(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    required
                    value={jadwalTanggal}
                    onChange={(e) => setJadwalTanggal(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Jam (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={jadwalJam}
                    onChange={(e) => setJadwalJam(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ruang Pertemuan
                </label>
                <input
                  type="text"
                  required
                  value={ruangPertemuan}
                  onChange={(e) => setRuangPertemuan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Catatan / Balasan untuk Siswa
                </label>
                <textarea
                  rows={3}
                  value={catatanGuru}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALIHKAN KE GURU LAIN */}
      {transferReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Alihkan ke Guru BK Lain
              </h3>
              <button
                type="button"
                onClick={() => setTransferReq(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Pilih Guru BK Tujuan Baru
                </label>
                <select
                  value={newGuruId}
                  onChange={(e) => setNewGuruId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
                >
                  {db.staff
                    .filter((g) => g.id !== transferReq.guruTujuanId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} ({g.spesialisasi})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Alasan Pengalihan
                </label>
                <textarea
                  rows={2}
                  required
                  value={alasanPengalihan}
                  onChange={(e) => setAlasanPengalihan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Alihkan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ANTREAN */}
      {editingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Edit Permohonan Konseling
              </h3>
              <button
                type="button"
                onClick={() => setEditingReq(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Jenis Layanan
                  </label>
                  <select
                    value={editingReq.jenisKeperluan}
                    onChange={(e) =>
                      setEditingReq({
                        ...editingReq,
                        jenisKeperluan: e.target.value as CounselingCategory,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Urgensi
                  </label>
                  <select
                    value={editingReq.tingkatUrgensi}
                    onChange={(e) =>
                      setEditingReq({
                        ...editingReq,
                        tingkatUrgensi: e.target.value as UrgencyLevel,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Segera">Segera</option>
                    <option value="Mendesak (Rahasia)">Mendesak (Rahasia)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Status
                  </label>
                  <select
                    value={editingReq.status}
                    onChange={(e) =>
                      setEditingReq({
                        ...editingReq,
                        status: e.target.value as RequestStatus,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                    <option value="Dijadwalkan">Dijadwalkan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Cerita Singkat / Keperluan
                </label>
                <textarea
                  rows={3}
                  value={editingReq.ceritaSingkat}
                  onChange={(e) =>
                    setEditingReq({ ...editingReq, ceritaSingkat: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Catatan Guru BK
                </label>
                <textarea
                  rows={2}
                  value={editingReq.catatanGuru || ''}
                  onChange={(e) =>
                    setEditingReq({ ...editingReq, catatanGuru: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus Antrean
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Anda yakin ingin menghapus <strong>{confirmDeleteIds.length}</strong> data
              permohonan konseling? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
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
