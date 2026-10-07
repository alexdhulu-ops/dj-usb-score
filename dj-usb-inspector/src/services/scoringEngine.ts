import { type ScanStats } from './fileScanner';


export function clampMap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

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

  // Rule 1: Pureté spectrale & Dynamique (25 pts combined)
  // 25 pts based on ratio of bad audio (fake lossless, etc.) among tested tracks
  let pureteScore = 25;
  let badAudioRatio = 0;

  if (stats.testedTracksCount > 0) {
    badAudioRatio = (stats.badAudioCount / stats.testedTracksCount) * 100;

    // Map badAudioRatio (0 to 15%) directly to points (25 to 0)
    pureteScore = clampMap(badAudioRatio, 0, 15, 25, 0);

    // Clipping Penalty
    const clippingRatio = stats.clippingCount / stats.testedTracksCount;
    if (clippingRatio > 0) {
      // Map clippingRatio (0 to 5%) to penalty (0 to 5 pts)
      const penalty = clampMap(clippingRatio, 0, 0.05, 0, 5);
      pureteScore -= penalty;
      pureteScore = Math.max(0, pureteScore);
    }
  }

  pureteScore = Number(pureteScore.toFixed(2));
  score += pureteScore;

  // Rule 2: Compatibilité tout-terrain (20 pts)
  // Priorité AIFF et MP3 CBR 320 (20 pts). WAV = 15 pts. FLAC/ALAC/VBR = 5 à 10 pts.
  let compatScore = 0;
  let exoticRatio = 0;
  if (stats.totalTracks > 0) {
    let totalCompatPts = 0;
    let exoticCount = 0;
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

      if (track.sampleRate && track.sampleRate !== 44100 && track.sampleRate !== 48000) {
        exoticCount++;
      }
    }
    compatScore = totalCompatPts / stats.totalTracks;
    exoticRatio = exoticCount / stats.totalTracks;

    const exoticPenalty = clampMap(exoticRatio, 0.05, 0.20, 0, 4);
    compatScore -= exoticPenalty;
    compatScore = Math.max(0, compatScore);
  }
  compatScore = Number(compatScore.toFixed(2));
  score += compatScore;

  // Rule 3: Culture Extended (20 pts)
  // 20 pts si majorité de morceaux > 4m30. 0 pt si saturé de pistes < 3 min.
  let cultureScore = 0;
  if (stats.totalTracks > 0) {
    const extendedRatio = stats.extendedTracks / stats.totalTracks;
    const shortRatio = stats.shortTracks / stats.totalTracks;

    if (shortRatio === 1 || extendedRatio === 0) {
      cultureScore = 0; // Saturé de pistes courtes ou aucune piste extended
    } else {
      cultureScore = clampMap(extendedRatio, 0, 0.7, 0, 20);
    }
  }
  cultureScore = Number(cultureScore.toFixed(2));
  score += cultureScore;

  // Rule 4: Marathon (20 pts max, progressif)
  // Double condition cumulative : totalUniqueTracks and totalUniqueHours
  const totalHours = stats.totalDurationInSeconds / 3600;
  const totalMinutes = stats.totalDurationInSeconds / 60;
  let marathonScore = 0;

  if (stats.totalTracks > 0) {
    // Both metrics contribute, we take the minimum completion ratio towards the extreme goal
    const trackRatio = stats.totalTracks / 550;
    const hourRatio = totalHours / 55;
    const marathonRatio = Math.min(trackRatio, hourRatio);

    marathonScore = clampMap(marathonRatio, 0, 1, 0, 20);
  }

  marathonScore = Number(marathonScore.toFixed(2));
  score += marathonScore;

  // Rule 5: Dynamique sonore (Merged with Rule 1)
  let dynamiqueScore = 0;
  score += dynamiqueScore;

  // Rule 6: Hygiène & Parasites (15 pts)
  let hygieneScore = 0;

  // A. Intégrité des Doublons (5 points)
  if (stats.totalTracks > 0) {
    const duplicateRatio = (stats.duplicateCount / stats.totalTracks) * 100;
    hygieneScore += clampMap(duplicateRatio, 0, 6, 5, 0);
  } else {
    hygieneScore += 5; // Default if no tracks
  }

  // B. Absence de Rips sauvages (5 points)
  if (stats.totalTracks > 0) {
    const ripRatio = (stats.ripKeywordsCount / stats.totalTracks) * 100;
    hygieneScore += clampMap(ripRatio, 0, 3, 5, 0);
  } else {
    hygieneScore += 5; // Default
  }

  // C. Absence de Fichiers Parasites non-audio (5 points)
  if (stats.totalFilesFound > 0) {
    const parasiteRatio = (stats.parasiteFilesCount / stats.totalFilesFound) * 100;
    hygieneScore += clampMap(parasiteRatio, 0, 3, 5, 0);
  } else {
    hygieneScore += 5; // Default
  }

  // D. Indice de Diversité
  if (stats.totalTracks > 50) {
    const uniqueArtists = new Set<string>();
    for (const track of stats.metadataList) {
      if (track.artist) {
        uniqueArtists.add(track.artist);
      }
    }
    const varietyRatio = uniqueArtists.size / stats.totalTracks;
    const diversityPenalty = clampMap(varietyRatio, 0.05, 0.1, 3, 0);
    hygieneScore -= diversityPenalty;
  }

  hygieneScore = Number(hygieneScore.toFixed(2));
  score += hygieneScore;

  // Rule 7: Bonus Daft Punk (5 pts)
  // Adjusted: Easter Egg dynamically inflates score without showing in details
  let daftPunkScore = 0;
  if (stats.hasDaftPunk) {
    daftPunkScore = 5;
  }
  score += daftPunkScore;

  // Ensure base score doesn't exceed 100
  score = Math.min(score, 100);
  score = Number(score.toFixed(2));

  // Apply Hard Caps
  const shortTracksRatio = stats.totalTracks > 0 ? stats.shortTracks / stats.totalTracks : 0;

  let maxScore = 100;
  let maxRank: Rank = 'S+';

  if (shortTracksRatio > 0.3) {
    maxScore = Math.min(maxScore, 84.99);
    if (maxRank === 'S+' || maxRank === 'S') maxRank = 'A';
  }

  if (totalMinutes < 20) { // 20 minutes
    maxScore = Math.min(maxScore, 84.99);
    if (['S+', 'S', 'A'].includes(maxRank)) maxRank = 'B';
  }

  if (badAudioRatio > 15) {
    maxScore = Math.min(maxScore, 74.99);
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

  console.log("=== VIBE CHECK AUDIT ===", {
    totalFilesFound: stats.totalFilesFound,
    duplicatesDetected: stats.duplicateCount,
    uniqueAudioTracks: stats.totalTracks,
    totalUniqueHours: totalHours.toFixed(2),
    enduranceScoreAwarded: marathonScore
  });

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
        if (stats.clippingCount > 0) {
          warning = "Certaines crêtes saturent dans le rouge : gare à la distorsion sur le système son du club.";
        } else {
          const msgs = [
            "Gare au sonomètre : certaines fréquences semblent avoir été rabotées ou écrasées au rouleau compresseur.",
            "Tes formes d'onde manquent d'oxygène, le système son va souffrir sur les bas-médiums."
          ];
          warning = msgs[Math.floor(Math.random() * msgs.length)];
        }
      } else if (minCategory === 'HARDWARE_COMPATIBILITY') {
        if (exoticRatio > 0.05) {
          warning = "Des taux d'échantillonnage trop lourds risquent de faire tousser les processeurs de vieilles platines.";
        } else {
          warning = "Certaines régies à l'ancienne risquent de s'étouffer avec tes choix de codecs.";
        }
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
