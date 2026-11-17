import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { GuestVisit, VisitorCategory } from '../types/sibk';

export interface ParsedGuestQrCheckIn {
  kind: 'checkin';
  namaLengkap: string;
  kategori: VisitorCategory;
  namaSiswaTerkait?: string;
  noWhatsApp: string;
  pihakDituju: string;
  keperluan: string;
}

export interface ParsedTicketQr {
  kind: 'ticket';
  id?: string;
  nomorAntrean: string;
  namaLengkap?: string;
}

export type ParsedQrResult = ParsedGuestQrCheckIn | ParsedTicketQr;

const VALID_CATEGORIES: VisitorCategory[] = [
  'Wali Murid',
  'Instansi/Dinas',
  'Alumni',
  'Umum',
];

function normalizeCategory(input?: string): VisitorCategory {
  if (!input) return 'Umum';
  const found = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === input.trim().toLowerCase()
  );
  if (found) return found;
  if (input.toLowerCase().includes('wali') || input.toLowerCase().includes('ortu')) {
    return 'Wali Murid';
  }
  if (input.toLowerCase().includes('dinas') || input.toLowerCase().includes('instansi')) {
    return 'Instansi/Dinas';
  }
  if (input.toLowerCase().includes('alumni')) {
    return 'Alumni';
  }
  return 'Umum';
}

export function buildGuestCheckInPayload(data: {
  namaLengkap: string;
  kategori: VisitorCategory;
  namaSiswaTerkait?: string;
  noWhatsApp: string;
  pihakDituju: string;
  keperluan: string;
}): string {
  return JSON.stringify({
    type: 'sibk_guest',
    namaLengkap: data.namaLengkap,
    kategori: data.kategori,
    ...(data.namaSiswaTerkait ? { namaSiswaTerkait: data.namaSiswaTerkait } : {}),
    noWhatsApp: data.noWhatsApp,
    pihakDituju: data.pihakDituju,
    keperluan: data.keperluan,
  });
}

export function buildGuestTicketPayload(ticket: GuestVisit): string {
  return JSON.stringify({
    type: 'sibk_ticket',
    id: ticket.id,
    nomorAntrean: ticket.nomorAntrean,
    namaLengkap: ticket.namaLengkap,
    tanggal: ticket.tanggal,
    jamMasuk: ticket.jamMasuk,
  });
}

