// Screen Wake Lock & Background Streaming Keep-Alive Helper
// Prevents phone from going to sleep during screen mirroring,
// and ensures continuous image streaming even when the phone locks or goes to background.

class WakeLockHelper {
  private sentinel: any = null;
  private isRequested: boolean = false;
  private silentAudio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private audioKeepAliveTimer: any = null;
  private listeners: Set<(isActive: boolean) => void> = new Set();
  private lockListeners: Set<(isLocked: boolean) => void> = new Set();

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  public isActive(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  public subscribe(callback: (isActive: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isActive());
    return () => this.listeners.delete(callback);
  }

  public subscribeLockState(callback: (isLocked: boolean) => void): () => void {
    this.lockListeners.add(callback);
    callback(typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false);
    return () => this.lockListeners.delete(callback);
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((cb) => {
      try {
        cb(active);
      } catch (e) {}
    });
  }

  private notifyLock(isLocked: boolean) {
    this.lockListeners.forEach((cb) => {
      try {
        cb(isLocked);
      } catch (e) {}
    });
  }

  // Request WakeLock to prevent the screen from dimming or locking
  public async requestWakeLock(): Promise<boolean> {
    this.isRequested = true;
    if (!this.isSupported()) {
      // Fallback: start background audio keep-alive
      this.startBackgroundKeepAlive();
      return false;
    }

    try {
      if (this.sentinel && !this.sentinel.released) {
        return true;
      }
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
        this.notify();
      });

      // Also start background audio keep-alive for defense-in-depth
      this.startBackgroundKeepAlive();
      this.notify();
      return true;
    } catch (err: any) {
      console.warn('Wake Lock request error:', err);
      this.startBackgroundKeepAlive();
      this.notify();
      return false;
    }
  }

  // Release screen wake lock
  public async releaseWakeLock() {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (e) {}
      this.sentinel = null;
    }
    this.stopBackgroundKeepAlive();
    this.notify();
  }

  // Handle visibility changes (phone locked / unlocked / tab switched)
  private async handleVisibilityChange() {
    const isHidden = document.visibilityState === 'hidden';
    this.notifyLock(isHidden);

    if (isHidden) {
      // When phone locks, ensure silent audio keep-alive is actively running so browser doesn't freeze socket
      this.startBackgroundKeepAlive();
    } else {
      // When phone unlocks, re-acquire wake lock if it was requested
      if (this.isRequested) {
        await this.requestWakeLock();
      }
    }
  }

  // Silent Background Audio Keep-Alive
  // On iOS and Android, playing a silent looping audio stream prevents the mobile OS
  // from suspending JavaScript execution, WebSockets, and WebRTC streaming when the screen locks.
  public startBackgroundKeepAlive() {
    if (this.silentAudio) return;

    try {
      // 1-second silent stereo WAV in base64 data URI
      const silentWavBase64 = 
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD/////AA==';
      
      const audio = new Audio(silentWavBase64);
      audio.loop = true;
      audio.volume = 0.001; // nearly imperceptible/silent
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented; will retry on next user tap
        });
      }
      this.silentAudio = audio;

      // Web Audio silent oscillator as secondary keep-alive
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!this.audioCtx) {
            this.audioCtx = new AudioCtx();
          }
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        }
      } catch (e) {}

    } catch (e) {
      console.warn('Silent audio keep-alive init warning:', e);
    }
  }

  public stopBackgroundKeepAlive() {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        this.silentAudio.src = '';
      } catch (e) {}
      this.silentAudio = null;
    }
    if (this.audioKeepAliveTimer) {
      clearInterval(this.audioKeepAliveTimer);
      this.audioKeepAliveTimer = null;
    }
  }
}

export const wakeLockHelper = new WakeLockHelper();
