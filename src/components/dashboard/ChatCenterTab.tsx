import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ImagePlus,
  MessageSquare,
  Search,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID } from '../../data/seedData';
import { compressImageFile } from '../../utils/imageCompress';
import { requestBrowserNotificationPermission } from '../../utils/soundNotifier';

const QUICK_REPLIES = [
  'Terima kasih infonya, silakan temui Bapak/Ibu di Ruang BK saat jam istirahat.',
  'Pesan sudah diterima. Tetap semangat, mari kita diskusikan bersama.',
  'Baik, surat keterangan dan konfirmasi kehadiran sudah dicatat.',
];

export const ChatCenterTab: React.FC = () => {
  const {
    db,
    currentStaff,
    settings,
    updateSettings,
    sendChatMessage,
    markChatRead,
    testNotificationSound,
    openStudentInfo,
    pushToast,
  } = useSiBK();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  if (!currentStaff) return null;

  const isAdmin = currentStaff.role === 'admin';
  const scopedStudents = isAdmin
    ? db.students
    : db.students.filter(
        (s) =>
          s.guruBkId === currentStaff.id ||
          db.chats.some((c) => c.studentId === s.id && c.staffId === currentStaff.id)
      );

  const studentThreads = scopedStudents
    .map((st) => {
      const msgs = db.chats.filter((c) =>
        isAdmin
          ? c.studentId === st.id
          : c.studentId === st.id && c.staffId === currentStaff.id
      );
      const unread = msgs.filter(
        (c) => c.senderRole === 'student' && !c.readByStaff
      ).length;
      const lastMsg = msgs[msgs.length - 1];
      return {
        student: st,
        msgs,
        unread,
        lastMsg,
      };
    })
    .filter((item) => {
      if (filterMode === 'unread' && item.unread === 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.student.nama.toLowerCase().includes(q) ||
          item.student.kelas.toLowerCase().includes(q) ||
          item.student.nis.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread;
      const aTime = a.lastMsg?.createdAt || '';
      const bTime = b.lastMsg?.createdAt || '';
      return bTime.localeCompare(aTime);
    });

  const activeStudentId =
    selectedStudentId &&
    scopedStudents.some((s) => s.id === selectedStudentId)
      ? selectedStudentId
      : studentThreads[0]?.student.id || scopedStudents[0]?.id || '';

  const activeStudent = db.students.find((s) => s.id === activeStudentId);

  // Determine staffId for the active conversation
  const activeThreadStaffId = isAdmin
    ? db.chats
        .filter((c) => c.studentId === activeStudentId)
        .slice(-1)[0]?.staffId ||
      activeStudent?.guruBkId ||
      currentStaff.id
    : currentStaff.id;

  const activeMessages = db.chats.filter((c) =>
    isAdmin
      ? c.studentId === activeStudentId
      : c.studentId === activeStudentId && c.staffId === currentStaff.id
  );

  useEffect(() => {
    if (!activeStudentId) return;
    if (isAdmin) {
      const staffIds = Array.from(
        new Set(
          db.chats
            .filter((c) => c.studentId === activeStudentId && !c.readByStaff)
            .map((c) => c.staffId)
        )
      );
      staffIds.forEach((sId) => markChatRead(activeStudentId, sId, 'staff'));
    } else {
      markChatRead(activeStudentId, currentStaff.id, 'staff');
    }
  }, [activeStudentId, activeMessages.length, isAdmin, currentStaff.id, db.chats, markChatRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeStudentId]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImageFile(file, 900, 0.76);
      setAttachmentUrl(res.dataUrl);
      setAttachmentName(res.name);
    } catch (err) {
      pushToast({
        type: 'error',
        title: 'Gagal Memuat Gambar',
        message: err instanceof Error ? err.message : 'Format gambar tidak valid.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentId || (!message.trim() && !attachmentUrl)) return;
    sendChatMessage({
      studentId: activeStudentId,
      staffId: activeThreadStaffId,
      senderRole: 'staff',
      message,
      attachmentDataUrl: attachmentUrl,
      attachmentName,
    });
    setMessage('');
    setAttachmentUrl(undefined);
    setAttachmentName(undefined);
  };

  const handleEnableBrowserNotif = async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'granted') {
      updateSettings({ enableBrowserNotification: true });
      pushToast({
        type: 'success',
        title: 'Notifikasi Browser Diaktifkan',
        message: 'Anda akan menerima notifikasi tulisan pop-up saat ada chat masuk.',
      });
    } else if (perm === 'unsupported') {
      pushToast({
        type: 'info',
        title: 'Menggunakan Notifikasi Tulisan Dalam Aplikasi',
        message: 'Browser ini mendukung notifikasi banner langsung di dalam SiBK.',
      });
    } else {
      pushToast({
        type: 'warning',
        title: 'Izin Notifikasi Browser Ditolak',
        message: 'Notifikasi suara & banner tulisan di dalam aplikasi tetap aktif.',
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Chat Konseling Siswa & Guru BK
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Komunikasi dua arah secara langsung dengan notifikasi tulisan dan suara otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateSettings({
                enableSoundNotification: !settings.enableSoundNotification,
              })
            }
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
              settings.enableSoundNotification
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {settings.enableSoundNotification ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>
              Suara: {settings.enableSoundNotification ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleEnableBrowserNotif}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Izin Pop-up Tulisan</span>
          </button>

          <button
            type="button"
            onClick={testNotificationSound}
            className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-3.5 py-2 text-xs font-semibold"
          >
            <span>Tes Suara & Notifikasi</span>
          </button>
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Student List */}
        <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa atau kelas..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterMode === 'all'
                    ? 'sibk-btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Semua Siswa
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterMode === 'unread'
                    ? 'sibk-btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Belum Dibaca
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto">
            {studentThreads.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Tidak ada siswa pada daftar ini.
              </p>
            ) : (
              studentThreads.map(({ student, lastMsg, unread }) => {
                const active = student.id === activeStudentId;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 transition-colors ${
                      active
                        ? 'bg-teal-50/80 dark:bg-teal-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {student.nama}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {student.kelas}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {lastMsg
                          ? `${lastMsg.senderRole === 'staff' ? 'Anda: ' : ''}${lastMsg.message || 'Lampiran gambar'}`
                          : 'Klik untuk mulai percakapan'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center font-mono-tabular shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Active Conversation */}
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] overflow-hidden">
          {activeStudent ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {activeStudent.linkFoto && (
                    <button
                      type="button"
                      onClick={() => openStudentInfo(activeStudent.id)}
                      title="Lihat informasi lengkap siswa"
                      className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
                    >
                      <img
                        src={activeStudent.linkFoto}
                        alt={activeStudent.nama}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => openStudentInfo(activeStudent.id)}
                      title="Klik untuk lihat informasi lengkap siswa"
                      className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-300 hover:underline underline-offset-2 text-left transition-colors"
                    >
                      {activeStudent.nama}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular flex flex-wrap items-center gap-x-1.5">
                      <button
                        type="button"
                        onClick={() => openStudentInfo(activeStudent.id)}
                        title="Klik untuk lihat informasi lengkap siswa"
                        className="font-sans font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2"
                      >
                        {activeStudent.kelas}
                      </button>
                      <span>·</span>
                      <span>NIS {activeStudent.nis}</span>
                      <span>·</span>
                      <span className="font-sans">Wali: {activeStudent.namaWali}</span>
                    </p>
                  </div>
                </div>
                {activeStudent.isSekretarisKelas && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                    Sekretaris Kelas
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Belum ada riwayat chat dengan {activeStudent.nama}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Kirim sapaan atau gunakan balasan cepat di bawah ini.
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderRole === 'staff';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {isAdmin && isMine && (
                          <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                            {msg.senderName}
                          </span>
                        )}
                        <div
                          className={`max-w-[82%] sm:max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                            isMine
                              ? 'sibk-btn-primary text-white rounded-br-sm'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                          }`}
                        >
                          {msg.attachmentDataUrl && (
                            <img
                              src={msg.attachmentDataUrl}
                              alt={msg.attachmentName || 'Lampiran'}
                              className="rounded-xl max-h-52 w-auto object-contain mb-2 bg-white"
                            />
                          )}
                          {msg.message && (
                            <p className="leading-relaxed whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          )}
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-mono-tabular ${
                              isMine ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {formatTanggalID(msg.tanggal)} · {msg.jam}
                            </span>
                            {isMine &&
                              (msg.readByStudent ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies + Composer */}
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(tpl)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 truncate max-w-full"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>

                {attachmentUrl && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={attachmentUrl}
                        alt="Lampiran"
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                        {attachmentName || 'gambar.jpg'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentUrl(undefined);
                        setAttachmentName(undefined);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <label
                    title="Lampirkan gambar"
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Balas pesan ke ${activeStudent.nama}...`}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() && !attachmentUrl}
                    className="inline-flex items-center gap-1.5 rounded-xl sibk-btn-primary px-4 py-2.5 text-xs sm:text-sm font-semibold disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-sm text-slate-500">
              Pilih siswa di panel kiri untuk memulai chat.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
