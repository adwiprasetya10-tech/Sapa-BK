import { SiBKDatabase } from '../types/sibk';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDaysAgoISO(days: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatTanggalID(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const bulan = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${day} ${bulan[monthIdx]} ${year}`;
}

export function createInitialDatabase(): SiBKDatabase {
  const today = getTodayISO();
  const yesterday = getDaysAgoISO(1);
  const twoDaysAgo = getDaysAgoISO(2);
  const fourDaysAgo = getDaysAgoISO(4);
  const sevenDaysAgo = getDaysAgoISO(7);
  const tenDaysAgo = getDaysAgoISO(10);

  return {
    staff: [
      {
        id: 'staff-ida',
        nip: '197204151998022001',
        username: 'ida',
        password: '123',
        nama: 'Dra. Ida Sulistyani',
        role: 'admin',
        jabatan: 'Koordinator BK & Admin Utama',
        spesialisasi: 'Manajemen Layanan & Kasus Khusus',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Koordinator BK',
      },
      {
        id: 'staff-daviq',
        nip: '198807212014031002',
        username: 'daviq',
        password: '123',
        nama: 'Daviq Prasetian, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Kelas XII',
        spesialisasi: 'Perencanaan Karir & SNBP/SNBT',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Konseling 1',
      },
      {
        id: 'staff-hanum',
        nip: '199005122015032004',
        username: 'hanum',
        password: '123',
        nama: 'Hanum Salimah, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Kelas XI IPA',
        spesialisasi: 'Konseling Pribadi & Akademik',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Konseling 2',
      },
      {
        id: 'staff-palupi',
        nip: '199111082018022003',
        username: 'palupi',
        password: '123',
        nama: 'Palupi Etikawati, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Kelas XI IPS',
        spesialisasi: 'Mediasi Sosial & Kesehatan Mental',
        statusKetersediaan: 'Sedang Sesi',
        ruang: 'Ruang Konseling 3',
      },
      {
        id: 'staff-yunita',
        nip: '199303142019032007',
        username: 'yunita',
        password: '123',
        nama: 'Yunita Anggraini, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Kelas X Merdeka',
        spesialisasi: 'Adaptasi Belajar & Minat Bakat',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Konseling 4',
      },
      {
        id: 'staff-harjito',
        nip: '198609232012021005',
        username: 'harjito',
        password: '123',
        nama: 'Harjito Khamdhani, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Pembinaan Karakter',
        spesialisasi: 'Kedisiplinan & Mediasi Masalah',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Konseling 5',
      },
      {
        id: 'staff-aditya',
        nip: '199508172022031006',
        username: 'aditya',
        password: '123',
        nama: 'Aditya Dwi Praseta, S.Pd.',
        role: 'guru_bk',
        jabatan: 'Guru BK Layanan Informasi & Karir',
        spesialisasi: 'Konseling Belajar & Layanan Digital',
        statusKetersediaan: 'Tersedia',
        ruang: 'Ruang Konseling 6',
      },
    ],
    students: [
      {
        id: 'std-1',
        nis: '2024001',
        nisn: '0074129811',
        nama: 'Aulia Rahma Putri',
        kelas: 'XII IPA 1',
        jenisKelamin: 'P',
        namaWali: 'Bapak Agus Santoso',
        noHpWali: '081234567890',
        guruBkId: 'staff-daviq',
      },
      {
        id: 'std-2',
        nis: '2024002',
        nisn: '0078910234',
        nama: 'Dimas Pratama Putra',
        kelas: 'XI IPS 2',
        jenisKelamin: 'L',
        namaWali: 'Ibu Ratna Dewi',
        noHpWali: '081398765432',
        guruBkId: 'staff-palupi',
      },
      {
        id: 'std-3',
        nis: '2024003',
        nisn: '0081234567',
        nama: 'Nabila Khairunnisa',
        kelas: 'X Merdeka 3',
        jenisKelamin: 'P',
        namaWali: 'Bapak Arif Budiman',
        noHpWali: '085612349876',
        guruBkId: 'staff-yunita',
      },
      {
        id: 'std-4',
        nis: '2024004',
        nisn: '0076543210',
        nama: 'Fajar Nugroho',
        kelas: 'XII IPS 1',
        jenisKelamin: 'L',
        namaWali: 'Ibu Sri Wahyuni',
        noHpWali: '081987651234',
        guruBkId: 'staff-harjito',
      },
      {
        id: 'std-5',
        nis: '2024005',
        nisn: '0073344556',
        nama: 'Kirana Maheswari',
        kelas: 'XII IPA 2',
        jenisKelamin: 'P',
        namaWali: 'Bapak Hendro Susilo',
        noHpWali: '082144556677',
        guruBkId: 'staff-aditya',
      },
      {
        id: 'std-6',
        nis: '2024006',
        nisn: '0085566778',
        nama: 'Raka Aditya Wijaya',
        kelas: 'XI IPA 1',
        jenisKelamin: 'L',
        namaWali: 'Ibu Maya Sari',
        noHpWali: '081788990011',
        guruBkId: 'staff-hanum',
      },
      {
        id: 'std-7',
        nis: '2024007',
        nisn: '0089988776',
        nama: 'Siti Aminah Azzahra',
        kelas: 'X Merdeka 1',
        jenisKelamin: 'P',
        namaWali: 'Bapak Mulyadi',
        noHpWali: '081277665544',
        guruBkId: 'staff-yunita',
      },
      {
        id: 'std-8',
        nis: '2024008',
        nisn: '0071122334',
        nama: 'Bagas Kurniawan',
        kelas: 'XI IPS 1',
        jenisKelamin: 'L',
        namaWali: 'Ibu Endang Lestari',
        noHpWali: '085733221100',
        guruBkId: 'staff-palupi',
      },
    ],
    requests: [
      {
        id: 'req-1',
        studentId: 'std-1',
        guruTujuanId: 'staff-daviq',
        jenisKeperluan: 'Perencanaan Karir',
        tingkatUrgensi: 'Segera',
        ceritaSingkat:
          'Saya masih bimbang memilih jurusan antara Psikologi atau Kesehatan Masyarakat untuk jalur SNBP bulan depan, serta ingin berkonsultasi mengenai portofolio nilai rapor.',
        usulanWaktu: 'Besok jam istirahat kedua (12:00 WIB)',
        status: 'Dijadwalkan',
        tanggalPengajuan: yesterday,
        jamPengajuan: '10:15',
        jadwalTanggal: today,
        jadwalJam: '12:00',
        ruangPertemuan: 'Ruang Konseling 1',
        catatanGuru:
          'Silakan bawa salinan rapor semester 1-4 ya Aulia. Bapak sudah siapkan pemetaan jurusan universitas tujuan.',
      },
      {
        id: 'req-2',
        studentId: 'std-2',
        guruTujuanId: 'staff-palupi',
        jenisKeperluan: 'Mediasi Masalah',
        tingkatUrgensi: 'Mendesak (Rahasia)',
        ceritaSingkat:
          'Ada kesalahpahaman di kelompok tugas akhir yang membuat suasana kelas kurang kondusif dan saya merasa disudutkan di grup chat kelas.',
        usulanWaktu: 'Hari ini sepulang sekolah (15:00 WIB)',
        status: 'Menunggu Konfirmasi',
        tanggalPengajuan: today,
        jamPengajuan: '08:20',
      },
      {
        id: 'req-3',
        studentId: 'std-3',
        guruTujuanId: 'staff-yunita',
        jenisKeperluan: 'Konseling Belajar',
        tingkatUrgensi: 'Normal',
        ceritaSingkat:
          'Kesulitan mengatur jadwal belajar antara ekstrakurikuler OSIS dan persiapan ulangan Matematika serta Kimia.',
        usulanWaktu: 'Kamis jam ke-7 (13:30 WIB)',
        status: 'Menunggu Konfirmasi',
        tanggalPengajuan: today,
        jamPengajuan: '09:05',
      },
      {
        id: 'req-4',
        studentId: 'std-5',
        guruTujuanId: 'staff-aditya',
        jenisKeperluan: 'Perencanaan Karir',
        tingkatUrgensi: 'Normal',
        ceritaSingkat:
          'Mohon arahan mengenai syarat beasiswa kuliah ke luar negeri dan surat rekomendasi BK.',
        usulanWaktu: 'Hari ini pukul 10:30 WIB',
        status: 'Selesai',
        tanggalPengajuan: twoDaysAgo,
        jamPengajuan: '11:40',
        jadwalTanggal: today,
        jadwalJam: '10:30',
        ruangPertemuan: 'Ruang Konseling 6',
        catatanGuru:
          'Sesi selesai. Surat rekomendasi sedang diproses dan dapat diambil di Ruang BK.',
      },
      {
        id: 'req-5',
        studentId: 'std-4',
        guruTujuanId: 'staff-harjito',
        jenisKeperluan: 'Konseling Pribadi',
        tingkatUrgensi: 'Segera',
        ceritaSingkat:
          'Merasa cemas berlebihan menjelang ujian praktik dan sering sulit tidur di malam hari.',
        usulanWaktu: 'Hari ini pukul 13:00 WIB',
        status: 'Menunggu Konfirmasi',
        tanggalPengajuan: today,
        jamPengajuan: '07:50',
      },
      {
        id: 'req-6',
        studentId: 'std-1',
        guruTujuanId: 'staff-daviq',
        jenisKeperluan: 'Permohonan Surat/Izin',
        tingkatUrgensi: 'Normal',
        ceritaSingkat:
          'Pengajuan surat keterangan berkelakuan baik untuk pendaftaran lomba karya tulis ilmiah tingkat provinsi.',
        usulanWaktu: 'Minggu lalu',
        status: 'Selesai',
        tanggalPengajuan: sevenDaysAgo,
        jamPengajuan: '09:30',
        jadwalTanggal: fourDaysAgo,
        jadwalJam: '09:30',
        ruangPertemuan: 'Ruang Konseling 1',
        catatanGuru: 'Surat sudah diterbitkan dan ditandatangani oleh Wakil Kepala Sekolah.',
      },
    ],
    notes: [
      {
        id: 'note-1',
        studentId: 'std-2',
        guruId: 'staff-palupi',
        guruNama: 'Palupi Etikawati, S.Pd.',
        tanggal: fourDaysAgo,
        jenisLayanan: 'Konseling Sosial',
        deskripsiPermasalahan:
          'Siswa dilaporkan sering menarik diri saat kerja kelompok dan sempat terlibat perdebatan verbal dengan dua teman sekelas.',
        hasilAsesmen:
          'Berdasarkan wawancara, siswa merasa kontribusinya tidak dihargai dan tertekan oleh target nilai kelompok.',
        rencanaTindakLanjut:
          'Pendekatan komunikasi asertif individual, koordinasi dengan wali kelas XI IPS 2, dan pemantauan interaksi selama 2 minggu.',
        statusPerkembangan: 'Perlu Pemantauan',
        isRahasia: false,
        createdAt: `${fourDaysAgo}T14:15:00`,
      },
      {
        id: 'note-2',
        studentId: 'std-4',
        guruId: 'staff-harjito',
        guruNama: 'Harjito Khamdhani, S.Pd.',
        tanggal: twoDaysAgo,
        jenisLayanan: 'Konseling Belajar',
        deskripsiPermasalahan:
          'Penurunan kehadiran pada jam pertama selama 3 kali berturut-turut disertai keluhan kelelahan dan kurang fokus.',
        hasilAsesmen:
          'Siswa bekerja membantu usaha keluarga hingga larut malam sejak ayahnya sakit bulan lalu. Motivasi akademik sebenarnya tetap tinggi.',
        rencanaTindakLanjut:
          'Penjadwalan ulang target belajar mandiri, pemberian dispensasi tugas terstruktur dengan guru mapel, serta konsultasi dengan Ibu Sri Wahyuni (Wali Murid).',
        statusPerkembangan: 'Panggilan Orang Tua',
        isRahasia: true,
        createdAt: `${twoDaysAgo}T11:20:00`,
      },
      {
        id: 'note-3',
        studentId: 'std-1',
        guruId: 'staff-daviq',
        guruNama: 'Daviq Prasetian, S.Pd.',
        tanggal: tenDaysAgo,
        jenisLayanan: 'Perencanaan Karir',
        deskripsiPermasalahan:
          'Kebingungan dalam memprioritaskan pilihan prodi rumpun soshum vs saintek untuk seleksi masuk perguruan tinggi.',
        hasilAsesmen:
          'Hasil tes minat bakat RIASEC menunjukkan kecenderungan kuat pada tipe Social (S) dan Investigative (I). Nilai Biologi dan Sosiologi konsisten di atas 89.',
        rencanaTindakLanjut:
          'Eksplorasi kurikulum prodi Psikologi dan Kesehatan Masyarakat bersama orang tua, lanjutkan sesi pemantapan portofolio.',
        statusPerkembangan: 'Membaik',
        isRahasia: false,
        createdAt: `${tenDaysAgo}T10:00:00`,
      },
      {
        id: 'note-4',
        studentId: 'std-3',
        guruId: 'staff-yunita',
        guruNama: 'Yunita Anggraini, S.Pd.',
        tanggal: yesterday,
        jenisLayanan: 'Konseling Pribadi',
        deskripsiPermasalahan:
          'Siswa merasa kewalahan beradaptasi dengan ritme belajar SMA dan padatnya kegiatan kepanitiaan sekolah.',
        hasilAsesmen:
          'Siswa memiliki perfeksionisme tinggi namun belum memiliki teknik manajemen waktu (time-blocking) yang realistis.',
        rencanaTindakLanjut:
          'Latihan penyusunan matriks prioritas mingguan dan evaluasi beban tugas organisasi bersama pembina OSIS.',
        statusPerkembangan: 'Membaik',
        isRahasia: false,
        createdAt: `${yesterday}T13:10:00`,
      },
      {
        id: 'note-5',
        studentId: 'std-6',
        guruId: 'staff-hanum',
        guruNama: 'Hanum Salimah, S.Pd.',
        tanggal: sevenDaysAgo,
        jenisLayanan: 'Konseling Belajar',
        deskripsiPermasalahan:
          'Terdapat 2 mata pelajaran di bawah KKM pada evaluasi tengah semester.',
        hasilAsesmen:
          'Kurang terstruktur dalam mencatat materi dan sering bermain gim hingga larut malam.',
        rencanaTindakLanjut:
          'Kontrak perilaku pengurangan waktu layar malam hari dan pemanggilan orang tua untuk pendampingan belajar di rumah.',
        statusPerkembangan: 'Panggilan Orang Tua',
        isRahasia: false,
        createdAt: `${sevenDaysAgo}T09:45:00`,
      },
    ],
    guests: [
      {
        id: 'gst-1',
        nomorAntrean: 'TM-001',
        namaLengkap: 'Ibu Sri Wahyuni',
        kategori: 'Wali Murid',
        namaSiswaTerkait: 'Fajar Nugroho (XII IPS 1)',
        noWhatsApp: '081987651234',
        pihakDituju: 'Harjito Khamdhani, S.Pd.',
        keperluan: 'Undangan konsultasi perkembangan kehadiran dan dukungan belajar siswa di rumah.',
        tanggal: today,
        jamMasuk: '08:15',
        jamKeluar: '09:05',
        status: 'Selesai',
      },
      {
        id: 'gst-2',
        nomorAntrean: 'TM-002',
        namaLengkap: 'Drs. Bambang Hermawan',
        kategori: 'Instansi/Dinas',
        noWhatsApp: '081122334455',
        pihakDituju: 'Dra. Ida Sulistyani',
        keperluan: 'Koordinasi program penyuluhan kesehatan mental remaja dari Puskesmas Kecamatan.',
        tanggal: today,
        jamMasuk: '09:40',
        status: 'Berkunjung',
      },
      {
        id: 'gst-3',
        nomorAntrean: 'TM-003',
        namaLengkap: 'Bapak Agus Santoso',
        kategori: 'Wali Murid',
        namaSiswaTerkait: 'Aulia Rahma Putri (XII IPA 1)',
        noWhatsApp: '081234567890',
        pihakDituju: 'Daviq Prasetian, S.Pd.',
        keperluan: 'Konsultasi persiapan dokumen pendaftaran kuliah jalur prestasi.',
        tanggal: today,
        jamMasuk: '10:25',
        status: 'Berkunjung',
      },
      {
        id: 'gst-4',
        nomorAntrean: 'TM-001',
        namaLengkap: 'Reza Alfarizi (Angkatan 2021)',
        kategori: 'Alumni',
        noWhatsApp: '085266778899',
        pihakDituju: 'Aditya Dwi Praseta, S.Pd.',
        keperluan: 'Berbagi informasi beasiswa kampus dan legalisir surat keterangan prestasi.',
        tanggal: yesterday,
        jamMasuk: '13:10',
        jamKeluar: '14:00',
        status: 'Selesai',
      },
    ],
    activities: [
      {
        id: 'act-1',
        timestamp: '10:25',
        tanggal: today,
        actor: 'Bapak Agus Santoso (Wali Murid)',
        type: 'guest',
        description: 'Check-in Buku Tamu Digital (TM-003) menemui Daviq Prasetian, S.Pd.',
      },
      {
        id: 'act-2',
        timestamp: '09:40',
        tanggal: today,
        actor: 'Drs. Bambang Hermawan (Instansi/Dinas)',
        type: 'guest',
        description: 'Check-in Buku Tamu Digital (TM-002) menemui Dra. Ida Sulistyani.',
      },
      {
        id: 'act-3',
        timestamp: '09:05',
        tanggal: today,
        actor: 'Nabila Khairunnisa (X Merdeka 3)',
        type: 'request',
        description: 'Mengajukan layanan Konseling Belajar kepada Yunita Anggraini, S.Pd.',
      },
      {
        id: 'act-4',
        timestamp: '08:20',
        tanggal: today,
        actor: 'Dimas Pratama Putra (XI IPS 2)',
        type: 'request',
        description: 'Mengajukan Mediasi Masalah (Mendesak) kepada Palupi Etikawati, S.Pd.',
      },
      {
        id: 'act-5',
        timestamp: '08:15',
        tanggal: today,
        actor: 'Ibu Sri Wahyuni (Wali Murid)',
        type: 'guest',
        description: 'Kunjungan selesai (TM-001) bersama Harjito Khamdhani, S.Pd.',
      },
    ],
  };
}
