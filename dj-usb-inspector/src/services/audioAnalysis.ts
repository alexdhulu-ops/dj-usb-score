import * as mm from 'music-metadata-browser';

export interface AudioMetadata {
  artist?: string;
  title?: string;
  composer?: string;
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
  codec?: string;
  container?: string;
  isFakeLossless: boolean;
  extension: string;
}

export async function parseAudioFile(file: File): Promise<AudioMetadata> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  let metadata: mm.IAudioMetadata | null = null;
  try {
    // Parse metadata using music-metadata-browser
    metadata = await mm.parseBlob(file);
  } catch (err) {
    console.warn(`Failed to parse metadata for ${file.name}`, err);
  }

  let isFakeLossless = false;

  // Check for fake lossless on wav and aiff files
  if (extension === 'wav' || extension === 'aiff') {
    isFakeLossless = await checkFakeLossless(file);
  }

  const format = metadata?.format;
  const common = metadata?.common;

  return {
    artist: common?.artist ? (Array.isArray(common.artist) ? common.artist.join(", ") : common.artist) : undefined,
    title: common?.title,
    composer: common?.composer ? (Array.isArray(common.composer) ? common.composer.join(", ") : common.composer) : undefined,
    duration: format?.duration,
    bitrate: format?.bitrate,
    sampleRate: format?.sampleRate,
    codec: format?.codec,
    container: format?.container,
    isFakeLossless,
    extension,
  };
}

async function checkFakeLossless(file: File): Promise<boolean> {
  try {
    // To avoid loading massive files into memory, we slice the first 5MB
    // This is usually enough for metadata + some audio frames.
    // In actual WAV/AIFF files, PCM data starts early.
    const sliceSize = Math.min(file.size, 5 * 1024 * 1024);
    const chunk = file.slice(0, sliceSize);
    const arrayBuffer = await chunk.arrayBuffer();

    // Create an offline context (we just need to decode, not play)
    // We decode via AudioContext as it works best in browsers.
    // Some browsers have OfflineAudioContext which we can also use,
    // but just decoding is enough.
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Attempt to decode
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // We get the first channel data


    // We only need a small sample of the audio to analyze (e.g., 2048 samples)
    const sampleSize = 2048;
    const sampleRate = audioBuffer.sampleRate;

    // We need to do a fast FFT. Since we are doing it client-side without extra libraries,
    // we can use an AnalyserNode on an OfflineAudioContext to do the heavy lifting for us.
    const offlineCtx = new OfflineAudioContext(1, sampleSize, sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);
    analyser.connect(offlineCtx.destination);

    source.start(0);
    await offlineCtx.startRendering();

    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);

    // Calculate cutoff
    // analyser.frequencyBinCount is fftSize / 2 = 1024
    // Each bin represents (sampleRate / 2) / 1024 Hz.
    // We want to check if there is energy above 16kHz
    const binSize = (sampleRate / 2) / analyser.frequencyBinCount;
    const targetBin = Math.floor(16000 / binSize);

    let hasHighFreqEnergy = false;

    // In Web Audio API, frequencyData is in dB.
    // -100 dB is silence for AnalyserNode.
    // If there's any bin above 16kHz with energy > -80dB, we consider it has high frequencies.
    for (let i = targetBin; i < frequencyData.length; i++) {
      if (frequencyData[i] > -80) {
        hasHighFreqEnergy = true;
        break;
      }
    }

    // If it doesn't have high frequency energy, it's a fake lossless (cutoff < 16kHz)
    return !hasHighFreqEnergy;

  } catch (error) {
    console.error("Error decoding audio chunk for fake lossless check", error);
    // On error, default to false (don't unfairly penalize if we can't parse)
    return false;
  }
}
