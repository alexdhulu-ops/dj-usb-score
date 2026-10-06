import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoringEngine';
import { type ScanStats } from './fileScanner';

describe('Scoring Engine', () => {
  it('Case 1: C rank (short duration, bad formats, fake lossless)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 120 * 60, // 2 hours
      formatDistribution: { mp3: 10 },
      totalTracks: 10,
      shortTracks: 4, // 40%
      extendedTracks: 1,
      hasDaftPunk: false,
      hasFakeLossless: true,
      metadataList: Array(10).fill({
        extension: 'mp3',
        isFakeLossless: false, // Overall fake lossless is true
      }),
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    // Purity: 0 (fake lossless)
    // Compat: 5 * 10 / 10 = 5
    // Culture: extendedRatio = 0.1 -> 5 pts
    // Marathon: 120 >= 120 -> 14
    // Dynamique: 10 (default)
    // Hygiene: 15
    // Total = 49 -> Rank C (>=45)

    const result = calculateScore(stats);
    expect(result.rank).toBe('C');
    expect(result.score).toBe(49);
  });

  it('Case 2: B rank with fake lossless (high score but capped to B)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 600 * 60, // 10 hours
      formatDistribution: { aiff: 100, wav: 10 },
      totalTracks: 110,
      shortTracks: 0,
      extendedTracks: 100,
      hasDaftPunk: true,
      hasFakeLossless: true, // TRIGGERS HARD CAP B
      metadataList: [
        ...Array(100).fill({ extension: 'aiff', isFakeLossless: false }),
        ...Array(10).fill({ extension: 'wav', isFakeLossless: true })
      ],
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('B');
    // base score would be very high: compat ~20, culture=20, marathon=20, daft punk=10. Total 70.
    // wait, pureté = 0 due to fake lossless. So score is 0 + ~20 + 20 + 20 + 10 = ~70.
    // But hard cap is max score 74, max rank B.
    expect(result.score).toBeLessThanOrEqual(74);
  });

  it('Case 3: S+ rank (perfect + Daft Punk)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 500 * 60, // > 8h
      formatDistribution: { aiff: 100 },
      totalTracks: 100,
      shortTracks: 0,
      extendedTracks: 100,
      hasDaftPunk: true,
      hasFakeLossless: false,
      metadataList: Array(100).fill({ extension: 'aiff', isFakeLossless: false }),
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('Case 4: S+ rank (perfect but no Daft Punk - can still reach 95)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 500 * 60, // > 8h
      formatDistribution: { aiff: 100 },
      totalTracks: 100,
      shortTracks: 0,
      extendedTracks: 100,
      hasDaftPunk: false,
      hasFakeLossless: false,
      metadataList: Array(100).fill({ extension: 'aiff', isFakeLossless: false }),
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.score).toBe(100);
  });

  it('Case 5: The Bomb! (Extended track 14:51) should give max culture score', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 891, // 14:51
      formatDistribution: { wav: 1 },
      totalTracks: 1,
      shortTracks: 0,
      extendedTracks: 1, // Will be considered extended!
      hasDaftPunk: false,
      hasFakeLossless: false,
      metadataList: [{ extension: 'wav', isFakeLossless: false, duration: 891 }],
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.details.extendedCulture).toBe(20);
  });
});
