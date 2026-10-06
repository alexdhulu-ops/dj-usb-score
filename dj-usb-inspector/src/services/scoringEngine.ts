import { type ScanStats } from './fileScanner';


export type Rank = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface ScoreResult {
  score: number;
  rank: Rank;
  verdict: string;
  details: {
    purityAndDynamics: number;
    hardwareCompat: number;
    extendedCulture: number;
    setEndurance: number;
    driveHygiene: number;
  };
}

const VERDICTS: Record<Rank, string> = {
  'S+': "Prêt pour le closing du Berghain. Tes ancêtres sont fiers de ta bande passante.",
  'S': "Tout-terrain, propre, infatigable. Tu peux monter en cabine les yeux fermés.",
  'A': "Un set propre et efficace, mais un détail invisible t'empêche de toucher la perfection.",
  'B': "La fondation est là, mais ton set repose sur des bases encore instables.",
  'C': "Il y a de l'idée, mais ta bibliothèque manque cruellement de préparation.",
  'D': "Un crime contre le dancefloor. Ta clé USB n'est pas prête pour affronter la nuit.",
};

export function calculateScore(stats: ScanStats): ScoreResult {
  let score = 0;

  // Rule 1: Pureté spectrale (15 pts)
  // 15 pts si lossless authentique ou MP3 CBR 320. Malus direct si faux lossless détecté.
  let pureteScore = 15;
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
      pureteScore = Math.round(15 * hqRatio);
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

    if (shortRatio === 1 || extendedRatio === 0) {
      cultureScore = 0; // Saturé de pistes courtes ou aucune piste extended
    } else if (extendedRatio >= 0.7) {
      cultureScore = 20;
    } else if (extendedRatio >= 0.5) {
      cultureScore = 15;
    } else if (extendedRatio >= 0.3) {
      cultureScore = 10;
    } else if (extendedRatio > 0) {
      cultureScore = 5;
    }
  }
  score += cultureScore;

  // Rule 4: Marathon (20 pts max, progressif)
  const totalHours = stats.totalDurationInSeconds / 3600;
  const totalMinutes = stats.totalDurationInSeconds / 60;
  let marathonScore = 0;
  if (totalHours >= 6) { // 6 hours = 21 600 seconds
    marathonScore = 20;
  } else if (totalHours >= 4) { // 4 hours
    marathonScore = 17;
  } else if (totalHours >= 2) { // 2 hours
    marathonScore = 14;
  } else if (totalHours >= 1) { // 1 hour
    marathonScore = 10;
  } else {
    marathonScore = 5;
  }
  score += marathonScore;

  // Rule 5: Dynamique sonore (10 pts)
  let dynamiqueScore = 0;

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

  // Rule 6: Hygiène & Parasites (15 pts)
  let hygieneScore = 15;
  hygieneScore -= stats.parasiteFilesCount * 4;
  hygieneScore -= stats.ripKeywordsCount * 5;
  let duplicatePenalty = 0;
  if (stats.duplicateCount >= 1 && stats.duplicateCount <= 2) duplicatePenalty = 3;
  else if (stats.duplicateCount >= 3) duplicatePenalty = 8;
  hygieneScore -= duplicatePenalty;

  hygieneScore = Math.max(0, hygieneScore);
  score += hygieneScore;

  // Rule 7: Bonus Daft Punk (5 pts)
  let daftPunkScore = 0;
  if (stats.hasDaftPunk) {
    daftPunkScore = 5;
  }
  score += daftPunkScore;

  // Ensure base score doesn't exceed 100
  score = Math.min(score, 100);

  // Apply Hard Caps
  const shortTracksRatio = stats.totalTracks > 0 ? stats.shortTracks / stats.totalTracks : 0;

  let maxScore = 100;
  let maxRank: Rank = 'S+';

  if (shortTracksRatio > 0.3) {
    maxScore = Math.min(maxScore, 84);
    if (maxRank === 'S+' || maxRank === 'S') maxRank = 'A';
  }

  if (totalMinutes < 20) { // 20 minutes
    maxScore = Math.min(maxScore, 84);
    if (['S+', 'S', 'A'].includes(maxRank)) maxRank = 'B';
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

  if (['A', 'B', 'C', 'D'].includes(rank)) {
    const ratios: Record<string, number> = {
      AUDIO_PURITY: (pureteScore + dynamiqueScore) / 25,
      HARDWARE_COMPATIBILITY: compatScore / 20,
      EXTENDED_CULTURE: cultureScore / 20,
      ENDURANCE: marathonScore / 20,
      HYGIENE: hygieneScore / 15,
    };

    let minCategory: string | null = null;
    let minRatio = Infinity;

    for (const [category, ratio] of Object.entries(ratios)) {
      if (ratio <= 0.85) {
        if (category === 'HARDWARE_COMPATIBILITY' && ratio >= 0.75) {
          continue;
        }
        if (ratio < minRatio) {
          minRatio = ratio;
          minCategory = category;
        }
      }
    }

    if (minCategory) {
      let warning = "";
      if (minCategory === 'ENDURANCE') {
        const msgs = [
          "Ta sélection est propre, mais le club ferme à 7h et ton set s'essouffle bien avant le lever du jour.",
          "Belle amorce, mais il va te falloir du carburant pour tenir un vrai marathon de nuit."
        ];
        warning = msgs[Math.floor(Math.random() * msgs.length)];
      } else if (minCategory === 'EXTENDED_CULTURE') {
        const msgs = [
          "Tes transitions vont être courtes : tes morceaux se terminent avant même que le kick suivant ne respire.",
          "Des sélections taillées pour la radio FM plutôt que pour faire transpirer un dancefloor sur la durée."
        ];
        warning = msgs[Math.floor(Math.random() * msgs.length)];
      } else if (minCategory === 'HYGIENE') {
        const msgs = [
          "Fichiers doublés ou intrus égarés : ta clé ressemble plus à un tiroir encombré qu'à une trousse d'outils de club.",
          "L'algorithme a senti des résidus parasites qui n'ont rien à faire sur une table de mixage."
        ];
        warning = msgs[Math.floor(Math.random() * msgs.length)];
      } else if (minCategory === 'AUDIO_PURITY') {
        const msgs = [
          "Gare au sonomètre : certaines fréquences semblent avoir été rabotées ou écrasées au rouleau compresseur.",
          "Tes formes d'onde manquent d'oxygène, le système son va souffrir sur les bas-médiums."
        ];
        warning = msgs[Math.floor(Math.random() * msgs.length)];
      } else if (minCategory === 'HARDWARE_COMPATIBILITY') {
        warning = "Certaines régies à l'ancienne risquent de s'étouffer avec tes choix de codecs.";
      }

      finalVerdict += " " + warning;
    }
  }

  return {
    score,
    rank,
    verdict: finalVerdict,
    details: {
      purityAndDynamics: pureteScore + dynamiqueScore,
      hardwareCompat: compatScore,
      extendedCulture: cultureScore,
      setEndurance: marathonScore,
      driveHygiene: hygieneScore,
    }
  };
}
