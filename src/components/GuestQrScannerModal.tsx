import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CheckCircle2,
  Download,
  ImagePlus,
  QrCode,
  RefreshCw,
  ScanLine,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  buildGuestCheckInPayload,
  decodeQrFromImageFile,
  generateQrDataUrl,
  ParsedGuestQrCheckIn,
  ParsedQrResult,
  parseGuestQrPayload,
  SAMPLE_GUEST_QR_PRESETS,
} from '../utils/guestQr';

type ScannerTab = 'camera' | 'upload' | 'demo';

interface GuestQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  defaultCounselor: string;
  mode?: 'kiosk' | 'staff';
  defaultAutoSubmit?: boolean;
  onCheckInParsed: (data: ParsedGuestQrCheckIn, autoSubmit: boolean) => void;
  onTicketQrScanned?: (nomorAntrean: string, id?: string) => void;
}

export const GuestQrScannerModal: React.FC<GuestQrScannerModalProps> = ({
  open,
  onClose,
  defaultCounselor,
  mode = 'kiosk',
  defaultAutoSubmit = true,
  onCheckInParsed,
  onTicketQrScanned,
}) => {
  const [activeTab, setActiveTab] = useState<ScannerTab>('camera');
  const [autoSubmit, setAutoSubmit] = useState<boolean>(defaultAutoSubmit);

  useEffect(() => {
    if (open) {
      setAutoSubmit(defaultAutoSubmit);
    }
  }, [open, defaultAutoSubmit]);
  const [cameraState, setCameraState] = useState<
    'idle' | 'starting' | 'active' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [scanError, setScanError] = useState<string>('');
  const [manualPayload, setManualPayload] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<ParsedQrResult | null>(null);
  const [sampleQrUrls, setSampleQrUrls] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanCheckRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  const handleDecodedRawText = useCallback(
    (rawText: string) => {
      const parsed = parseGuestQrPayload(rawText, defaultCounselor);
      if (!parsed) {
        setScanError('Kode QR tidak berisi data tamu yang dapat dibaca.');
        return;
      }
      setScanError('');
      stopCamera();

      if (parsed.kind === 'ticket') {
        if (mode === 'staff' && onTicketQrScanned) {
          onTicketQrScanned(parsed.nomorAntrean, parsed.id);
          onClose();
          return;
        }
        setScannedResult(parsed);
        return;
      }

      if (autoSubmit) {
        onCheckInParsed(parsed, true);
        onClose();
      } else {
        setScannedResult(parsed);
      }
    },
    [autoSubmit, defaultCounselor, mode, onCheckInParsed, onClose, onTicketQrScanned, stopCamera]
  );

  // Generate sample QR images once modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        SAMPLE_GUEST_QR_PRESETS.map(async (preset) => {
          const payload = buildGuestCheckInPayload(preset.data);
          const url = await generateQrDataUrl(payload);
          return [preset.id, url] as const;
        })
      );
      if (!cancelled) {
        setSampleQrUrls(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Start / Stop live camera when modal is open & camera tab active
  useEffect(() => {
    if (!open) {
      stopCamera();
      setScannedResult(null);
      setScanError('');
      setCameraError('');
      return;
    }

    if (activeTab !== 'camera' || scannedResult) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('error');
        setCameraError(
          'Browser atau perangkat ini tidak mendukung akses kamera langsung. Gunakan tab Unggah Gambar QR atau Kartu QR Uji.'
        );
        return;
      }

      setCameraState('starting');
      setCameraError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('active');

        const scanFrame = (timestamp: number) => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (
            video &&
            canvas &&
            video.readyState === video.HAVE_ENOUGH_DATA &&
            timestamp - lastScanCheckRef.current > 140
          ) {
            lastScanCheckRef.current = timestamp;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw > 0 && vh > 0) {
              canvas.width = vw;
              canvas.height = vh;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, vw, vh);
                const imgData = ctx.getImageData(0, 0, vw, vh);
                const code = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert',
                });
                if (code?.data) {
                  handleDecodedRawText(code.data);
                  return;
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        if (cancelled) return;
        setCameraState('error');
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak oleh browser. Aktifkan izin kamera atau gunakan Unggah Gambar QR.'
            : 'Kamera tidak ditemukan / sedang digunakan aplikasi lain. Gunakan Unggah Gambar QR atau Kartu QR Uji.';
        setCameraError(msg);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [activeTab, handleDecodedRawText, open, scannedResult, stopCamera]);

  if (!open) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanError('');
    try {
      const decoded = await decodeQrFromImageFile(file);
      if (!decoded) {
        setScanError(
          'Tidak ditemukan kode QR yang terbaca pada gambar tersebut. Pastikan gambar QR jelas dan tidak terpotong.'
        );
        return;
      }
      handleDecodedRawText(decoded);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Gagal memproses gambar QR.');
    }
  };

  const handleManualParse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) {
      setScanError('Tempelkan isi teks/JSON QR terlebih dahulu.');
      return;
    }
    handleDecodedRawText(manualPayload);
  };

  const handleConfirmScanned = (submitImmediately: boolean) => {
    if (!scannedResult) return;
    if (scannedResult.kind === 'ticket') {
      if (onTicketQrScanned) {
        onTicketQrScanned(scannedResult.nomorAntrean, scannedResult.id);
      }
      onClose();
      return;
    }
    onCheckInParsed(scannedResult, submitImmediately);
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl sibk-gradient-hero text-white flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="qr-scanner-title"
                className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Scan QR Check-In Buku Tamu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'staff'
                  ? 'Pindai QR Kartu Tamu untuk check-in cepat atau QR Tiket Antrean untuk selesai.'
                  : 'Pindai QR undangan, kartu wali murid, atau vCard kontak untuk mengisi otomatis.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pemindai QR"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher + Auto Check-In Option */}
        <div className="px-6 pt-4 pb-2 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setScannedResult(null);
                setScanError('');
                setActiveTab('camera');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>Kamera Langsung</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScannedResult(null);
                setScanError('');
                setActiveTab('upload');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ImagePlus className="w-3.5 h-3.5 shrink-0" />
              <span>Unggah Gambar QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScannedResult(null);
                setScanError('');
                setActiveTab('demo');
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'demo'
                  ? 'sibk-btn-primary shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Kartu QR Uji</span>
            </button>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 px-3.5 py-2 cursor-pointer">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              Langsung Check-In & Terbitkan Nomor Antrean setelah scan berhasil
            </span>
            <input
              type="checkbox"
              checked={autoSubmit}
              onChange={(e) => setAutoSubmit(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600"
            />
          </label>
        </div>

        {/* Scrollable Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-4">
          {scanError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              {scanError}
            </div>
          )}

          {/* Scanned Result Preview (when autoSubmit is OFF or Ticket QR scanned in kiosk) */}
          {scannedResult && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {scannedResult.kind === 'ticket'
                      ? 'QR Tiket Kunjungan Terdeteksi'
                      : 'Data Tamu QR Berhasil Dibaca'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedResult(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Ulang</span>
                </button>
              </div>

              {scannedResult.kind === 'ticket' ? (
                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-200">
                  <p>
                    Nomor Antrean:{' '}
                    <strong className="font-mono-tabular text-sm">
                      {scannedResult.nomorAntrean}
                    </strong>
                  </p>
                  {scannedResult.namaLengkap && (
                    <p>
                      Pengunjung: <strong>{scannedResult.namaLengkap}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Nama Tamu</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {scannedResult.namaLengkap}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Kategori</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {scannedResult.kategori}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">No. WhatsApp</span>
                    <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                      {scannedResult.noWhatsApp}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Pihak Dituju</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {scannedResult.pihakDituju}
                    </span>
                  </div>
                  {scannedResult.namaSiswaTerkait && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Siswa Terkait
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {scannedResult.namaSiswaTerkait}
                      </span>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block">Keperluan</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {scannedResult.keperluan}
                    </span>
                  </div>
                </div>
              )}

              {scannedResult.kind === 'checkin' && (
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmScanned(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Isi ke Formulir Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmScanned(true)}
                    className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                  >
                    Konfirmasi & Check-In Sekarang
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: LIVE CAMERA */}
          {!scannedResult && activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${
                    cameraState === 'active' ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {cameraState === 'active' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] relative">
                      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400/90 animate-pulse" />
                    </div>
                    <span className="mt-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-[11px] font-medium flex items-center gap-1.5">
                      <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
                      Arahkan kode QR ke dalam kotak pemindai
                    </span>
                  </div>
                )}

                {cameraState === 'starting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs gap-2">
                    <Camera className="w-8 h-8 text-teal-400 animate-pulse" />
                    <span>Mengaktifkan kamera pemindai QR...</span>
                  </div>
                )}

                {cameraState === 'error' && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-slate-200 space-y-3">
                    <Camera className="w-9 h-9 text-amber-400" />
                    <p className="text-xs sm:text-sm font-medium max-w-md leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100"
                      >
                        Unggah Gambar QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('demo')}
                        className="px-3.5 py-2 rounded-xl sibk-btn-primary text-xs font-semibold"
                      >
                        Coba Kartu QR Uji
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD QR IMAGE OR PASTE PAYLOAD */}
          {!scannedResult && activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="block rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 bg-slate-50/70 dark:bg-slate-800/40 p-6 text-center cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white">
                  Pilih atau Seret Gambar Kode QR (PNG / JPG / WebP)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Mendukung QR Undangan SiBK, QR Tiket Antrean, vCard Kontak, atau teks biasa.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <form onSubmit={handleManualParse} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Atau Tempel Isi Kode QR Secara Manual
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                    placeholder='Contoh: SIBK|Budi Santoso|Wali Murid|Aulia|0812xxx|Dra. Ida Sulistyani|Konsultasi'
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl sibk-btn-primary text-xs font-semibold shrink-0"
                  >
                    Proses QR
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SAMPLE WALK-IN QR CARDS */}
          {!scannedResult && activeTab === 'demo' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Uji pemindai secara instan dengan salah satu Kartu QR Tamu di bawah ini, atau
                unduh gambar QR untuk dicoba lewat kamera HP / unggah file:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_GUEST_QR_PRESETS.map((preset) => {
                  const qrUrl = sampleQrUrls[preset.id];
                  const payload = buildGuestCheckInPayload(preset.data);
                  return (
                    <div
                      key={preset.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div className="text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                          {preset.badge}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">
                          {preset.data.namaLengkap}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          Temui: {preset.data.pihakDituju}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-2 border border-slate-200 flex items-center justify-center">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={preset.label}
                            className="w-28 h-28 object-contain"
                          />
                        ) : (
                          <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-400">
                            Memuat QR...
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecodedRawText(payload)}
                          className="w-full py-1.5 px-2.5 rounded-xl sibk-btn-primary text-[11px] font-semibold"
                        >
                          Simulasikan Scan QR
                        </button>
                        {qrUrl && (
                          <a
                            href={qrUrl}
                            download={`${preset.id}.png`}
                            className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh PNG QR</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
