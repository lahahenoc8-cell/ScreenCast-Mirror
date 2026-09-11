// Audio & Synthesizer Helper for Remote Phone Alerts and Feedback

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ringOscillator1: OscillatorNode | null = null;
  private ringOscillator2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRinging: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play pleasant click / tap feedback
  public playTapSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // ignore if audio blocked
    }
  }

  // Play crisp QR Code scan success beep
  public playSuccessBeep() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.setValueAtTime(1800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  // Play harmonic major chord connect chime
  public playConnectChime() {
    try {
      const ctx = this.getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Bright pleasant ascending chime)
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.36);
      });
    } catch (e) {}
  }

  // Play disconnect sound
  public playDisconnectChime() {
    try {
      const ctx = this.getAudioContext();
      const notes = [783.99, 523.25]; // G5 down to C5
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);

        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.31);
      });
    } catch (e) {}
  }

  // Play camera shutter sound
  public playShutterSound() {
    try {
      const ctx = this.getAudioContext();
      const bufferSize = Math.floor(ctx.sampleRate * 0.1);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
      whiteNoise.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  public playCameraShutter() {
    this.playShutterSound();
  }

  // Trigger hardware vibration if supported by the browser / OS
  public triggerVibration(pattern: number | number[] = 200) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Not supported or permission restricted
      }
    }
  }

  // Play Ringtone Siren ("Find My Phone" sound)
  public startRingtone(onStopCallback?: () => void) {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      const ctx = this.getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Alternating siren tone
      const now = ctx.currentTime;
      for (let i = 0; i < 30; i++) {
        const time = now + i * 0.4;
        osc1.frequency.setValueAtTime(i % 2 === 0 ? 880 : 1320, time); // A5 / E6
        osc2.frequency.setValueAtTime(i % 2 === 0 ? 440 : 660, time);
      }

      gain.gain.setValueAtTime(0.4, now);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ringOscillator1 = osc1;
      this.ringOscillator2 = osc2;
      this.ringGain = gain;

      // Auto stop after 15 seconds
      setTimeout(() => {
        this.stopRingtone();
        onStopCallback?.();
      }, 15000);
    } catch (e) {
      console.warn('Audio ringtone error:', e);
    }
  }

  public stopRingtone() {
    if (!this.isRinging) return;
    this.isRinging = false;
    try {
      if (this.ringOscillator1) {
        this.ringOscillator1.stop();
        this.ringOscillator1.disconnect();
        this.ringOscillator1 = null;
      }
      if (this.ringOscillator2) {
        this.ringOscillator2.stop();
        this.ringOscillator2.disconnect();
        this.ringOscillator2 = null;
      }
      if (this.ringGain) {
        this.ringGain.disconnect();
        this.ringGain = null;
      }
    } catch (e) {}
  }

  public getIsRinging() {
    return this.isRinging;
  }

  // Text-To-Speech
  public speakText(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'fr-FR';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
