import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ImagePlus,
  MessageSquare,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useSiBK } from '../../context/SiBKContext';
import { formatTanggalID } from '../../data/seedData';
import { compressImageFile } from '../../utils/imageCompress';

export const StudentChatSection: React.FC = () => {
  const {
    db,
    currentStudent,
    settings,
    updateSettings,
    sendChatMessage,
    markChatRead,
    testNotificationSound,
    pushToast,
  } = useSiBK();

  const counselors = db.staff.filter((s) => s.role === 'guru_bk' || s.role === 'admin');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentStudent?.guruBkId || counselors[0]?.id || ''
  );
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const threadMessages = currentStudent
    ? db.chats.filter(
        (c) => c.studentId === currentStudent.id && c.staffId === selectedStaffId
      )
    : [];

  useEffect(() => {
    if (currentStudent && selectedStaffId) {
      markChatRead(currentStudent.id, selectedStaffId, 'student');
    }
  }, [currentStudent, selectedStaffId, threadMessages.length, markChatRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, selectedStaffId]);

  if (!currentStudent) return null;

  const activeStaff = counselors.find((g) => g.id === selectedStaffId);

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
        message: err instanceof Error ? err.message : 'Format gambar tidak didukung.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || (!message.trim() && !attachmentUrl)) return;
    sendChatMessage({
      studentId: currentStudent.id,
      staffId: selectedStaffId,
      senderRole: 'student',
      message,
      attachmentDataUrl: attachmentUrl,
      attachmentName,
    });
    setMessage('');
    setAttachmentUrl(undefined);
    setAttachmentName(undefined);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: List Guru BK */}
      <aside className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Pilih Guru BK Tujuan
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Chat pribadi terenkripsi di sesi Anda
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  enableSoundNotification: !settings.enableSoundNotification,
                })
              }
              title={
                settings.enableSoundNotification
                  ? 'Matikan suara notifikasi'
                  : 'Aktifkan suara notifikasi'
              }
              className={`p-2 rounded-xl border text-xs transition-colors ${
                settings.enableSoundNotification
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              {settings.enableSoundNotification ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={testNotificationSound}
              title="Tes notifikasi suara & tulisan"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Tes Bunyi
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
          {counselors.map((g) => {
            const unread = db.chats.filter(
              (c) =>
                c.studentId === currentStudent.id &&
                c.staffId === g.id &&
                c.senderRole === 'staff' &&
                !c.readByStudent
            ).length;
            const lastMsg = [...db.chats]
              .reverse()
              .find((c) => c.studentId === currentStudent.id && c.staffId === g.id);
            const active = selectedStaffId === g.id;
            const isAdvisor = g.id === currentStudent.guruBkId;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedStaffId(g.id)}
                className={`w-full text-left px-4 py-3.5 transition-colors flex items-start justify-between gap-3 ${
                  active
                    ? 'bg-teal-50/80 dark:bg-teal-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {g.nama}
                    </span>
                    {isAdvisor && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                        Pembimbing
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {lastMsg
                      ? `${lastMsg.senderRole === 'student' ? 'Anda: ' : ''}${lastMsg.message || 'Lampiran gambar'}`
                      : `${g.statusKetersediaan} · ${g.ruang}`}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      g.statusKetersediaan === 'Tersedia'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    title={g.statusKetersediaan}
                  />
                  {unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center font-mono-tabular">
                      {unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right: Chat Thread */}
      <section className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {activeStaff?.nama || 'Pilih Guru BK'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeStaff
                ? `${activeStaff.jabatan} · Status: ${activeStaff.statusKetersediaan}`
                : 'Pilih guru untuk mulai berkonsultasi'}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-lg">
            <Bell className="w-3.5 h-3.5" />
            <span>
              Notifikasi:{' '}
              {settings.enableSoundNotification ? 'Suara & Tulisan Aktif' : 'Tulisan Aktif'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
          {threadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Belum ada percakapan dengan {activeStaff?.nama}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Sampaikan pertanyaan seputar jadwal konseling, perizinan, atau keluhan belajar secara langsung.
              </p>
            </div>
          ) : (
            threadMessages.map((msg) => {
              const isMine = msg.senderRole === 'student';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
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
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
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
                        (msg.readByStaff ? (
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

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
        >
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

          <div className="flex items-center gap-2">
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
              placeholder={`Tulis pesan kepada ${activeStaff?.nama || 'Guru BK'}...`}
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
          </div>
        </form>
      </section>
    </div>
  );
};
