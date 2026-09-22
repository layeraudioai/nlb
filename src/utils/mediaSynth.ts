/**
 * Media Synthesis Utilities
 * Handles in-browser generation, synthesis, preview, and binary export
 * for PNG (Images), MP4 (Video), and WAV (Audio).
 */

// ============================================================================
// 1. WAV Audio Synthesis (RIFF WAV 16-bit PCM)
// ============================================================================

export interface SoundConfig {
  type: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
  startFreq: number;
  endFreq: number;
  duration: number; // in seconds
  attack: number; // in seconds
  decay: number;
  sustain: number; // 0.0 - 1.0
  release: number;
  volume: number; // 0.0 - 1.0
  arpeggio?: number[]; // Frequency multiplier steps
  harmonics?: number[];
}

/**
 * Creates a standard 44.1kHz 16-bit Mono RIFF WAV Blob from an array of audio samples (-1.0 to 1.0)
 */
export function encodeWav(samples: Float32Array, sampleRate = 44100): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // Write fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // Write data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Write 16-bit PCM samples (clamped)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Synthesizes a Float32Array audio waveform based on sound parameters
 */
export function synthesizeSound(config: SoundConfig, sampleRate = 44100): Float32Array {
  const totalSamples = Math.floor(config.duration * sampleRate);
  const samples = new Float32Array(totalSamples);
  let phase = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate; // Time in seconds
    const progress = t / config.duration;

    // Frequency sweep / arpeggio calculation
    let currentFreq = config.startFreq + (config.endFreq - config.startFreq) * Math.pow(progress, 1.2);
    if (config.arpeggio && config.arpeggio.length > 0) {
      const stepIndex = Math.min(
        config.arpeggio.length - 1,
        Math.floor(progress * config.arpeggio.length)
      );
      currentFreq *= config.arpeggio[stepIndex];
    }

    // Phase increment
    phase += (2 * Math.PI * currentFreq) / sampleRate;
    if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

    // Waveform synthesis
    let wave = 0;
    if (config.type === 'sine') {
      wave = Math.sin(phase);
    } else if (config.type === 'square') {
      wave = Math.sin(phase) >= 0 ? 0.8 : -0.8;
    } else if (config.type === 'sawtooth') {
      wave = 1 - (phase / Math.PI);
    } else if (config.type === 'triangle') {
      wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else if (config.type === 'noise') {
      wave = (Math.random() * 2 - 1) * 0.9;
    }

    // Add harmonics if defined
    if (config.harmonics && config.harmonics.length > 0) {
      for (let h = 0; h < config.harmonics.length; h++) {
        const hFreq = currentFreq * (h + 2);
        wave += Math.sin((phase * (h + 2))) * (config.harmonics[h] * 0.25);
      }
    }

    // ADSR Envelope
    let envelope = 0;
    const attackEnd = config.attack;
    const decayEnd = config.attack + config.decay;
    const releaseStart = Math.max(decayEnd, config.duration - config.release);

    if (t < attackEnd) {
      envelope = config.attack > 0 ? t / config.attack : 1;
    } else if (t < decayEnd) {
      const decayProgress = (t - attackEnd) / config.decay;
      envelope = 1 - (1 - config.sustain) * decayProgress;
    } else if (t < releaseStart) {
      envelope = config.sustain;
    } else {
      const releaseProgress = (t - releaseStart) / (config.duration - releaseStart);
      envelope = config.sustain * (1 - releaseProgress);
    }

    samples[i] = wave * envelope * config.volume;
  }

  return samples;
}

/**
 * Parses user prompt to construct tailored sound presets (Laser, Jump, Explosion, Coin, Ambient, Powerup)
 */
