import { useEffect, useState } from 'react';
import { type ScoreResult } from '../services/scoringEngine';
import { PixelCard } from './ui/PixelCard';
import { PixelButton } from './ui/PixelButton';
import { RankBadge } from './RankBadge';

interface ResultCardProps {
  result: ScoreResult;
  onReset: () => void;
}

export function ResultCard({ result, onReset }: ResultCardProps) {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = result.score;
    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayedScore(end);
        clearInterval(timer);
      } else {
        setDisplayedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [result.score]);

  const handleShare = () => {
    // A simple share feature
    const text = `I got rank ${result.rank} (${result.score}/100) on Vibe Check: Drive Analysis!`;
    navigator.clipboard.writeText(text).then(() => {
      alert("Score copied to clipboard!");
    });
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S+': return 'text-dj-gold shadow-[0_0_15px_#ffd700]';
      case 'S': return 'text-dj-cyan shadow-[0_0_15px_#00ffff]';
      case 'A': return 'text-[#ffd700] shadow-[0_0_10px_#ffd700]';
      case 'B': return 'text-[#b87333] shadow-[0_0_10px_#b87333]';
      case 'C': return 'text-gray-500 shadow-none';
      case 'D': return 'text-dj-red shadow-[0_0_10px_#ff0055]';
      default: return 'text-gray-500 shadow-none';
    }
  };

  // Generate a random-looking hex string for the checksum
  const [checksum] = useState(() => Math.random().toString(16).substring(2, 10).toUpperCase());
  const [dateStr] = useState(() => new Date().toISOString().replace('T', ' ').substring(0, 19));

  return (
    <div className="w-full max-w-2xl mx-auto p-4 animate-in fade-in zoom-in duration-500 pixelated">
      <PixelCard className="flex flex-col items-center p-8 space-y-8 bg-[#111] border-dj-dark" variant="default">
        {/* Header */}
        <div className="w-full text-center border-b-2 border-[#333] pb-4 mb-2">
          <h2 className="text-dj-orange font-press-start text-xl leading-relaxed tracking-wider">
            VIBE CHECK :<br/>DRIVE ANALYSIS REPORT
          </h2>
        </div>

        {/* Score and Rank */}
        <div className="flex flex-col md:flex-row items-center justify-between w-full px-4 gap-8">
          <div className="flex flex-col items-center">
            <h3 className="text-gray-500 font-press-start text-xs mb-4">SCORE</h3>
            <div className="flex items-end space-x-1">
              <span className={`text-5xl font-press-start ${getRankColor(result.rank)}`}>
                {displayedScore}
              </span>
              <span className="text-xl text-gray-500 font-press-start mb-1">/100</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-gray-500 font-press-start text-xs mb-4">RANK</h3>
            <RankBadge rank={result.rank} className="scale-75 md:scale-100 origin-center" />
          </div>
        </div>

        {/* Verdict Box */}
        <div className="w-full border-4 border-white p-6 bg-blue-900/20 relative mt-4">
          {/* RPG-style corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 bg-white" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-white" />
          <div className="absolute bottom-0 left-0 w-2 h-2 bg-white" />
          <div className="absolute bottom-0 right-0 w-2 h-2 bg-white" />

          <p className="text-xl text-white font-vt323 leading-relaxed tracking-wide">
            * {result.verdict}
          </p>
        </div>

        {/* Footer info (Timestamp & Checksum) */}
        <div className="w-full flex justify-between items-center text-gray-500 font-vt323 text-lg border-t-2 border-[#333] pt-4">
          <span>{dateStr}</span>
          <span className="tracking-widest">CHK:{checksum}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full pt-4">
          <PixelButton variant="primary" className="flex-1 text-sm py-4" onClick={handleShare}>
            SHARE REPORT
          </PixelButton>
          <PixelButton variant="danger" className="flex-1 text-sm py-4" onClick={onReset}>
            EJECT DRIVE
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}
