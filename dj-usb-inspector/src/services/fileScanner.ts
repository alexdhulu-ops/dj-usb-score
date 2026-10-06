import { parseAudioFile, type AudioMetadata } from './audioAnalysis';

export interface ScanStats {
  totalDurationMs: number;
  formatDistribution: Record<string, number>;
  totalTracks: number;
  shortTracks: number; // < 3 mins
  extendedTracks: number; // 4:30 - 15:00
  hasDaftPunk: boolean;
  hasFakeLossless: boolean;
  metadataList: AudioMetadata[];
  parasiteFilesCount: number;
  ripKeywordsCount: number;
  duplicateCount: number;
  filesForTree: { path: string; isAudio: boolean; isParasite: boolean; isRip: boolean; metadata?: AudioMetadata }[];
  folderRanks: Record<string, string>;
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
    duplicateCount: 0,
    filesForTree: [],
    folderRanks: {},
  };

  const audioFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toLowerCase();

    let isParasite = false;
    let isAudio = false;

    if (ext && PARASITE_EXTENSIONS.includes(ext)) {
      stats.parasiteFilesCount++;
      isParasite = true;
    }

    if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
      audioFiles.push(file);
      isAudio = true;
    }

    stats.filesForTree.push({
      path: file.webkitRelativePath || file.name,
      isAudio,
      isParasite,
      isRip: false,
    });
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

      const titleSearchString = `${metadata.title || ''}`.toLowerCase();
      const filenameSearchString = `${file.webkitRelativePath || file.name}`.toLowerCase();
      const clubKeywords = ['(extended mix)', '(original mix)', '(club mix)', '(club version)', '(12" mix)', '(dub mix)'];
      const hasClubKeyword = clubKeywords.some(keyword => titleSearchString.includes(keyword) || filenameSearchString.includes(keyword));

      if (durationSec > 0 && durationSec < 180) { // < 3 mins
        stats.shortTracks++;
      } else if ((durationSec >= 270 && durationSec <= 900) || hasClubKeyword) { // 4:30 - 15:00
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
        // Find tree entry and update
        const treeEntry = stats.filesForTree.find(f => f.path === fullPath);
        if (treeEntry) treeEntry.isRip = true;
      }
      const treeEntry = stats.filesForTree.find(f => f.path === fullPath);
      if (treeEntry) treeEntry.metadata = metadata;

    } catch (e) {
      console.warn(`Error scanning file ${file.name}`, e);
    }
  }

  let duplicates = 0;
  const seenBinaries = new Set<string>();
  const seenMetadata = new Map<string, number>();

  for (const meta of stats.metadataList) {
    const duration = meta.duration || 0;
    let isDuplicate = false;

    if (meta.fileSize !== undefined) {
      const binKey = `${meta.fileSize}_${Math.round(duration)}`;
      if (seenBinaries.has(binKey)) {
        duplicates++;
        isDuplicate = true;
      } else {
        seenBinaries.add(binKey);
      }
    }

    if (!isDuplicate && meta.artist && meta.title) {
      const normArtist = meta.artist.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTitle = meta.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const metaKey = `${normArtist}_${normTitle}`;

      if (seenMetadata.has(metaKey)) {
        const prevDuration = seenMetadata.get(metaKey)!;
        if (Math.abs(duration - prevDuration) <= 2) {
          duplicates++;
          isDuplicate = true;
        }
      }
      if (!isDuplicate) {
        seenMetadata.set(metaKey, duration);
      }
    }
  }
  stats.duplicateCount = duplicates;


  // Calculate folder ranks
  const folders: Record<string, { audioCount: number, losslessCbrCount: number, parasiteCount: number, ripCount: number, shortCount: number, extendedCount: number }> = {};

  for (const file of stats.filesForTree) {
    const parts = file.path.split('/');
    // For each folder in the path (excluding the file itself if it's the last part)
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/');
      if (!folders[folderPath]) {
        folders[folderPath] = { audioCount: 0, losslessCbrCount: 0, parasiteCount: 0, ripCount: 0, shortCount: 0, extendedCount: 0 };
      }

      if (file.isParasite) folders[folderPath].parasiteCount++;
      if (file.isRip) folders[folderPath].ripCount++;

      if (file.isAudio && file.metadata) {
        folders[folderPath].audioCount++;
        const ext = file.metadata.extension;
        if (['wav', 'aiff', 'aif', 'flac', 'alac'].includes(ext)) {
          folders[folderPath].losslessCbrCount++;
        } else if (ext === 'mp3' && file.metadata.bitrate && file.metadata.bitrate >= 320000) {
          folders[folderPath].losslessCbrCount++;
        }

        const duration = file.metadata.duration || 0;
        const titleSearchString = `${file.metadata.title || ''}`.toLowerCase();
        const filenameSearchString = `${file.path}`.toLowerCase();
        const clubKeywords = ['(extended mix)', '(original mix)', '(club mix)', '(club version)', '(12" mix)', '(dub mix)'];
        const hasClubKeyword = clubKeywords.some(keyword => titleSearchString.includes(keyword) || filenameSearchString.includes(keyword));
        if (duration > 0 && duration < 180) folders[folderPath].shortCount++;
        else if ((duration >= 270 && duration <= 900) || hasClubKeyword) folders[folderPath].extendedCount++;
      }
    }
  }

  for (const [folderPath, data] of Object.entries(folders)) {
    if (data.audioCount > 0) {
      let score = 0;

      // Purity (40 pts max)
      score += Math.round(40 * (data.losslessCbrCount / data.audioCount));

      // Hygiene (30 pts max)
      let hygiene = 30 - (data.parasiteCount * 10) - (data.ripCount * 10);
      score += Math.max(0, hygiene);

      // Duration (30 pts max)
      const shortRatio = data.shortCount / data.audioCount;
      const extendedRatio = data.extendedCount / data.audioCount;
      if (shortRatio > 0.5) {
        score += 0;
      } else {
        if (extendedRatio >= 0.5) score += 30;
        else score += Math.round((extendedRatio / 0.5) * 30);
      }

      score = Math.min(score, 100);

      let rank = 'D';
      if (score >= 95) rank = 'S+';
      else if (score >= 85) rank = 'S';
      else if (score >= 75) rank = 'A';
      else if (score >= 60) rank = 'B';
      else if (score >= 45) rank = 'C';
      else rank = 'D';

      stats.folderRanks[folderPath] = rank;
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return stats;
}