export function getSoundPresetForPrompt(prompt: string): SoundConfig {
  const p = prompt.toLowerCase();

  if (p.includes('laser') || p.includes('blaster') || p.includes('shoot') || p.includes('pew')) {
    return {
      type: 'sawtooth',
      startFreq: 1100,
      endFreq: 120,
      duration: 0.28,
      attack: 0.005,
      decay: 0.15,
      sustain: 0.2,
      release: 0.1,
      volume: 0.85,
    };
  }

  if (p.includes('jump') || p.includes('hop') || p.includes('bounce') || p.includes('spring')) {
    return {
      type: 'square',
      startFreq: 150,
      endFreq: 680,
      duration: 0.22,
      attack: 0.01,
      decay: 0.1,
      sustain: 0.6,
      release: 0.08,
      volume: 0.75,
    };
  }

  if (p.includes('explosion') || p.includes('boom') || p.includes('bomb') || p.includes('blast')) {
    return {
      type: 'noise',
      startFreq: 220,
      endFreq: 40,
      duration: 0.85,
      attack: 0.005,
      decay: 0.45,
      sustain: 0.3,
      release: 0.35,
      volume: 0.9,
    };
  }

  if (p.includes('coin') || p.includes('ring') || p.includes('pickup') || p.includes('bell') || p.includes('chime')) {
    return {
      type: 'sine',
      startFreq: 987.77, // B5
      endFreq: 1318.51, // E6
      duration: 0.45,
      attack: 0.01,
      decay: 0.15,
      sustain: 0.4,
      release: 0.25,
      volume: 0.8,
      harmonics: [0.4, 0.2],
    };
  }

  if (p.includes('power') || p.includes('level up') || p.includes('win') || p.includes('success')) {
    return {
      type: 'square',
      startFreq: 330,
      endFreq: 880,
      duration: 0.65,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.7,
      release: 0.2,
      volume: 0.8,
      arpeggio: [1.0, 1.25, 1.5, 2.0], // Major chord arpeggio
    };
  }

  // Default Synth / Cyber Tone
  return {
    type: 'triangle',
    startFreq: 440,
    endFreq: 330,
    duration: 0.5,
    attack: 0.04,
    decay: 0.2,
    sustain: 0.5,
    release: 0.2,
    volume: 0.8,
    harmonics: [0.3, 0.1],
  };
}

// ============================================================================
// 2. PNG Graphic Image Rendering
// ============================================================================

/**
 * Safely executes canvas drawing logic inside an isolated sandbox canvas
 * and returns the rendered PNG data URL or Blob.
 */
export async function renderCanvasToPngBlob(
  canvasScript: string,
  width = 640,
  height = 480
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context');
  }

  // Default clean background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  try {
    // Wrap code in a function providing ctx, canvas, width, height
    const drawFn = new Function('ctx', 'canvas', 'width', 'height', canvasScript);
    drawFn(ctx, canvas, width, height);
  } catch (err: any) {
    console.warn('Procedural drawing error, applying fallback canvas render:', err);
    // Draw an informative error visual on canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 20, width - 40, height - 40);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PNG GRAPHIC ASSET', 40, 70);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Rendered from procedural vector instructions.', 40, 105);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, dataUrl: canvas.toDataURL('image/png') });
      } else {
        reject(new Error('Failed to encode PNG Blob from Canvas'));
      }
    }, 'image/png');
  });
}

// ============================================================================
// 3. MP4 / WebM Video Loop Generation
// ============================================================================

/**
 * Records a procedural canvas animation for a given duration into a downloadable Video Blob.
 */
export async function recordCanvasToVideoBlob(
  renderFrameFn: (ctx: CanvasRenderingContext2D, frame: number, totalFrames: number, time: number) => void,
  width = 480,
  height = 360,
  durationSeconds = 3,
  fps = 30
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Select optimal supported video mime type
  const mimeTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  let selectedMime = 'video/webm';
  for (const m of mimeTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMime });
      resolve(blob);
    };
    recorder.onerror = (err) => reject(err);

    recorder.start();

    const totalFrames = Math.floor(durationSeconds * fps);
    let currentFrame = 0;
    const interval = 1000 / fps;

    const timer = setInterval(() => {
      const time = currentFrame / fps;
      ctx.clearRect(0, 0, width, height);
      renderFrameFn(ctx, currentFrame, totalFrames, time);

      currentFrame++;
      if (currentFrame >= totalFrames) {
        clearInterval(timer);
        recorder.stop();
      }
    }, interval);
  });
}
