let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

function tone(
  freq: number, endFreq: number, duration: number,
  type: OscillatorType = 'square', vol = 0.25
) {
  try {
    const c = ac();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start();
    osc.stop(c.currentTime + duration + 0.01);
  } catch { /* audio blocked */ }
}

export function playPunch() {
  tone(260, 180, 0.08, 'square', 0.22);
}

export function playKick() {
  tone(130, 55, 0.14, 'sawtooth', 0.32);
}

export function playSpecial() {
  tone(220, 900, 0.32, 'sine', 0.35);
  setTimeout(() => tone(440, 1200, 0.2, 'sine', 0.2), 60);
}

export function playUltimate() {
  tone(80, 35, 0.6, 'sawtooth', 0.5);
  tone(650, 120, 0.45, 'square', 0.3);
  setTimeout(() => tone(900, 200, 0.4, 'sine', 0.25), 80);
}

export function playBlock() {
  tone(160, 140, 0.07, 'square', 0.18);
}

export function playCombo(count: number) {
  const freq = 300 + count * 60;
  tone(freq, freq * 1.3, 0.09, 'square', 0.18);
}

export function playKO() {
  const c = ac();
  [900, 700, 500, 350, 200].forEach((f, i) => {
    const t = c.currentTime + i * 0.1;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch { /* blocked */ }
  });
}
