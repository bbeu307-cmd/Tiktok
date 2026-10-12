/**
 * TikTok Live Racing Arena - Audio Engine
 * Procedural Web Audio API sound generator for realistic car & bike engine sounds,
 * turbo whistles, countdown beeps, and victory chimes.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;
  private activeCarEngine: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
  private activeBikeEngine: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public unlockAudio() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.isUnlocked = true;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  // --- Beep de Contagem Regressiva (3, 2, 1, GO!) ---
  public playCountdownBeep(isGo: boolean = false) {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isGo ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 1046.5 : 523.25, this.ctx.currentTime); // C6 para GO!, C5 para 3,2,1

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + (isGo ? 0.6 : 0.25));
    } catch {
      // Audio fallback silent
    }
  }

  // --- Efeito Sonoro de Turbo / Nitro / Foguete ---
  public playTurboSound(isRocket: boolean = false) {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;

    try {
      const duration = isRocket ? 1.5 : 0.9;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(isRocket ? 3600 : 2400, this.ctx.currentTime + duration * 0.7);
      filter.Q.value = 4.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start();
      noise.stop(this.ctx.currentTime + duration);
    } catch {
      // Silent on error
    }
  }

  // --- Efeito de Ultrapassagem (Whoosh estéreo) ---
  public playOvertakeSound() {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Silent
    }
  }

  // --- Efeito de Vitória / Chegada no Pódio ---
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.unlockAudio();
    if (!this.ctx || !this.masterGain) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0.25, this.ctx!.currentTime + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + index * 0.12 + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(this.ctx!.currentTime + index * 0.12);
        osc.stop(this.ctx!.currentTime + index * 0.12 + 0.5);
      });
    } catch {
      // Silent
    }
  }
}

export const soundEngine = new SoundEngine();
