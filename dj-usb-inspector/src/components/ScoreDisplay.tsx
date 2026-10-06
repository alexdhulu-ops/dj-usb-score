import { useEffect, useState } from 'react';
import { type ScoreResult } from '../services/scoringEngine';
import { RotateCcw } from 'lucide-react';

interface ScoreDisplayProps {
  result: ScoreResult;
  onReset: () => void;
}

export function ScoreDisplay({ result, onReset }: ScoreDisplayProps) {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = result.score;
    const duration = 1500;
    const increment = end / (duration / 16); // 60fps

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

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'S+': return 'text-purple-500 shadow-purple-500/50';
      case 'S': return 'text-dj-green shadow-dj-green/50';
      case 'A': return 'text-blue-500 shadow-blue-500/50';
      case 'B': return 'text-yellow-500 shadow-yellow-500/50';
      case 'C': return 'text-orange-500 shadow-orange-500/50';
      case 'D': return 'text-red-500 shadow-red-500/50';
      default: return 'text-gray-500 shadow-gray-500/50';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
      <div className="bg-dj-gray w-full rounded-xl p-8 border border-white/5 relative overflow-hidden shadow-2xl">
        {/* Abstract background elements */}
        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-10 bg-current ${getRankColor(result.rank).split(' ')[0]}`} />
        <div className={`absolute -left-20 -bottom-20 w-64 h-64 rounded-full blur-3xl opacity-10 bg-current ${getRankColor(result.rank).split(' ')[0]}`} />

        <div className="relative z-10 flex flex-col items-center space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-gray-400 font-mono tracking-widest uppercase text-sm">
              Analyse terminée
            </h2>
            <div className="flex items-end justify-center space-x-2">
              <span className="text-6xl font-bold font-mono text-white">
                {displayedScore}
              </span>
              <span className="text-2xl text-gray-500 font-mono mb-2">/100</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em] mb-4">
              Rang Secret
            </h3>
            <div className={`
              text-8xl font-black italic tracking-tighter
              ${getRankColor(result.rank)}
              drop-shadow-[0_0_20px_rgba(currentColor,0.5)]
              animate-pulse
            `}>
              {result.rank}
            </div>
          </div>

          <div className="bg-dj-dark p-6 rounded-lg border border-white/10 w-full">
            <p className="text-lg text-gray-300 font-mono text-center leading-relaxed">
              "{result.verdict}"
            </p>
          </div>

          <button
            onClick={onReset}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-full font-mono transition-colors border border-white/10 hover:border-white/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Analyser une autre clé</span>
          </button>
        </div>
      </div>
    </div>
  );
}
