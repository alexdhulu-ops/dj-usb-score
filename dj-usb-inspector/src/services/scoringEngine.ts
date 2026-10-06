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

  // Rule 1: Pureté spectrale (25 pts)
  // 25 pts si lossless authentique ou MP3 CBR 320. Malus direct si faux lossless détecté.
  let pureteScore = 25;
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
      pureteScore = Math.round(25 * hqRatio);
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

  // Rule 4: Marathon 8h (15 pts)
  // 15 pts si durée cumulée >= 8h (480 minutes). Dégressif proportionnellement si durée < 8h.
  const totalMinutes = stats.totalDurationMs / (1000 * 60);
  let marathonScore = 0;
  if (totalMinutes >= 480) {
    marathonScore = 15;
  } else {
    marathonScore = Math.round((totalMinutes / 480) * 15);
  }
  score += marathonScore;

  // Rule 5: Dynamique sonore (10 pts)
  let dynamiqueScore = 0;
  let hasCrushedSound = false;
  if (stats.totalTracks > 0) {
    let dynTotal = 0;
    let trackWithDynCount = 0;
    for (const track of stats.metadataList) {
      if (track.crestFactor !== undefined && track.peak !== undefined) {
        trackWithDynCount++;
        let trackDynScore = 0;

        if (track.crestFactor >= 8 && track.crestFactor <= 14) {
          trackDynScore += 10;
        } else if (track.crestFactor < 6) {
          trackDynScore += 0;
          hasCrushedSound = true;
        } else {
          trackDynScore += 5; // proportional for 6-8 or >14
        }

        if (track.peak < 0.5) { // < -6 dBFS
          trackDynScore -= 5;
        }

        dynTotal += Math.max(0, trackDynScore);
      }
    }

    if (trackWithDynCount > 0) {
      dynamiqueScore = Math.round(dynTotal / trackWithDynCount);
    } else {
      dynamiqueScore = 10; // Default to full points if no dynamic info could be extracted (e.g. all decoding failed)
    }
  }
  score += dynamiqueScore;

  // Rule 6: Hygiène & Parasites (10 pts)
  let hygieneScore = 10;
  hygieneScore -= Math.min(15, stats.parasiteFilesCount * 3);
  hygieneScore -= Math.min(20, stats.ripKeywordsCount * 5);
  hygieneScore = Math.max(0, hygieneScore); // base de 10 max
  score += hygieneScore;

  // Rule 7: Bonus Daft Punk (10 pts)
  let daftPunkScore = 0;
  if (stats.hasDaftPunk) {
    daftPunkScore = 10;
  }
  score += daftPunkScore;

  // Ensure base score doesn't exceed 100
  score = Math.min(score, 100);

  // Rule 8: Pénalité Doublons
  let duplicatePenalty = 0;
  if (stats.duplicateCount >= 1 && stats.duplicateCount <= 2) duplicatePenalty = 2;
  else if (stats.duplicateCount >= 3 && stats.duplicateCount <= 5) duplicatePenalty = 6;
  else if (stats.duplicateCount > 5) duplicatePenalty = 12;
  score = Math.max(0, score - duplicatePenalty);

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

  let finalVerdict = VERDICTS[rank];

  const additionalFeedbacks: string[] = [];
  if (stats.parasiteFilesCount > 0) {
    additionalFeedbacks.push("Une clé USB n'est pas un dossier administratif. Fais du tri.");
  }
  if (stats.ripKeywordsCount > 0) {
    additionalFeedbacks.push("L'odeur du convertisseur YouTube à 3h du matin a alerté le système.");
  }
  if (hasCrushedSound) {
    additionalFeedbacks.push("Tes formes d'onde ressemblent à des briques de béton. Laisse respirer tes kicks.");
  }
  if (stats.duplicateCount >= 3) {
    additionalFeedbacks.push("La mémoire flanche : certains morceaux jouent les passe-murailles en double exemplaire.");
  }

  if (additionalFeedbacks.length > 0) {
    // Pick a random feedback to append
    const randomFeedback = additionalFeedbacks[Math.floor(Math.random() * additionalFeedbacks.length)];
    finalVerdict += " " + randomFeedback;
  }

  return {
    score,
    rank,
    verdict: finalVerdict,
  };
}
