import React, { useState } from 'react';
import {
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID, getTodayISO } from '../../data/seedData';
import { GuestVisit, VisitorCategory, VisitorStatus } from '../../types/sibk';
import {
  downloadGuestCSVTemplate,
  exportGuestsCSV,
  parseCsvRows,
} from '../../utils/dataTransfer';
import { ParsedGuestQrCheckIn } from '../../utils/guestQr';
import { GuestQrScannerModal } from '../GuestQrScannerModal';

export const GuestMonitorTab: React.FC = () => {
  const {
    db,
    settings,
    markGuestCompleted,
    completeGuestsBulk,
    deleteGuests,
    registerGuestVisit,
    updateGuestVisit,
    importGuests,
    pushToast,
  } = useSiBK();
  const today = getTodayISO();

  const [dateFilter, setDateFilter] = useState<string>(today);
  const [showAllDates, setShowAllDates] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);

  // Modal Add/Edit Guest
  const [modalGuest, setModalGuest] = useState<Partial<GuestVisit> | null>(null);

  // Modal QR Scanner
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // Modal Import CSV Guest
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [parsedGuests, setParsedGuests] = useState<
    Omit<GuestVisit, 'id' | 'nomorAntrean' | 'tanggal' | 'jamMasuk' | 'status'>[]
  >([]);

  const filteredGuests = db.guests.filter((g) => {
    const matchesDate = showAllDates || !dateFilter || g.tanggal === dateFilter;
    const matchesCat = categoryFilter === 'Semua' || g.kategori === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      g.namaLengkap.toLowerCase().includes(q) ||
      g.nomorAntrean.toLowerCase().includes(q) ||
      (g.namaSiswaTerkait?.toLowerCase().includes(q) ?? false) ||
      g.pihakDituju.toLowerCase().includes(q) ||
      g.keperluan.toLowerCase().includes(q);
    return matchesDate && matchesCat && matchesQuery;
  });

  const allSelected =
    filteredGuests.length > 0 &&
    filteredGuests.every((g) => selectedIds.includes(g.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGuests.map((g) => g.id));
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
        ? filteredGuests.filter((g) => selectedIds.includes(g.id))
        : filteredGuests;
    exportGuestsCSV(targets, 'Buku_Tamu');
    pushToast({
      type: 'success',
      title: `Ekspor ${targets.length} Data Tamu Berhasil`,
    });
  };

  const openAddGuest = () => {
    setModalGuest({
      namaLengkap: '',
      kategori: 'Wali Murid',
      namaSiswaTerkait: '',
      noWhatsApp: '',
      pihakDituju: db.staff[0]?.nama || '',
      keperluan: '',
    });
  };

  const openEditGuest = (g: GuestVisit) => {
    setModalGuest({ ...g });
  };

  const handleSaveGuestModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGuest) return;
    if (!modalGuest.namaLengkap?.trim() || !modalGuest.noWhatsApp?.trim() || !modalGuest.keperluan?.trim()) {
      return;
    }

    if (modalGuest.id) {
      updateGuestVisit(modalGuest.id, {
        namaLengkap: modalGuest.namaLengkap,
        kategori: modalGuest.kategori as VisitorCategory,
        namaSiswaTerkait: modalGuest.namaSiswaTerkait || undefined,
        noWhatsApp: modalGuest.noWhatsApp,
        pihakDituju: modalGuest.pihakDituju,
        keperluan: modalGuest.keperluan,
        status: modalGuest.status as VisitorStatus,
      });
    } else {
      registerGuestVisit({
        namaLengkap: modalGuest.namaLengkap,
        kategori: (modalGuest.kategori as VisitorCategory) || 'Wali Murid',
        namaSiswaTerkait: modalGuest.namaSiswaTerkait || undefined,
        noWhatsApp: modalGuest.noWhatsApp,
        pihakDituju: modalGuest.pihakDituju || db.staff[0]?.nama || 'Guru BK',
        keperluan: modalGuest.keperluan,
      });
      setDateFilter(today);
      setShowAllDates(false);
    }
    setModalGuest(null);
  };

  const handleGuestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = parseCsvRows(text);
      if (rows.length < 2) {
        pushToast({
          type: 'error',
          title: 'File CSV Kosong / Tidak Valid',
          message: 'Minimal harus terdapat baris header dan 1 baris data.',
        });
        return;
      }
      const dataRows = rows.slice(1).map((cols) => ({
        namaLengkap: cols[0] || 'Tamu Tanpa Nama',
        kategori: (['Wali Murid', 'Instansi/Dinas', 'Alumni', 'Umum'].includes(cols[1])
          ? cols[1]
          : 'Umum') as VisitorCategory,
        namaSiswaTerkait: cols[2] && cols[2] !== '-' ? cols[2] : undefined,
        noWhatsApp: cols[3] || '-',
        pihakDituju: cols[4] || db.staff[0]?.nama || 'Guru BK',
        keperluan: cols[5] || 'Kunjungan sekolah',
      }));
      setParsedGuests(dataRows);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedGuests.length === 0) return;
    importGuests(parsedGuests, importMode);
    setParsedGuests([]);
    setImportModalOpen(false);
    setShowAllDates(false);
    setDateFilter(today);
  };

  const handleQrCheckInParsed = (data: ParsedGuestQrCheckIn, autoSubmit: boolean) => {
    if (autoSubmit) {
      registerGuestVisit({
        namaLengkap: data.namaLengkap,
        kategori: data.kategori,
        namaSiswaTerkait: data.namaSiswaTerkait,
        noWhatsApp: data.noWhatsApp || '-',
        pihakDituju: data.pihakDituju || db.staff[0]?.nama || 'Guru BK',
        keperluan: data.keperluan,
      });
      setDateFilter(today);
      setShowAllDates(false);
    } else {
      setModalGuest({
        namaLengkap: data.namaLengkap,
        kategori: data.kategori,
        namaSiswaTerkait: data.namaSiswaTerkait || '',
        noWhatsApp: data.noWhatsApp === '-' ? '' : data.noWhatsApp,
        pihakDituju: data.pihakDituju || db.staff[0]?.nama || '',
        keperluan: data.keperluan,
      });
    }
  };

  const handleTicketQrScanned = (nomorAntrean: string, id?: string) => {
    const matched =
      (id && db.guests.find((g) => g.id === id)) ||
      db.guests.find((g) => g.nomorAntrean.toLowerCase() === nomorAntrean.toLowerCase());

    if (!matched) {
      pushToast({
        type: 'warning',
        title: `Tiket ${nomorAntrean} Tidak Ditemukan`,
        message: 'Tidak ada kunjungan aktif yang cocok dengan kode QR tiket tersebut.',
      });
      return;
    }

    if (matched.status === 'Selesai') {
      pushToast({
        type: 'info',
        title: `Tamu ${matched.namaLengkap} (${matched.nomorAntrean}) Sudah Selesai`,
      });
      return;
    }

    markGuestCompleted(matched.id);
    pushToast({
      type: 'success',
      title: `Check-Out QR Berhasil: ${matched.namaLengkap}`,
      message: `Antrean ${matched.nomorAntrean} ditandai Selesai.`,
    });
  };

  const activeCount = filteredGuests.filter((g) => g.status === 'Berkunjung').length;
  const completedCount = filteredGuests.filter((g) => g.status === 'Selesai').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Monitoring Tamu Umum & Wali Murid
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih, edit, hapus, ekspor, dan impor log kunjungan orang tua, instansi, dan alumni.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {settings.enableQrScanner && (
            <button
              type="button"
              onClick={() => setQrScannerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR Tamu</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Upload className="w-4 h-4" />
            <span>Impor CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportSelected}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={openAddGuest}
            className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Tamu Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setShowAllDates(false);
                setDateFilter(today);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !showAllDates && dateFilter === today
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setShowAllDates(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                showAllDates
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setShowAllDates(false);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-mono-tabular text-slate-800 dark:text-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Wali Murid">Wali Murid</option>
            <option value="Instansi/Dinas">Instansi/Dinas</option>
            <option value="Alumni">Alumni</option>
            <option value="Umum">Umum</option>
          </select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular whitespace-nowrap">
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {activeCount} Berkunjung
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {completedCount} Selesai
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tamu, antrean, siswa..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Contextual Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs sm:text-sm font-semibold text-sky-900 dark:text-sky-200 font-mono-tabular">
            {selectedIds.length} tamu dipilih
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                completeGuestsBulk(selectedIds);
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
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Guest Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredGuests.length === 0 ? (
          <div className="py-14 px-6 text-center">
            <BookOpenCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Belum ada log kunjungan tamu pada filter ini
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/70 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua tamu"
                      className="w-4 h-4 rounded border-slate-300 text-teal-600"
                    />
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Antrean</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Waktu</th>
                  <th className="py-3.5 px-4">Pengunjung & Kategori</th>
                  <th className="py-3.5 px-4">Pihak Dituju & Kepentingan</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                {filteredGuests.map((guest) => {
                  const isChecked = selectedIds.includes(guest.id);
                  return (
                    <tr
                      key={guest.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-teal-50/60 dark:bg-teal-950/30'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(guest.id)}
                          aria-label={`Pilih ${guest.namaLengkap}`}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 mt-0.5"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap align-top">
                        {guest.nomorAntrean}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap align-top">
                        <div>{formatTanggalID(guest.tanggal)}</div>
                        <div className="mt-0.5 text-slate-900 dark:text-slate-200 font-medium">
                          Masuk: {guest.jamMasuk}
                        </div>
                        {guest.jamKeluar && (
                          <div className="text-emerald-700 dark:text-emerald-400">
                            Keluar: {guest.jamKeluar}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {guest.namaLengkap}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {guest.kategori} ·{' '}
                          <span className="font-mono-tabular">{guest.noWhatsApp}</span>
                        </p>
                        {guest.namaSiswaTerkait && (
                          <p className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-1">
                            Siswa: {guest.namaSiswaTerkait}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {guest.pihakDituju}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {guest.keperluan}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        {guest.status === 'Berkunjung' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Berkunjung</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                        <div className="inline-flex items-center gap-1.5">
                          {guest.status === 'Berkunjung' && (
                            <button
                              type="button"
                              onClick={() => markGuestCompleted(guest.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              title="Tandai Kunjungan Selesai"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Selesai</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditGuest(guest)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit tamu"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteIds([guest.id])}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Hapus tamu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Guest */}
      {modalGuest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                {modalGuest.id ? 'Edit Log Kunjungan Tamu' : 'Catat Kunjungan Tamu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalGuest(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGuestModal} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={modalGuest.namaLengkap || ''}
                    onChange={(e) =>
                      setModalGuest({ ...modalGuest, namaLengkap: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Kategori
                  </label>
                  <select
                    value={modalGuest.kategori || 'Wali Murid'}
                    onChange={(e) =>
                      setModalGuest({
                        ...modalGuest,
                        kategori: e.target.value as VisitorCategory,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Wali Murid">Wali Murid</option>
                    <option value="Instansi/Dinas">Instansi/Dinas</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Siswa Terkait
                  </label>
                  <input
                    type="text"
                    value={modalGuest.namaSiswaTerkait || ''}
                    onChange={(e) =>
                      setModalGuest({ ...modalGuest, namaSiswaTerkait: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={modalGuest.noWhatsApp || ''}
                    onChange={(e) =>
                      setModalGuest({ ...modalGuest, noWhatsApp: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono-tabular text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Pihak / Guru BK yang Ditemui
                </label>
                <select
                  value={modalGuest.pihakDituju || ''}
                  onChange={(e) =>
                    setModalGuest({ ...modalGuest, pihakDituju: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {db.staff.map((g) => (
                    <option key={g.id} value={g.nama}>
                      {g.nama}
                    </option>
                  ))}
                  {settings.extraGuestTargets.map((extra) => (
                    <option key={extra} value={extra}>
                      {extra}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Uraian Kepentingan
                </label>
                <textarea
                  rows={2}
                  required
                  value={modalGuest.keperluan || ''}
                  onChange={(e) =>
                    setModalGuest({ ...modalGuest, keperluan: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalGuest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                >
                  Simpan Data Tamu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV Tamu */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Impor Log Tamu dari CSV
              </h3>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Belum punya format CSV?
              </span>
              <button
                type="button"
                onClick={downloadGuestCSVTemplate}
                className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                Unduh Template CSV Tamu
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Pilih File CSV
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleGuestFileChange}
                className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100"
              />
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                />
                <span>Gabungkan ke log saat ini</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>Ganti semua log tamu</span>
              </label>
            </div>
            {parsedGuests.length > 0 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                Siap mengimpor <strong>{parsedGuests.length}</strong> data tamu baru.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedGuests.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold disabled:opacity-50"
              >
                Jalankan Impor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {confirmDeleteIds && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus Log Tamu
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Anda yakin ingin menghapus <strong>{confirmDeleteIds.length}</strong> data kunjungan tamu?
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
                onClick={() => {
                  deleteGuests(confirmDeleteIds);
                  setSelectedIds((prev) =>
                    prev.filter((id) => !confirmDeleteIds.includes(id))
                  );
                  setConfirmDeleteIds(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <GuestQrScannerModal
        open={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        defaultCounselor={db.staff[0]?.nama || 'Guru BK'}
        mode="staff"
        defaultAutoSubmit={settings.defaultQrAutoCheckIn}
        onCheckInParsed={handleQrCheckInParsed}
        onTicketQrScanned={handleTicketQrScanned}
      />
    </div>
  );
};
