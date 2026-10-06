import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoringEngine';
import { type ScanStats } from './fileScanner';

describe('Scoring Engine', () => {
  it('Case 1: C rank (short duration, bad formats, fake lossless)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationMs: 120 * 60 * 1000, // 2 hours
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
      duplicateCount: 0,
    };

    // Purity: 0 (fake lossless)
    // Compat: 5 * 10 / 10 = 5
    // Culture: proportional: extendedRatio = 0.1 -> (0.1/0.5)*20 = 4
    // Marathon: 120 >= 120 -> 14
    // Dynamique: 10 (default)
    // Hygiene: 15
    // Total = 48 -> Rank C (>=45)

    const result = calculateScore(stats);
    expect(result.rank).toBe('C');
    expect(result.score).toBe(48);
  });

  it('Case 2: B rank with fake lossless (high score but capped to B)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationMs: 600 * 60 * 1000, // 10 hours
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
      duplicateCount: 0,
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
      totalDurationMs: 500 * 60 * 1000, // > 8h
      formatDistribution: { aiff: 100 },
      totalTracks: 100,
      shortTracks: 0,
      extendedTracks: 100,
      hasDaftPunk: true,
      hasFakeLossless: false,
      metadataList: Array(100).fill({ extension: 'aiff', isFakeLossless: false }),
      duplicateCount: 0,
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it('Case 4: S+ rank (perfect but no Daft Punk - can still reach 95)', () => {
    const stats: ScanStats = {
      parasiteFilesCount: 0,
      ripKeywordsCount: 0,
      totalDurationMs: 500 * 60 * 1000, // > 8h
      formatDistribution: { aiff: 100 },
      totalTracks: 100,
      shortTracks: 0,
      extendedTracks: 100,
      hasDaftPunk: false,
      hasFakeLossless: false,
      metadataList: Array(100).fill({ extension: 'aiff', isFakeLossless: false }),
      duplicateCount: 0,
    };

    const result = calculateScore(stats);
    expect(result.rank).toBe('S+');
    expect(result.score).toBe(100);
  });
});
