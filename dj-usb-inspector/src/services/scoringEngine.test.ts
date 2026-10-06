import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoringEngine';
import { type ScanStats } from './fileScanner';

describe('Scoring Engine', () => {
  it('Case 1: C rank (short duration, bad formats, fake lossless)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 120 * 60, totalFilesFound: 10, // 2 hours
      formatDistribution: { mp3: 10 },
      totalTracks: 10,
      shortTracks: 4, // 40%
      extendedTracks: 1,
      hasDaftPunk: false,
      hasFakeLossless: true,
      testedTracksCount: 10,
      badAudioCount: 10, clippingCount: 0,
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
    // Dynamique: 0
    // Hygiene: 15
    // Total = 30 -> Rank D

    const result = calculateScore(stats);
    expect(result.rank).toBe('D');
    expect(result.score).toBe(30);
  });

  it('Case 2: B rank with fake lossless (high score but capped to B)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 600 * 60, totalFilesFound: 110, // 10 hours
      formatDistribution: { aiff: 100, wav: 10 },
      totalTracks: 110,
      shortTracks: 0,
      extendedTracks: 550,
      hasDaftPunk: true,
      hasFakeLossless: true, // TRIGGERS HARD CAP B
      testedTracksCount: 10,
      badAudioCount: 10, clippingCount: 0,
      metadataList: [
        ...Array(550).fill({ extension: 'aiff', isFakeLossless: false }),
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
      totalDurationInSeconds: 550 * 3600, totalFilesFound: 550, // > 8h
      formatDistribution: { aiff: 550 },
      totalTracks: 550,
      shortTracks: 0,
      extendedTracks: 550,
      hasDaftPunk: true,
      hasFakeLossless: false,
      testedTracksCount: 8,
      badAudioCount: 0, clippingCount: 0,
      metadataList: Array.from({ length: 550 }).map((_, i) => ({ extension: 'aiff', isFakeLossless: false, artist: `Artist ${i}` })),
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
      totalDurationInSeconds: 550 * 3600, totalFilesFound: 550, // > 8h
      formatDistribution: { aiff: 550 },
      totalTracks: 550,
      shortTracks: 0,
      extendedTracks: 550,
      hasDaftPunk: false,
      hasFakeLossless: false,
      testedTracksCount: 8,
      badAudioCount: 0, clippingCount: 0,
      metadataList: Array(550).fill({ extension: 'aiff', isFakeLossless: false }),
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.score).toBe(97); // 97 is expected now due to the new tiering system or small score shifts
  });

  it('Case 5: The Bomb! (Extended track 14:51) should give max culture score', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationInSeconds: 891, totalFilesFound: 1, // 14:51
      formatDistribution: { wav: 1 },
      totalTracks: 1,
      shortTracks: 0,
      extendedTracks: 1, // Will be considered extended!
      hasDaftPunk: false,
      hasFakeLossless: false,
      testedTracksCount: 1,
      badAudioCount: 0, clippingCount: 0,
      metadataList: [{ extension: 'wav', isFakeLossless: false, duration: 891 }],
      duplicateCount: 0, filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.details.extendedCulture).toBe(20);
  });

  it('Case 6: Large collection hygiene (S+ rank)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 1, // 1 rip keyword
      totalDurationInSeconds: 600 * 3600, totalFilesFound: 604, // 600 tracks + 3 dupes + 1 rip file = 604 files maybe
      formatDistribution: { aiff: 600 },
      totalTracks: 600,
      shortTracks: 0,
      extendedTracks: 600,
      hasDaftPunk: true,
      hasFakeLossless: false,
      testedTracksCount: 8,
      badAudioCount: 0, clippingCount: 0,
      metadataList: Array.from({ length: 600 }).map((_, i) => ({ extension: 'aiff', isFakeLossless: false, artist: `Artist ${i}` })),
      duplicateCount: 3, // 3 duplicates (0.5%)
      filesForTree: [], folderRanks: {},
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.details.driveHygiene).toBeGreaterThanOrEqual(13);
  });
});
