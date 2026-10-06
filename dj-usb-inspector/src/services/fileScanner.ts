import { parseAudioFile, type AudioMetadata } from './audioAnalysis';

export interface ScanStats {
  totalDurationMs: number;
  formatDistribution: Record<string, number>;
  totalTracks: number;
  shortTracks: number; // < 3 mins
  extendedTracks: number; // 4:30 - 9:00
  hasDaftPunk: boolean;
  hasFakeLossless: boolean;
  metadataList: AudioMetadata[];
  parasiteFilesCount: number;
  ripKeywordsCount: number;
}

const SUPPORTED_EXTENSIONS = ['mp3', 'wav', 'aiff', 'aif', 'flac', 'alac', 'm4a', 'aac', 'ogg'];

const PARASITE_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'exe', 'dmg', 'zip', 'rar', 'apk', 'iso'];
const RIP_KEYWORDS = ['y2mate', 'yt1s', 'official video', 'official audio', 'clip officiel', 'free download'];

const DAFT_PUNK_KEYWORDS = [
  'daft punk',
  'stardust',
  'thomas bangalter',
  'guy-manuel'
];

function isDaftPunk(metadata: AudioMetadata): boolean {
  const searchString = `${metadata.artist || ''} ${metadata.composer || ''} ${metadata.title || ''}`.toLowerCase();
  return DAFT_PUNK_KEYWORDS.some(keyword => searchString.includes(keyword));
}

export async function scanFiles(files: File[], onProgress?: (progress: number) => void): Promise<ScanStats> {
  const stats: ScanStats = {
    totalDurationMs: 0,
    formatDistribution: {},
    totalTracks: 0,
    shortTracks: 0,
    extendedTracks: 0,
    hasDaftPunk: false,
    hasFakeLossless: false,
    metadataList: [],
    parasiteFilesCount: 0,
    ripKeywordsCount: 0,
  };

  const audioFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext && PARASITE_EXTENSIONS.includes(ext)) {
      stats.parasiteFilesCount++;
    }

    if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
      audioFiles.push(file);
    }
  }

  stats.totalTracks = audioFiles.length;

  for (let i = 0; i < audioFiles.length; i++) {
    const file = audioFiles[i];

    if (onProgress) {
      onProgress(Math.round((i / audioFiles.length) * 100));
    }

    try {
      const metadata = await parseAudioFile(file);
      stats.metadataList.push(metadata);

      // Duration (in seconds from metadata)
      const durationSec = metadata.duration || 0;
      stats.totalDurationMs += durationSec * 1000;

      if (durationSec > 0 && durationSec < 180) { // < 3 mins
        stats.shortTracks++;
      } else if (durationSec >= 270 && durationSec <= 540) { // 4:30 - 9:00
        stats.extendedTracks++;
      }

      // Formatting
      const ext = metadata.extension;
      stats.formatDistribution[ext] = (stats.formatDistribution[ext] || 0) + 1;

      // Fake lossless
      if (metadata.isFakeLossless) {
        stats.hasFakeLossless = true;
      }

      // Daft Punk Easter Egg
      if (!stats.hasDaftPunk && isDaftPunk(metadata)) {
        stats.hasDaftPunk = true;
      }

      // Check for RIP keywords in file name, path, and metadata
      const fullPath = file.webkitRelativePath || file.name;
      const searchableText = `${fullPath} ${metadata.artist || ''} ${metadata.title || ''}`.toLowerCase();

      const hasRipKeyword = RIP_KEYWORDS.some(keyword => searchableText.includes(keyword));
      if (hasRipKeyword) {
        stats.ripKeywordsCount++;
      }

    } catch (e) {
      console.warn(`Error scanning file ${file.name}`, e);
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return stats;
}
