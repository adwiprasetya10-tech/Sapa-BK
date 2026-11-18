import { AppSettings } from '../types/sibk';

export const SETTINGS_STORAGE_KEY = 'sibk_settings_v1';
export const PRINT_CONFIG_STORAGE_KEY = 'sibk_print_config_v1';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'SiBK',
  appTagline: 'Sistem Informasi Bimbingan Konseling & Buku Tamu Digital',
  schoolName: 'SMA Negeri Nusantara Harapan',
  schoolAddress: 'Jl. Pendidikan Merdeka No. 45, Kota Nusantara 12345 · Telp. (021) 555-0148',
  schoolContact: 'www.sman-nusantara.sch.id · bk@sman-nusantara.sch.id',
  footerLabel: 'SiBK Terpadu',
  webLogoDataUrl: null,
  webLogoPreset: 'shield',
  webLogoRounded: 'rounded-xl',
  showWebLogoContainerBg: true,
  faviconSync: true,

  defaultGatewayTab: 'siswa',
  showStudentTab: true,
  showStaffTab: true,
  showGuestTab: true,
  showHeroShowcase: true,
  heroBadge: 'Gerbang Layanan Terpadu Sekolah',
  heroTitle: 'Ruang Aman Konseling & Pelayanan Tamu Digital',
  heroDescription:
    'Platform interaktif bagi siswa, Guru BK, dan wali murid dengan pilihan tema tampilan modern serta manajemen data lengkap (pilih, edit, hapus, ekspor, impor).',
  showDemoLoginButtons: true,
  showThemeSwitcher: true,
  showStatsOnGateway: true,

  guestQueuePrefix: 'TM-',
  defaultMeetingRoom: 'Ruang BK 1',
  enableQrScanner: true,
  showQrOnGuestTicket: true,
  defaultQrAutoCheckIn: true,
  extraGuestTargets: [
    'Wakil Kepala Sekolah Bidang Kesiswaan',
    'Tata Usaha / Administrasi Sekolah',
  ],
  allowSecretUrgency: true,
  serviceHoursNote: 'Layanan BK aktif Senin–Jumat pukul 07.30 – 15.00 WIB',

  fontPreset: 'modern',
  showSidebarQueueBadge: true,
  enableSoundNotification: true,
  enableTextNotification: true,
  enableBrowserNotification: true,
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      extraGuestTargets: Array.isArray(parsed.extraGuestTargets)
        ? parsed.extraGuestTargets
        : DEFAULT_APP_SETTINGS.extraGuestTargets,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
}
