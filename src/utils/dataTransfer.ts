import {
  CounselingNote,
  CounselingRequest,
  GuestVisit,
  SiBKDatabase,
  StaffUser,
  Student,
} from '../types/sibk';

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportStudentsCSV(students: Student[], staff: StaffUser[], label = 'Siswa') {
  const staffMap = new Map(staff.map((g) => [g.id, g.nama]));
  const lines: string[] = [
    'NIS,NISN,Nama Lengkap,Kelas,Jenis Kelamin,Nama Wali Murid,No HP Wali,Guru BK Pembimbing',
  ];
  students.forEach((s) => {
    lines.push(
      [
        s.nis,
        s.nisn,
        s.nama,
        s.kelas,
        s.jenisKelamin,
        s.namaWali,
        s.noHpWali,
        staffMap.get(s.guruBkId) || '-',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  downloadFile('\uFEFF' + lines.join('\r\n'), `Data_${label}_SiBK.csv`, 'text/csv;charset=utf-8;');
}

export function exportStaffCSV(staff: StaffUser[], label = 'GuruBK') {
  const lines: string[] = [
    'NIP,Username,Nama Lengkap,Peran,Jabatan,Spesialisasi,Status Ketersediaan,Ruang',
  ];
  staff.forEach((g) => {
    lines.push(
      [
        g.nip,
        g.username,
        g.nama,
        g.role === 'admin' ? 'Admin Utama' : 'Guru BK',
        g.jabatan,
        g.spesialisasi,
        g.statusKetersediaan,
        g.ruang,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  downloadFile('\uFEFF' + lines.join('\r\n'), `Data_${label}_SiBK.csv`, 'text/csv;charset=utf-8;');
}

export function exportRequestsCSV(
  requests: CounselingRequest[],
  students: Student[],
  staff: StaffUser[],
  label = 'Antrean_Konseling'
) {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((g) => [g.id, g]));
  const lines: string[] = [
    'Tanggal,Jam,NIS,Nama Siswa,Kelas,Jenis Layanan,Urgensi,Guru BK Tujuan,Status,Jadwal Tanggal,Jadwal Jam,Ruang,Cerita Singkat,Catatan Guru',
  ];
  requests.forEach((r) => {
    const s = studentMap.get(r.studentId);
    const g = staffMap.get(r.guruTujuanId);
    lines.push(
      [
        r.tanggalPengajuan,
        r.jamPengajuan,
        s?.nis || '-',
        s?.nama || '-',
        s?.kelas || '-',
        r.jenisKeperluan,
        r.tingkatUrgensi,
        g?.nama || '-',
        r.status,
        r.jadwalTanggal || '-',
        r.jadwalJam || '-',
        r.ruangPertemuan || '-',
        r.ceritaSingkat,
        r.catatanGuru || '-',
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  downloadFile('\uFEFF' + lines.join('\r\n'), `Data_${label}_SiBK.csv`, 'text/csv;charset=utf-8;');
}

export function exportGuestsCSV(guests: GuestVisit[], label = 'Buku_Tamu') {
  const lines: string[] = [
    'No Antrean,Tanggal,Jam Masuk,Jam Keluar,Nama Lengkap,Kategori,Siswa Terkait,No WhatsApp,Pihak Dituju,Kepentingan,Status',
  ];
  guests.forEach((g) => {
    lines.push(
      [
        g.nomorAntrean,
        g.tanggal,
        g.jamMasuk,
        g.jamKeluar || '-',
        g.namaLengkap,
        g.kategori,
        g.namaSiswaTerkait || '-',
        g.noWhatsApp,
        g.pihakDituju,
        g.keperluan,
        g.status,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  downloadFile('\uFEFF' + lines.join('\r\n'), `Data_${label}_SiBK.csv`, 'text/csv;charset=utf-8;');
}

export function exportStudentNotesCSV(
  student: Student,
  notes: CounselingNote[],
  currentStaffId: string
) {
  const lines: string[] = [
    'Tanggal,NIS,Nama Siswa,Kelas,Guru BK,Jenis Layanan,Status Perkembangan,Kerahasiaan,Deskripsi Permasalahan,Hasil Asesmen,Rencana Tindak Lanjut',
  ];
  notes.forEach((n) => {
    const locked = n.isRahasia && n.guruId !== currentStaffId;
    lines.push(
      [
        n.tanggal,
        student.nis,
        student.nama,
        student.kelas,
        n.guruNama,
        n.jenisLayanan,
        n.statusPerkembangan,
        n.isRahasia ? 'Rahasia' : 'Internal BK',
        locked ? '[Disensor - Rahasia]' : n.deskripsiPermasalahan,
        locked ? '[Disensor - Rahasia]' : n.hasilAsesmen,
        locked ? '[Disensor - Rahasia]' : n.rencanaTindakLanjut,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  });
  downloadFile(
    '\uFEFF' + lines.join('\r\n'),
    `Rekam_Jejak_${student.nis}_${student.nama.replace(/\s+/g, '_')}.csv`,
    'text/csv;charset=utf-8;'
  );
}

export function exportFullBackupJSON(db: SiBKDatabase) {
  const payload = {
    app: 'SiBK',
    exportedAt: new Date().toISOString(),
    data: db,
  };
  const datePart = new Date().toISOString().slice(0, 10);
  downloadFile(
    JSON.stringify(payload, null, 2),
    `SiBK_Backup_${datePart}.json`,
    'application/json;charset=utf-8;'
  );
}

export function downloadStudentCSVTemplate() {
  const sample = [
    'NIS,NISN,Nama Lengkap,Kelas,Jenis Kelamin,Nama Wali Murid,No HP Wali',
    '2024099,0081122990,Citra Lestari,X Merdeka 2,P,Ibu Dewi Sartika,081299887766',
    '2024100,0082233445,Budi Santoso,XI IPA 2,L,Bapak Slamet,081344556677',
  ].join('\r\n');
  downloadFile('\uFEFF' + sample, 'Template_Impor_Siswa_SiBK.csv', 'text/csv;charset=utf-8;');
}

export function downloadGuestCSVTemplate() {
  const sample = [
    'Nama Lengkap,Kategori,Siswa Terkait,No WhatsApp,Pihak Dituju,Kepentingan',
    'Ibu Kartini,Wali Murid,Aulia Rahma Putri (XII IPA 1),081234560001,"Daviq Prasetian, S.Pd.",Konsultasi persiapan SNBP',
    'Bapak Andi Wijaya,Instansi/Dinas,-,081399001122,"Dra. Ida Sulistyani",Koordinasi seminar karir siswa',
  ].join('\r\n');
  downloadFile('\uFEFF' + sample, 'Template_Impor_Tamu_SiBK.csv', 'text/csv;charset=utf-8;');
}

export function parseCsvRows(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  // Detect delimiter from first line (comma or semicolon)
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(current.trim());
        current = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.length > 0));
}