export function parseGuestQrPayload(
  rawText: string,
  defaultCounselor: string
): ParsedQrResult | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  // 1. JSON payload (SiBK Guest QR or SiBK Ticket QR)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (obj.type === 'sibk_ticket' && typeof obj.nomorAntrean === 'string') {
        return {
          kind: 'ticket',
          id: typeof obj.id === 'string' ? obj.id : undefined,
          nomorAntrean: obj.nomorAntrean,
          namaLengkap: typeof obj.namaLengkap === 'string' ? obj.namaLengkap : undefined,
        };
      }

      const nama =
        (typeof obj.namaLengkap === 'string' && obj.namaLengkap) ||
        (typeof obj.nama === 'string' && obj.nama) ||
        (typeof obj.name === 'string' && obj.name) ||
        '';
      if (nama) {
        return {
          kind: 'checkin',
          namaLengkap: nama,
          kategori: normalizeCategory(
            typeof obj.kategori === 'string'
              ? obj.kategori
              : typeof obj.category === 'string'
                ? obj.category
                : undefined
          ),
          namaSiswaTerkait:
            typeof obj.namaSiswaTerkait === 'string'
              ? obj.namaSiswaTerkait
              : typeof obj.siswa === 'string'
                ? obj.siswa
                : undefined,
          noWhatsApp:
            (typeof obj.noWhatsApp === 'string' && obj.noWhatsApp) ||
            (typeof obj.wa === 'string' && obj.wa) ||
            (typeof obj.phone === 'string' && obj.phone) ||
            '-',
          pihakDituju:
            (typeof obj.pihakDituju === 'string' && obj.pihakDituju) || defaultCounselor,
          keperluan:
            (typeof obj.keperluan === 'string' && obj.keperluan) ||
            'Check-in via QR Buku Tamu Digital',
        };
      }
    } catch {
      // Fall through to other formats
    }
  }

  // 2. Compact SIBK|nama|kategori|siswa|wa|pihak|keperluan format
  if (trimmed.toUpperCase().startsWith('SIBK|')) {
    const parts = trimmed.split('|');
    return {
      kind: 'checkin',
      namaLengkap: parts[1]?.trim() || 'Tamu QR',
      kategori: normalizeCategory(parts[2]),
      namaSiswaTerkait: parts[3]?.trim() || undefined,
      noWhatsApp: parts[4]?.trim() || '-',
      pihakDituju: parts[5]?.trim() || defaultCounselor,
      keperluan: parts[6]?.trim() || 'Check-in via QR Buku Tamu',
    };
  }

  // 3. Standard vCard QR (from mobile contacts)
  if (/BEGIN:VCARD/i.test(trimmed)) {
    const fnMatch = trimmed.match(/(?:^|\n)FN[^:]*:([^\r\n]+)/i);
    const nMatch = trimmed.match(/(?:^|\n)N[^:]*:([^\r\n]+)/i);
    const telMatch = trimmed.match(/(?:^|\n)TEL[^:]*:([^\r\n]+)/i);
    const orgMatch = trimmed.match(/(?:^|\n)ORG[^:]*:([^\r\n]+)/i);
    const noteMatch = trimmed.match(/(?:^|\n)NOTE[^:]*:([^\r\n]+)/i);

    const parsedName =
      fnMatch?.[1]?.trim() ||
      (nMatch?.[1]
        ? nMatch[1]
            .split(';')
            .filter(Boolean)
            .reverse()
            .join(' ')
            .trim()
        : 'Tamu vCard');

    return {
      kind: 'checkin',
      namaLengkap: parsedName,
      kategori: orgMatch ? 'Instansi/Dinas' : 'Umum',
      noWhatsApp: telMatch?.[1]?.trim() || '-',
      pihakDituju: defaultCounselor,
      keperluan:
        noteMatch?.[1]?.trim() ||
        (orgMatch ? `Kunjungan dari ${orgMatch[1].trim()}` : 'Kunjungan Sekolah (vCard QR)'),
    };
  }

  // 4. URL with query params (?nama=...&wa=...&kategori=...)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const qNama = url.searchParams.get('nama') || url.searchParams.get('name');
      if (qNama) {
        return {
          kind: 'checkin',
          namaLengkap: qNama,
          kategori: normalizeCategory(url.searchParams.get('kategori') || undefined),
          namaSiswaTerkait: url.searchParams.get('siswa') || undefined,
          noWhatsApp: url.searchParams.get('wa') || url.searchParams.get('phone') || '-',
          pihakDituju: url.searchParams.get('tujuan') || defaultCounselor,
          keperluan: url.searchParams.get('keperluan') || 'Check-in melalui tautan QR',
        };
      }
    } catch {
      // Fall through to plain text
    }
  }

  // 5. Fallback plain text QR
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return {
    kind: 'checkin',
    namaLengkap: lines[0].slice(0, 80),
    kategori: 'Umum',
    noWhatsApp: '-',
    pihakDituju: defaultCounselor,
    keperluan: lines.slice(1).join(' · ') || `Registrasi via QR (${lines[0].slice(0, 60)})`,
  };
}

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 240,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        // Resize large camera images down to max 1000px for crisp, fast jsQR decoding
        const maxDim = 1000;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        resolve(decoded?.data || null);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export interface SampleGuestQrPreset {
  id: string;
  label: string;
  badge: string;
  data: {
    namaLengkap: string;
    kategori: VisitorCategory;
    namaSiswaTerkait?: string;
    noWhatsApp: string;
    pihakDituju: string;
    keperluan: string;
  };
}

export const SAMPLE_GUEST_QR_PRESETS: SampleGuestQrPreset[] = [
  {
    id: 'qr-wali',
    label: 'Kartu QR Wali Murid',
    badge: 'Wali Murid',
    data: {
      namaLengkap: 'Ibu Siti Aminah',
      kategori: 'Wali Murid',
      namaSiswaTerkait: 'Aulia Rahma Putri (XII IPA 1)',
      noWhatsApp: '081288991122',
      pihakDituju: 'Daviq Prasetian, S.Pd.',
      keperluan: 'Konsultasi persiapan SNBP & hasil belajar semester akhir',
    },
  },
  {
    id: 'qr-dinas',
    label: 'Kartu QR Tamu Dinas',
    badge: 'Instansi/Dinas',
    data: {
      namaLengkap: 'Drs. Hendra Wijaya',
      kategori: 'Instansi/Dinas',
      noWhatsApp: '081344556677',
      pihakDituju: 'Dra. Ida Sulistyani',
      keperluan: 'Monitoring program sekolah ramah anak & layanan BK',
    },
  },
  {
    id: 'qr-alumni',
    label: 'Kartu QR Alumni',
    badge: 'Alumni',
    data: {
      namaLengkap: 'Raka Pratama Putra',
      kategori: 'Alumni',
      noWhatsApp: '085611223344',
      pihakDituju: 'Hanum Salimah, S.Pd.',
      keperluan: 'Koordinasi sharing session alumni & informasi beasiswa',
    },
  },
];
