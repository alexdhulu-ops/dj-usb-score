import { type Rank } from '../services/scoringEngine';

interface RankBadgeProps {
  rank: Rank;
  className?: string;
}

export function RankBadge({ rank, className = '' }: RankBadgeProps) {
  const renderRankStyle = () => {
    switch (rank) {
      case 'S+':
        return (
          <div className="relative group">
            {/* Holographic aura */}
            <div className="absolute inset-0 bg-gradient-to-tr from-dj-gold via-fuchsia-500 to-dj-cyan opacity-50 blur-md rounded-sm animate-pulse" />
            <div className="relative font-press-start text-8xl text-dj-gold drop-shadow-[0_0_15px_#ffd700] border-4 border-dj-gold bg-dj-dark p-6 overflow-hidden">
              <span className="relative z-10">{rank}</span>
              {/* Shine sweep */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-hidden">
                <div className="w-[150%] h-full bg-white opacity-40 skew-x-[-20deg] animate-shine" style={{ mixBlendMode: 'overlay' }} />
              </div>
              {/* Particles */}
              <div className="absolute top-2 left-2 w-2 h-2 bg-white animate-flicker" />
              <div className="absolute bottom-4 right-4 w-2 h-2 bg-white animate-flicker" style={{ animationDelay: '0.5s' }} />
              <div className="absolute top-6 right-2 w-1 h-1 bg-dj-cyan animate-flicker" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        );
      case 'S':
        return (
          <div className="relative font-press-start text-8xl text-[#e5e4e2] drop-shadow-[0_0_6px_#00ffff] border-4 border-[#e5e4e2] bg-dj-dark p-6 overflow-hidden">
            <span className="relative z-10">{rank}</span>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20 overflow-hidden">
              <div className="w-[150%] h-full bg-dj-cyan opacity-30 skew-x-[-20deg] animate-shine-slow" style={{ mixBlendMode: 'screen' }} />
            </div>
            <div className="absolute top-4 right-4 w-1 h-1 bg-dj-cyan animate-flicker" />
          </div>
        );
      case 'A':
        return (
          <div className="font-press-start text-8xl text-[#ffd700] border-4 border-[#ffd700] bg-dj-dark p-6 shadow-[0_0_10px_#ffd700] animate-in fade-in zoom-in duration-500">
            {rank}
          </div>
        );
      case 'B':
        return (
          <div className="font-press-start text-8xl text-[#b87333] border-4 border-[#b87333] bg-[#2a1b10] p-6 shadow-inner">
            {rank}
          </div>
        );
      case 'C':
        return (
          <div className="font-press-start text-8xl text-gray-500 border-4 border-gray-600 bg-gray-800 p-6">
            {rank}
          </div>
        );
      case 'D':
        return (
          <div className="font-press-start text-8xl text-dj-red border-4 border-[#8b0000] bg-[#1a0000] p-6 animate-glitch relative">
            <span className="relative z-10 opacity-90 animate-flicker">{rank}</span>
            <div className="absolute inset-0 bg-green-500/20 mix-blend-color-burn animate-pulse" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex justify-center items-center pixelated ${className}`}>
      {renderRankStyle()}
    </div>
  );
}
