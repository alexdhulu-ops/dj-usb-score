import { type ScanStats } from './fileScanner';


export type Rank = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface ScoreResult {
  score: number;
  rank: Rank;
  verdict: string;
}

const VERDICTS: Record<Rank, string> = {
  'S+': "Prêt pour le closing du Berghain. Tes ancêtres sont fiers de ta bande passante.",
  'S': "Tout-terrain, propre, infatigable. Tu peux monter en cabine les yeux fermés.",
  'A': "Un set propre et efficace, mais un détail invisible t'empêche de toucher la perfection.",
  'B': "Ça passe en boîte, mais certaines platines vont cracher sur tes choix.",
  'C': "Des raccourcis suspects et un manque criant de souffle. Revois tes classiques.",
  'D': "Un crime contre le dancefloor. Tes fichiers pleurent et ton set s'arrête avant minuit.",
};

export function calculateScore(stats: ScanStats): ScoreResult {
  let score = 0;

  // Rule 1: Pureté spectrale (30 pts)
  // 30 pts si lossless authentique ou MP3 CBR 320. Malus direct si faux lossless détecté.
  let pureteScore = 30;
  if (stats.hasFakeLossless) {
    pureteScore = 0; // Malus direct
  } else {
    // Check if majority of tracks are high quality
    let highQualityCount = 0;
    for (const track of stats.metadataList) {
      if (['wav', 'aiff', 'aif', 'flac', 'alac'].includes(track.extension)) {
        highQualityCount++;
      } else if (track.extension === 'mp3' && track.bitrate && track.bitrate >= 320000) {
        // Technically we can't easily detect CBR vs VBR reliably just from metadata in all cases without full parsing,
        // but bitrate >= 320k usually indicates 320kbps CBR.
        highQualityCount++;
      }
    }

    if (stats.totalTracks > 0) {
      const hqRatio = highQualityCount / stats.totalTracks;
      pureteScore = Math.round(30 * hqRatio);
    } else {
      pureteScore = 0;
    }
  }
  score += pureteScore;

  // Rule 2: Compatibilité tout-terrain (20 pts)
  // Priorité AIFF et MP3 CBR 320 (20 pts). WAV = 15 pts. FLAC/ALAC/VBR = 5 à 10 pts.
  let compatScore = 0;
  if (stats.totalTracks > 0) {
    let totalCompatPts = 0;
    for (const track of stats.metadataList) {
      if (['aiff', 'aif'].includes(track.extension)) {
        totalCompatPts += 20;
      } else if (track.extension === 'mp3' && track.bitrate && track.bitrate >= 320000) {
        totalCompatPts += 20;
      } else if (track.extension === 'wav') {
        totalCompatPts += 15;
      } else if (['flac', 'alac'].includes(track.extension)) {
        totalCompatPts += 10;
      } else if (track.extension === 'mp3') {
        totalCompatPts += 5; // Assumed lower bitrate or VBR
      } else {
        totalCompatPts += 0;
      }
    }
    compatScore = Math.round(totalCompatPts / stats.totalTracks);
  }
  score += compatScore;

  // Rule 3: Culture Extended (20 pts)
  // 20 pts si majorité de morceaux > 4m30. 0 pt si saturé de pistes < 3 min.
  let cultureScore = 0;
  if (stats.totalTracks > 0) {
    const extendedRatio = stats.extendedTracks / stats.totalTracks;
    const shortRatio = stats.shortTracks / stats.totalTracks;

    if (shortRatio > 0.5) {
      cultureScore = 0; // Saturé de pistes courtes
    } else {
      // 20 pts si la majorité (>= 50%) sont extended. Sinon proportionnel.
      if (extendedRatio >= 0.5) {
        cultureScore = 20;
      } else {
        cultureScore = Math.round((extendedRatio / 0.5) * 20);
      }
    }
  }
  score += cultureScore;

  // Rule 4: Marathon 8h (20 pts)
  // 20 pts si durée cumulée >= 8h (480 minutes). Dégressif proportionnellement si durée < 8h.
  const totalMinutes = stats.totalDurationMs / (1000 * 60);
  let marathonScore = 0;
  if (totalMinutes >= 480) {
    marathonScore = 20;
  } else {
    marathonScore = Math.round((totalMinutes / 480) * 20);
  }
  score += marathonScore;

  // Rule 5: Bonus Daft Punk (10 pts)
  let daftPunkScore = 0;
  if (stats.hasDaftPunk) {
    daftPunkScore = 10;
  }
  score += daftPunkScore;

  // Ensure base score doesn't exceed 100
  score = Math.min(score, 100);

  // Apply Hard Caps
  const shortTracksRatio = stats.totalTracks > 0 ? stats.shortTracks / stats.totalTracks : 0;

  let maxScore = 100;
  let maxRank: Rank = 'S+';

  if (!stats.hasDaftPunk) {
    maxScore = Math.min(maxScore, 94);
    maxRank = 'S';
  }

  if (shortTracksRatio > 0.3) {
    maxScore = Math.min(maxScore, 84);
    if (maxRank === 'S+' || maxRank === 'S') maxRank = 'A';
  }

  if (totalMinutes < 240) { // 4 hours
    maxScore = Math.min(maxScore, 59);
    if (['S+', 'S', 'A', 'B'].includes(maxRank)) maxRank = 'C';
  }

  if (stats.hasFakeLossless) {
    maxScore = Math.min(maxScore, 74);
    if (['S+', 'S', 'A'].includes(maxRank)) maxRank = 'B';
  }

  // Apply cap
  score = Math.min(score, maxScore);

  // Determine Rank based on final score
  let rank: Rank = 'D';
  if (score >= 95) rank = 'S+';
  else if (score >= 85) rank = 'S';
  else if (score >= 75) rank = 'A';
  else if (score >= 60) rank = 'B';
  else if (score >= 45) rank = 'C';
  else rank = 'D';

  // Ensure rank does not exceed maxRank determined by caps
  const rankValues: Record<Rank, number> = { 'S+': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
  if (rankValues[rank] > rankValues[maxRank]) {
    rank = maxRank;
  }

  return {
    score,
    rank,
    verdict: VERDICTS[rank],
  };
}
