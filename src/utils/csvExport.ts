import { CounselingNote, CounselingRequest, GuestVisit, StaffUser, Student } from '../types/sibk';

function escapeCsvCell(value: string | number | boolean | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSiBKReportCSV(params: {
  monthPrefix: string; // e.g. "2026-11" or "all"
  students: Student[];
  staff: StaffUser[];
  requests: CounselingRequest[];
  notes: CounselingNote[];
  guests: GuestVisit[];
}) {
  const { monthPrefix, students, staff, requests, notes, guests } = params;
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const staffMap = new Map(staff.map((g) => [g.id, g]));

  const filterByMonth = (dateStr: string) =>
    monthPrefix === 'all' ? true : dateStr.startsWith(monthPrefix);

  const lines: string[] = [];

  lines.push('LAPORAN SISTEM INFORMASI BIMBINGAN KONSELING & BUKU TAMU DIGITAL (SiBK)');
  lines.push(`Periode,${monthPrefix === 'all' ? 'Semua Periode' : monthPrefix}`);
  lines.push('');

  lines.push('BAGIAN 1: REKAP PENGAJUAN & ANTREAN KONSELING SISWA');
  lines.push(
    'Tanggal,Jam,NIS,Nama Siswa,Kelas,Jenis Layanan,Urgensi,Guru BK Tujuan,Status,Jadwal Pertemuan,Ruang'
  );
  requests
    .filter((r) => filterByMonth(r.tanggalPengajuan))
    .forEach((r) => {
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
          r.jadwalTanggal ? `${r.jadwalTanggal} ${r.jadwalJam || ''}` : '-',
          r.ruangPertemuan || '-',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });

  lines.push('');
  lines.push('BAGIAN 2: REKAP CATATAN KONSELING DIGITAL');
  lines.push(
    'Tanggal,NIS,Nama Siswa,Kelas,Guru BK,Jenis Layanan,Status Perkembangan,Kerahasiaan,Rencana Tindak Lanjut'
  );
  notes
    .filter((n) => filterByMonth(n.tanggal))
    .forEach((n) => {
      const s = studentMap.get(n.studentId);
      lines.push(
        [
          n.tanggal,
          s?.nis || '-',
          s?.nama || '-',
          s?.kelas || '-',
          n.guruNama,
          n.jenisLayanan,
          n.statusPerkembangan,
          n.isRahasia ? 'Rahasia (Disensor pada ekspor umum)' : 'Terbuka Internal BK',
          n.isRahasia ? '[Konten Rahasia Terlindungi]' : n.rencanaTindakLanjut,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });

  lines.push('');
  lines.push('BAGIAN 3: LOG BUKU TAMU DIGITAL');
  lines.push(
    'No Antrean,Tanggal,Jam Masuk,Jam Keluar,Nama Pengunjung,Kategori,Siswa Terkait,No WhatsApp,Pihak Dituju,Kepentingan,Status'
  );
  guests
    .filter((g) => filterByMonth(g.tanggal))
    .forEach((g) => {
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

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Laporan_SiBK_${monthPrefix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
