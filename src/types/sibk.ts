export type StaffRole = 'admin' | 'guru_bk';

export type AvailabilityStatus = 'Tersedia' | 'Sedang Sesi';

export type CounselingCategory =
  | 'Konseling Pribadi'
  | 'Konseling Sosial'
  | 'Konseling Belajar'
  | 'Perencanaan Karir'
  | 'Mediasi Masalah'
  | 'Permohonan Surat/Izin';

export type UrgencyLevel = 'Normal' | 'Segera' | 'Mendesak (Rahasia)';

export type RequestStatus = 'Menunggu Konfirmasi' | 'Dijadwalkan' | 'Selesai';

export type ProgressStatus = 'Membaik' | 'Perlu Pemantauan' | 'Panggilan Orang Tua';

export type VisitorCategory = 'Wali Murid' | 'Instansi/Dinas' | 'Alumni' | 'Umum';

export type VisitorStatus = 'Berkunjung' | 'Selesai';

export type AppThemeId = 'aurora' | 'sunset' | 'indigo' | 'ocean' | 'midnight';

export interface AppThemeMeta {
  id: AppThemeId;
  name: string;
  subtitle: string;
  swatchColors: [string, string, string];
  isDark: boolean;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  namaWali: string;
  noHpWali: string;
  guruBkId: string;
}

export interface StaffUser {
  id: string;
  nip: string;
  username: string;
  password: string;
  nama: string;
  role: StaffRole;
  jabatan: string;
  spesialisasi: string;
  statusKetersediaan: AvailabilityStatus;
  ruang: string;
}

export interface CounselingRequest {
  id: string;
  studentId: string;
  guruTujuanId: string;
  jenisKeperluan: CounselingCategory;
  tingkatUrgensi: UrgencyLevel;
  ceritaSingkat: string;
  usulanWaktu: string;
  status: RequestStatus;
  tanggalPengajuan: string; // YYYY-MM-DD
  jamPengajuan: string; // HH:mm
  jadwalTanggal?: string;
  jadwalJam?: string;
  ruangPertemuan?: string;
  catatanGuru?: string;
  catatanPengalihan?: string;
}

export interface CounselingNote {
  id: string;
  studentId: string;
  guruId: string;
  guruNama: string;
  tanggal: string; // YYYY-MM-DD
  jenisLayanan: CounselingCategory;
  deskripsiPermasalahan: string;
  hasilAsesmen: string;
  rencanaTindakLanjut: string;
  statusPerkembangan: ProgressStatus;
  isRahasia: boolean;
  requestId?: string;
  createdAt: string;
}

export interface GuestVisit {
  id: string;
  nomorAntrean: string;
  namaLengkap: string;
  kategori: VisitorCategory;
  namaSiswaTerkait?: string;
  noWhatsApp: string;
  pihakDituju: string;
  keperluan: string;
  tanggal: string; // YYYY-MM-DD
  jamMasuk: string; // HH:mm
  jamKeluar?: string; // HH:mm
  status: VisitorStatus;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  tanggal: string;
  actor: string;
  type: 'request' | 'note' | 'guest' | 'schedule' | 'master';
  description: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export type AuthSession =
  | { type: 'student'; studentId: string }
  | { type: 'staff'; staffId: string }
  | null;

export interface SiBKDatabase {
  students: Student[];
  staff: StaffUser[];
  requests: CounselingRequest[];
  notes: CounselingNote[];
  guests: GuestVisit[];
  activities: ActivityLog[];
}

export type WebLogoPreset = 'shield' | 'graduation' | 'heart' | 'sparkles' | 'school';
export type WebLogoRounded = 'rounded-xl' | 'rounded-full' | 'rounded-md';
export type FontPreset = 'modern' | 'classic' | 'formal';

export interface AppSettings {
  // 1. Identitas & Logo Web
  appName: string;
  appTagline: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  footerLabel: string;
  webLogoDataUrl: string | null;
  webLogoPreset: WebLogoPreset;
  webLogoRounded: WebLogoRounded;
  showWebLogoContainerBg: boolean;
  faviconSync: boolean;

  // 2. Halaman Depan / Gerbang Masuk
  defaultGatewayTab: 'siswa' | 'staff' | 'tamu';
  showStudentTab: boolean;
  showStaffTab: boolean;
  showGuestTab: boolean;
  showHeroShowcase: boolean;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  showDemoLoginButtons: boolean;
  showThemeSwitcher: boolean;
  showStatsOnGateway: boolean;

  // 3. Layanan Konseling & Buku Tamu
  guestQueuePrefix: string;
  defaultMeetingRoom: string;
  enableQrScanner: boolean;
  showQrOnGuestTicket: boolean;
  defaultQrAutoCheckIn: boolean;
  extraGuestTargets: string[];
  allowSecretUrgency: boolean;
  serviceHoursNote: string;

  // 4. Tampilan Global
  fontPreset: FontPreset;
  showSidebarQueueBadge: boolean;
}


