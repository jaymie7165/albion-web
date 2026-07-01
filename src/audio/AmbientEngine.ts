import type { TimeOfDay, Weather } from '../types';

// Prostorové ambientní audio generované procedurálně přes WebAudio API
// (bez externích audio souborů). Vrstvy se plynule prolínají (fade), ne přeskakují.

type Layer = {
  gain: GainNode;
  source: AudioBufferSourceNode | OscillatorNode;
};

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Record<string, Layer> = {};
  private started = false;

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private noiseBuffer(ctx: AudioContext, seconds = 4) {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private makeNoiseLayer(id: string, filterFreq: number, filterType: BiquadFilterType, initialGain = 0) {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = initialGain;
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
    this.layers[id] = { gain, source: src };
  }

  private makeHumLayer(id: string, freq: number, initialGain = 0) {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = initialGain;
    osc.connect(gain).connect(this.master!);
    osc.start();
    this.layers[id] = { gain, source: osc };
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.ensureCtx();
    // rain: bright high-passed noise
    this.makeNoiseLayer('rain', 1800, 'highpass', 0);
    // storm: low rumble noise
    this.makeNoiseLayer('storm', 220, 'lowpass', 0);
    // wind / fog: mid noise
    this.makeNoiseLayer('wind', 700, 'bandpass', 0);
    // distant city hum
    this.makeNoiseLayer('city', 450, 'lowpass', 0);
    // deep night hum
    this.makeHumLayer('hum', 48, 0);
  }

  resume() {
    this.ctx?.resume();
  }

  setMasterVolume(v: number) {
    if (!this.master || !this.ctx) return;
    this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.4);
  }

  private fadeLayer(id: string, target: number, duration = 1.6) {
    const layer = this.layers[id];
    if (!layer || !this.ctx) return;
    layer.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    layer.gain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + duration);
  }

  applyMood(weather: Weather, timeOfDay: TimeOfDay) {
    if (!this.started) this.start();
    const rain = weather === 'rain' || weather === 'heavyRain' || weather === 'storm' ? (weather === 'heavyRain' ? 0.22 : 0.13) : 0;
    const storm = weather === 'storm' ? 0.16 : 0;
    const wind = weather === 'fog' || weather === 'snow' ? 0.07 : weather === 'clear' ? 0.02 : 0.04;
    const isNight = timeOfDay === 'night' || timeOfDay === 'deepNight';
    const city = isNight ? 0.035 : 0.06;
    const hum = timeOfDay === 'deepNight' ? 0.05 : 0;

    this.fadeLayer('rain', rain);
    this.fadeLayer('storm', storm);
    this.fadeLayer('wind', wind);
    this.fadeLayer('city', city);
    this.fadeLayer('hum', hum);
  }

  mute() {
    this.setMasterVolume(0);
  }
  unmute() {
    this.setMasterVolume(0.5);
  }
}

export const ambientEngine = new AmbientEngine();
