// Âm thanh thực tế, êm ái chuẩn môn Cầu Lông (Real Badminton Acoustics Synthesis)
// Sử dụng Web Audio API không độ trễ, không phụ thuộc file ngoài, âm sắc nhẹ nhàng tự nhiên

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. Tiếng vụt vợt nhẹ nhàng xé gió (Gentle Whoosh)
  playSwing() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.exponentialRampToValueAtTime(820, now + 0.05);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.12);
    filter.Q.value = 2.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.12);
  }

  // 2. Tiếng gõ chạm mặt vợt chuẩn đế bần (Real Badminton Cork Hit / Smash)
  // Nghe tiếng "póc" / "phốp" giòn tan, thanh thoát, không bị chói tai hay âm điện tử giả tạo
  playHit(isSmash = false) {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (!isSmash) {
      // ==========================================
      // CÚ ĐÁNH THƯỜNG (Clear / Phông cầu / Đánh trả tiêu chuẩn):
      // Tiếng "póc" tự nhiên của đế bần chạm cước vợt căng 26-28 lbs
      // ==========================================
      
      // Thành phần 1: Tiếng nổ tách đanh gọn (Cork contact transient)
      const noiseLen = Math.floor(ctx.sampleRate * 0.02);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const ndata = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        ndata[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuf;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1450;
      noiseFilter.Q.value = 3.2;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);

      // Thành phần 2: Âm rung đanh của khung & mặt cước (String bed resonance)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(940, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.055);

      oscGain.gain.setValueAtTime(0.22, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);

      // Thành phần 3: Độ trầm ấm nhẹ của thân cầu (Hollow body pop)
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      bodyOsc.type = 'sine';
      bodyOsc.frequency.setValueAtTime(420, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(260, now + 0.045);

      bodyGain.gain.setValueAtTime(0.12, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.045);

    } else {
      // ==========================================
      // CÚ SMASH (Đập cầu uy lực tóe lửa):
      // Tiếng "bốp!" / "chát!" cực giòn và uy lực của cước đập búa bổ vào tâm ngọt (sweetspot)
      // ==========================================

      // Thành phần 1: Tiếng nổ tách đanh xé gió cực bén (Crisp string snap)
      const snapLen = Math.floor(ctx.sampleRate * 0.035);
      const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
      const sdata = snapBuf.getChannelData(0);
      for (let i = 0; i < snapLen; i++) {
        sdata[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.006));
      }
      const snapSource = ctx.createBufferSource();
      snapSource.buffer = snapBuf;

      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = 'bandpass';
      snapFilter.frequency.value = 1950;
      snapFilter.Q.value = 2.4;

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.32, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      snapSource.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapSource.start(now);

      // Thành phần 2: Âm cước căng cực nảy (High-tension string ping)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.075);

      oscGain.gain.setValueAtTime(0.32, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);

      // Thành phần 3: Lực đập uy lực lan tỏa nhẹ (Solid punch)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(240, now);
      subOsc.frequency.exponentialRampToValueAtTime(110, now + 0.065);

      subGain.gain.setValueAtTime(0.18, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.065);
    }
  }

  // 3. Tiếng bỏ nhỏ (Drop shot chạm nhẹ cước êm dịu)
  playDrop() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Tiếng chạm nhẹ nhàng, thanh thoát
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.04);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 4. Tiếng nhoài người cứu cầu (Dive slide / ma sát sàn êm ái)
  playDive() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.linearRampToValueAtTime(280, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.18);
  }

  // 5. Âm thanh Timing chuẩn xác (Chuông thanh thoát, không lấn át)
  playTiming(isPerfect = true) {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPerfect ? 1318.51 : 987.77, now); // E6 or B5
    osc.frequency.exponentialRampToValueAtTime(isPerfect ? 1567.98 : 1174.66, now + 0.09);

    gain.gain.setValueAtTime(isPerfect ? 0.11 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // 6. Tiếng cầu chạm đất (Floor tap - nhẹ như lông vũ và đế bần tiếp đất)
  playFloorTap() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // 7. Tiếng còi trọng tài (Whistle - 2 âm ấm áp, không chói gắt)
  playWhistle() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Hài âm kép như còi Fox 40 thực thụ (2050Hz & 2350Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(2050, now);
    osc2.frequency.setValueAtTime(2350, now);

    // Rung nhẹ (flutter)
    osc1.frequency.linearRampToValueAtTime(2150, now + 0.08);
    osc1.frequency.linearRampToValueAtTime(2050, now + 0.18);
    osc2.frequency.linearRampToValueAtTime(2450, now + 0.08);
    osc2.frequency.linearRampToValueAtTime(2350, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.setValueAtTime(0.08, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  // 8. Tiếng khán giả hò reo cổ vũ (Cheer ấm áp)
  playCheer() {
    if (!this.enabled) return;
    this.init();
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.9);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, now);
    filter.Q.value = 1.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.2);
    gain.gain.setValueAtTime(0.09, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.9);
  }
}

export const sounds = new SoundManager();
