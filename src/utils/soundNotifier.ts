let sharedAudioCtx: AudioContext | null = null;
let unlockRegistered = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {
      // Autoplay policy may block until user interacts
    });
  }
  return sharedAudioCtx;
}

export function registerAudioUnlock(): void {
  if (typeof window === 'undefined' || unlockRegistered) return;
  unlockRegistered = true;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

export type NotificationSoundKind = 'chat' | 'attendance' | 'sent';

export function playNotificationSound(kind: NotificationSoundKind = 'chat'): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      peakGain: number,
      type: OscillatorType = 'sine'
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (kind === 'chat') {
      // Pleasant two-note rising bell chime (E5 -> A5)
      playTone(659.25, 0, 0.16, 0.14, 'triangle');
      playTone(880.0, 0.11, 0.24, 0.16, 'sine');
    } else if (kind === 'attendance') {
      // Three-note crisp alert (C5 -> E5 -> G5)
      playTone(523.25, 0, 0.12, 0.12, 'triangle');
      playTone(659.25, 0.09, 0.12, 0.13, 'triangle');
      playTone(783.99, 0.18, 0.22, 0.15, 'sine');
    } else {
      // Subtle single pop when sending message
      playTone(587.33, 0, 0.09, 0.07, 'sine');
    }

    return true;
  } catch {
    return false;
  }
}

export function showBrowserTextNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        tag: `sibk-${Date.now()}`,
      });
    } catch {
      // Ignore environments restricting Notification constructor
    }
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
