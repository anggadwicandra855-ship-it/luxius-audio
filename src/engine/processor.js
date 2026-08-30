export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.source = null;
    this.audioBuffer = null;
    this.currentUrl = null;

    this.currentSettings = {
      speed: 1,
      pitch: 0,
      volume: 1
    };

    this.startedAt = 0;
    this.pausedAt = 0;
    this.isPlaying = false;
    this.animationFrame = null;

    this.onTimeUpdate = null;
    this.onStateChange = null;
  }

  ensureContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio API tidak didukung di browser ini.");

      this.audioContext = new AudioContextClass();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  async resumeContext() {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }
  }

  async loadBuffer(url) {
    if (this.currentUrl === url && this.audioBuffer) {
      return this.audioBuffer;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengunduh file audio.");

    const arrayBuffer = await response.arrayBuffer();
    const context = this.ensureContext();
    this.audioBuffer = await context.decodeAudioData(arrayBuffer);
    this.currentUrl = url;
    return this.audioBuffer;
  }

  async play(url, settings = {}, startTime = 0) {
    await this.resumeContext();
    this.destroySource();

    const buffer = await this.loadBuffer(url);

    const speed = this.clamp(Number(settings.speed) || 1, 0.25, 2);
    const pitch = this.clamp(Number(settings.pitch) || 0, -12, 12);
    const volume = this.clamp(Number(settings.volume) ?? 1, 0, 2);

    const adjustedDuration = buffer.duration / speed;
    const safeStart = this.clamp(Number(startTime) || 0, 0, adjustedDuration);
    const bufferStart = safeStart * speed;

    this.currentSettings = { speed, pitch, volume };
    this.pausedAt = safeStart;
    this.gainNode.gain.value = volume;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = speed;
    source.detune.value = pitch * 100;

    source.connect(this.gainNode);
    this.source = source;

    this.startedAt = this.audioContext.currentTime - safeStart;
    this.isPlaying = true;
    this.emitState("playing");

    source.onended = () => {
      if (this.source !== source) return;
      this.isPlaying = false;
      this.pausedAt = adjustedDuration;
      this.source = null;
      this.emitTime(adjustedDuration, adjustedDuration);
      this.emitState("ended");
      this.stopAnimation();
    };

    source.start(0, bufferStart);
    this.startAnimation(adjustedDuration);
  }

  pause() {
    if (!this.isPlaying || !this.source) return;
    const currentTime = this.getCurrentTime();
    this.pausedAt = currentTime;
    this.destroySource();
    this.isPlaying = false;
    this.emitTime(currentTime, this.getCurrentDuration());
    this.emitState("paused");
  }

  async resume() {
    if (!this.currentUrl) return;
    await this.play(this.currentUrl, this.currentSettings, this.pausedAt);
  }

  setSpeed(value) {
    const speed = this.clamp(Number(value) || 1, 0.25, 2);
    const currentTime = this.getCurrentTime();
    this.currentSettings.speed = speed;

    if (this.source) {
      this.source.playbackRate.value = speed;
      this.startedAt = this.audioContext.currentTime - currentTime;
    }
  }

  setPitch(value) {
    const pitch = this.clamp(Number(value) || 0, -12, 12);
    this.currentSettings.pitch = pitch;
    if (this.source) {
      this.source.detune.value = pitch * 100;
    }
  }

  setVolume(value) {
    const volume = this.clamp(Number(value) ?? 1, 0, 2);
    this.currentSettings.volume = volume;
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  stop() {
    this.destroySource();
    this.isPlaying = false;
    this.pausedAt = 0;
    this.stopAnimation();
    this.emitTime(0, this.getCurrentDuration());
    this.emitState("stopped");
  }

  getCurrentTime() {
    if (!this.isPlaying || !this.audioContext) return this.pausedAt;
    const elapsed = this.audioContext.currentTime - this.startedAt;
    return this.clamp(elapsed, 0, this.getCurrentDuration());
  }

  getCurrentDuration() {
    if (!this.audioBuffer) return 0;
    return this.audioBuffer.duration / (this.currentSettings.speed || 1);
  }

  async renderOffline(settings = {}) {
    if (!this.audioBuffer) throw new Error("No audio buffer loaded.");

    const speed = Number(settings.speed) || this.currentSettings.speed || 1;
    const pitch = Number(settings.pitch) || this.currentSettings.pitch || 0;
    const volume = Number(settings.volume) ?? this.currentSettings.volume ?? 1;

    const numberOfChannels = 1; // Downmix ke Mono agar ukuran file mengecil & stabil
    const sampleRate = 22050;   // Resample ke 22.05kHz (Sangat optimal & irit ukuran untuk Roblox)
    const renderedDuration = this.audioBuffer.duration / speed;
    const length = Math.ceil(renderedDuration * sampleRate);

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      numberOfChannels,
      length,
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = speed;
    source.detune.value = pitch * 100;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(offlineCtx.destination);

    source.start(0);

    return await offlineCtx.startRendering();
  }

  async exportAudioBlob(buffer, format = "ogg") {
    const wavBlob = this.audioBufferToWavBlob(buffer);
    const mime = format === "mp3" ? "audio/mpeg" : (format === "wav" ? "audio/wav" : "audio/ogg");
    return new Blob([await wavBlob.arrayBuffer()], { type: mime });
  }

  audioBufferToWavBlob(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;

    const monoData = new Float32Array(length);
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

    for (let i = 0; i < length; i++) {
      monoData[i] = (left[i] + right[i]) / 2;
    }

    const dataLength = length * numChannels * 2;
    const totalLength = 44 + dataLength;

    const out = new DataView(new ArrayBuffer(totalLength));
    let pos = 0;

    function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(totalLength - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);          // PCM
    setUint16(numChannels);
    setUint32(sampleRate);
    setUint32(sampleRate * numChannels * 2);
    setUint16(numChannels * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(dataLength);

    for (let i = 0; i < length; i++) {
      let sample = Math.max(-1, Math.min(1, monoData[i]));
      sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }

    return new Blob([out.buffer], { type: "audio/wav" });
  }

  startAnimation(duration) {
    this.stopAnimation();
    const tick = () => {
      if (!this.isPlaying) return;
      this.emitTime(this.getCurrentTime(), duration);
      this.animationFrame = requestAnimationFrame(tick);
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  stopAnimation() {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  destroySource() {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (e) {}
      this.source = null;
    }
  }

  emitTime(current, duration) {
    if (typeof this.onTimeUpdate === "function") this.onTimeUpdate(current, duration);
  }

  emitState(state) {
    if (typeof this.onStateChange === "function") this.onStateChange(state);
  }

  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
}