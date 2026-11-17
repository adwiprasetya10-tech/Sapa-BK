import { CounselingNote, Student } from '../types/sibk';

export interface CounselingAISuggestion {
  ringkasanKasus: string;
  polaTerdeteksi: string[];
  rekomendasiTindakLanjut: string[];
  draftRencanaTeks: string;
  tingkatPrioritas: 'Rendah / Preventif' | 'Sedang / Terjadwal' | 'Tinggi / Intervensi Segera';
}

export function generateCounselingSuggestion(
  student: Student,
  notes: CounselingNote[],
  currentDraft?: {
    jenisLayanan?: string;
    deskripsiPermasalahan?: string;
    hasilAsesmen?: string;
  }
): CounselingAISuggestion {
  const sortedNotes = [...notes].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const combinedText = [
    currentDraft?.deskripsiPermasalahan || '',
    currentDraft?.hasilAsesmen || '',
    ...sortedNotes.map((n) => `${n.jenisLayanan} ${n.deskripsiPermasalahan} ${n.hasilAsesmen}`),
  ]
    .join(' ')
    .toLowerCase();

  const patterns: string[] = [];
  const recommendations: string[] = [];

  const hasAcademic =
    /nilai|kkm|belajar|ulangan|tugas|akademik|fokus|bolos|absen|kehadiran/.test(combinedText);
  const hasSocial =
    /teman|kelompok|konflik|mediasi|bully|perundung|sosial|debat|menarik diri/.test(combinedText);
  const hasEmotional =
    /cemas|tidur|stres|tertekan|lelah|keluarga|sakit|sedih|emosi|perfeksionis/.test(combinedText);
  const hasCareer =
    /kuliah|jurusan|karir|beasiswa|snbp|snbt|prodi|minat|bakat|universitas/.test(combinedText);

  const hasUrgentStatus =
    sortedNotes.some((n) => n.statusPerkembangan === 'Panggilan Orang Tua') ||
    sortedNotes.filter((n) => n.statusPerkembangan === 'Perlu Pemantauan').length >= 2;

  if (hasAcademic) {
    patterns.push('Tantangan manajemen waktu, konsistensi belajar, atau kehadiran kelas.');
    recommendations.push(
      'Susun kontrak belajar harian (time-blocking) bersama siswa dengan target mingguan yang terukur.'
    );
    recommendations.push(
      'Koordinasikan pemetaan ketuntasan tugas dengan wali kelas dan guru mata pelajaran terkait.'
    );
  }

  if (hasSocial) {
    patterns.push('Dinamika relasi sebaya dan kebutuhan penguatan komunikasi asertif.');
    recommendations.push(
      'Fasilitasi sesi mediasi terstruktur (win-win solution) dan latih keterampilan komunikasi asertif ("I-message").'
    );
  }

  if (hasEmotional) {
    patterns.push('Indikasi beban psikologis, kecemasan, atau tekanan situasi keluarga.');
    recommendations.push(
      'Lakukan sesi konseling individual berfokus pada regulasi emosi dan teknik relaksasi pernapasan/jurnal harian.'
    );
  }

  if (hasCareer) {
    patterns.push('Kebutuhan eksplorasi peminatan karir dan studi lanjut pasca-SMA.');
    recommendations.push(
      'Padukan hasil asesmen minat bakat (RIASEC) dengan rekam nilai rapor untuk menyusun 2–3 opsi prodi realistis.'
    );
  }

  if (hasUrgentStatus || /orang tua|wali|keluarga|malam/.test(combinedText)) {
    recommendations.push(
      `Jadwalkan komunikasi/pemanggilan resmi dengan ${student.namaWali} (${student.noHpWali}) untuk menyelaraskan dukungan pendampingan di rumah.`
    );
  }

  if (patterns.length === 0) {
    patterns.push('Kebutuhan pendampingan pengembangan diri dan adaptasi lingkungan sekolah.');
    recommendations.push(
      'Lakukan tindak lanjut konseling berkala dalam 1–2 minggu untuk mengevaluasi perkembangan komitmen siswa.'
    );
    recommendations.push(
      'Berikan penguatan positif atas keterbukaan siswa dalam mengakses layanan BK.'
    );
  }

  const latestStatus = sortedNotes[0]?.statusPerkembangan || 'Tahap Asesmen Awal';
  const totalSessions = sortedNotes.length;

  const ringkasanKasus =
    totalSessions > 0
      ? `${student.nama} (${student.kelas}) memiliki ${totalSessions} catatan konseling terdokumentasi dengan status terakhir "${latestStatus}". Fokus pendampingan saat ini mengarah pada ${
          currentDraft?.jenisLayanan || sortedNotes[0].jenisLayanan
        } dengan perhatian utama pada kestabilan motivasi dan lingkungan pendukung siswa.`
      : `${student.nama} (${student.kelas}) sedang dalam tahap awal pencatatan untuk layanan ${
          currentDraft?.jenisLayanan || 'Konseling'
        }. Diperlukan penggalian akar masalah dan penyusunan target jangka pendek yang realistis.`;

  const tingkatPrioritas: CounselingAISuggestion['tingkatPrioritas'] = hasUrgentStatus
    ? 'Tinggi / Intervensi Segera'
    : hasEmotional || hasSocial
    ? 'Sedang / Terjadwal'
    : 'Rendah / Preventif';

  const draftRencanaTeks = recommendations
    .slice(0, 3)
    .map((item, idx) => `${idx + 1}. ${item}`)
    .join('\n');

  return {
    ringkasanKasus,
    polaTerdeteksi: patterns,
    rekomendasiTindakLanjut: recommendations.slice(0, 4),
    draftRencanaTeks,
    tingkatPrioritas,
  };
}
