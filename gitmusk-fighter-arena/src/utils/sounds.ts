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

// ─── Background Music ─────────────────────────────────────────────────────────

let bgNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
let bgScheduled = false;
let bgStopping = false;

const TEMPO = 0.18; // seconds per 16th note

// Bass line: intervals in semitones from root A2 (110 Hz)
const BASS = [0, 0, 7, 0,  5, 5, 3, 5,  0, 0, 7, 10,  8, 8, 5, 3];
// Melody:   intervals in semitones from A4 (440 Hz)
const MELODY = [0, -1, 0, 3,  5, 3, 0, -1,  0, 3, 5, 7,  5, 3, 0, -1];

function semitone(base: number, st: number) {
  return base * Math.pow(2, st / 12);
}

function scheduleNote(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number,
) {
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    const master = bgMasterGain(c);
    osc.connect(gain);
    gain.connect(master);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.9);
    osc.start(start);
    osc.stop(start + dur);
    bgNodes.push({ osc, gain });
  } catch { /* blocked */ }
}

let _masterGain: GainNode | null = null;
function bgMasterGain(c: AudioContext): GainNode {
  if (!_masterGain) {
    _masterGain = c.createGain();
    _masterGain.gain.setValueAtTime(0.18, c.currentTime);
    _masterGain.connect(c.destination);
  }
  return _masterGain;
}

function scheduleLoop(c: AudioContext, startAt: number) {
  if (bgStopping) return;
  const loopLen = BASS.length * TEMPO;

  // Bass
  BASS.forEach((st, i) => {
    if (bgStopping) return;
    const freq = semitone(110, st);
    scheduleNote(c, freq, startAt + i * TEMPO, TEMPO * 0.75, 'square', 0.6);
  });

  // Melody (every other 16th note, starts 2 notes in)
  MELODY.forEach((st, i) => {
    if (bgStopping || i % 2 !== 0) return;
    const freq = semitone(440, st);
    scheduleNote(c, freq, startAt + i * TEMPO + TEMPO * 2, TEMPO * 1.4, 'triangle', 0.35);
  });

  // Hi-hat (every 4th note)
  for (let i = 0; i < BASS.length; i += 4) {
    if (bgStopping) return;
    try {
      const c2 = ac();
      const buf = c2.createBuffer(1, c2.sampleRate * 0.04, c2.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / d.length);
      const src = c2.createBufferSource();
      const gain = c2.createGain();
      const master = bgMasterGain(c2);
      src.buffer = buf;
      src.connect(gain); gain.connect(master);
      gain.gain.setValueAtTime(0.12, startAt + i * TEMPO);
      src.start(startAt + i * TEMPO);
    } catch { /* blocked */ }
  }

  // Schedule next loop
  const nextStart = startAt + loopLen;
  const msUntilNext = (nextStart - c.currentTime) * 1000 - 300;
  setTimeout(() => scheduleLoop(c, nextStart), Math.max(0, msUntilNext));
}

export function startBgMusic() {
  if (bgScheduled) return;
  bgScheduled = true;
  bgStopping = false;
  bgNodes = [];
  try {
    const c = ac();
    if (c.state === 'suspended') c.resume();
    scheduleLoop(c, c.currentTime + 0.1);
  } catch { /* blocked */ }
}

export function stopBgMusic() {
  bgStopping = true;
  bgScheduled = false;
  if (_masterGain) {
    try {
      const c = ac();
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, c.currentTime);
      _masterGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    } catch { /* blocked */ }
  }
  setTimeout(() => {
    bgNodes.forEach(({ osc }) => { try { osc.stop(); } catch { /* already stopped */ } });
    bgNodes = [];
    _masterGain = null;
  }, 600);
}
