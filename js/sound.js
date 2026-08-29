/**
 * KhiemEdu Sound Effects Engine
 * Uses Web Audio API to generate synthesized retro & modern sound effects.
 */

const SoundEngine = {
  ctx: null,
  isMuted: false,

  init() {
    this.isMuted = localStorage.getItem('khiemedu_muted') === 'true';
  },

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('khiemedu_muted', this.isMuted);
    return this.isMuted;
  },

  playTone(freq, type, duration, delay = 0) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    setTimeout(() => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.warn('Audio play error:', e);
      }
    }, delay * 1000);
  },

  playClick() {
    this.playTone(600, 'sine', 0.05);
  },

  playCorrect() {
    this.playTone(523.25, 'triangle', 0.12, 0);       // C5
    this.playTone(659.25, 'triangle', 0.15, 0.08);    // E5
    this.playTone(783.99, 'triangle', 0.25, 0.16);    // G5
  },

  playFanfare() {
    if (this.isMuted) return;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.12 },
      { f: 783.99, d: 0.12, t: 0.24 },
      { f: 1046.50, d: 0.4, t: 0.36 }
    ];
    notes.forEach(n => this.playTone(n.f, 'triangle', n.d, n.t));
  },

  playLevelUp() {
    if (this.isMuted) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((f, i) => this.playTone(f, 'sine', 0.18, i * 0.07));
  },

  playWarning() {
    this.playTone(350, 'sawtooth', 0.1);
  }
};

window.SoundEngine = SoundEngine;
