import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioChimeService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    this.initUnlockListeners();
  }

  private getContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private initUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.isUnlocked) return;
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
          window.removeEventListener('click', unlock);
          window.removeEventListener('touchstart', unlock);
        }).catch(() => {});
      } else if (ctx) {
        this.isUnlocked = true;
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
      }
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  /**
   * Two-tone classic doorbell chime (C5 523Hz -> G4 392Hz)
   */
  playDoorbellChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: High note (C5 - 523.25 Hz)
    this.createTone(ctx, 523.25, now, 0.8, 0.3);

    // Tone 2: Lower note (G4 - 392.00 Hz) slightly delayed
    this.createTone(ctx, 392.00, now + 0.35, 1.2, 0.25);
  }

  /**
   * Warm marimba arpeggio (E5 -> G#5 -> B5)
   */
  playMarimbaChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5

    notes.forEach((freq, idx) => {
      this.createTone(ctx, freq, now + (idx * 0.15), 0.7, 0.2);
    });
  }

  /**
   * Soft ambient hourly gong (A4 440Hz with long gentle decay)
   */
  playHourlyChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.createTone(ctx, 440.0, now, 2.5, 0.2, 'sine');
    this.createTone(ctx, 880.0, now, 1.8, 0.08, 'sine');
  }

  /**
   * High-contrast warning chime for critical alerts
   */
  playAlertBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.createTone(ctx, 880, now, 0.2, 0.4, 'triangle');
    this.createTone(ctx, 880, now + 0.25, 0.2, 0.4, 'triangle');
  }

  // Convenience aliases
  playDoorbell(): void { this.playDoorbellChime(); }
  playMarimba(): void { this.playMarimbaChime(); }
  playHourlyGong(): void { this.playHourlyChime(); }
  playAlert(): void { this.playAlertBeep(); }

  private createTone(
    ctx: AudioContext, 
    freq: number, 
    startTime: number, 
    duration: number, 
    peakVolume: number, 
    type: OscillatorType = 'sine'
  ): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Fast attack, smooth exponential decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    } catch (e) {
      // Audio synthesis fallback silent
    }
  }
}
