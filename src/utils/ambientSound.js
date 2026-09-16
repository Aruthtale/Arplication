/**
 * Ambient sound player untuk focus session (offline white noise)
 * Menggunakan Web Audio API untuk generate pink/brown noise
 */

let audioContext = null;
let noiseNode = null;
let gainNode = null;
let isPlaying = false;

const NOISE_TYPES = {
  pink: { label: 'Pink Noise', color: '#FF70A6' },
  brown: { label: 'Brown Noise', color: '#8B4513' },
  white: { label: 'White Noise', color: '#FFFFFF' },
};

export function getNoiseTypes() {
  return NOISE_TYPES;
}

function createNoiseBuffer(type, duration = 2) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  
  const ctx = new Ctx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  
  if (type === 'white') {
    // White noise: random values
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'pink') {
    // Pink noise: 1/f spectrum (simplified)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // Adjust volume
      b6 = white * 0.115926;
    }
  } else if (type === 'brown') {
    // Brown noise: integral of white noise
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (last + (0.02 * white)) / 1.02;
      last = output[i];
      output[i] *= 3.5; // Adjust volume
    }
  }
  
  return buffer;
}

export function startAmbientSound(type = 'pink', volume = 0.3) {
  try {
    if (isPlaying) stopAmbientSound();
    
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    
    audioContext = new Ctx();
    const buffer = createNoiseBuffer(type, 2);
    if (!buffer) return false;
    
    // Loop noise buffer
    noiseNode = audioContext.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;
    
    // Volume control
    gainNode = audioContext.createGain();
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    
    noiseNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
    noiseNode.start(0);
    
    isPlaying = true;
    return true;
  } catch (e) {
    console.warn('Failed to start ambient sound:', e);
    return false;
  }
}

export function stopAmbientSound() {
  try {
    if (noiseNode) {
      noiseNode.stop();
      noiseNode.disconnect();
      noiseNode = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    isPlaying = false;
  } catch (e) {
    console.warn('Failed to stop ambient sound:', e);
  }
}

export function setAmbientVolume(volume) {
  if (gainNode) {
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }
}

export function isAmbientPlaying() {
  return isPlaying;
}