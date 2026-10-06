import { useEffect, useState, useMemo } from 'react';
import { type ScoreResult } from '../services/scoringEngine';
import { type ScanStats } from '../services/fileScanner';
import { PixelCard } from './ui/PixelCard';
import { PixelButton } from './ui/PixelButton';
import { RankBadge } from './RankBadge';

interface ResultCardProps {
  result: ScoreResult;
  stats: ScanStats;
  onReset: () => void;
}

export function ResultCard({ result, stats, onReset }: ResultCardProps) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showTelemetry, setShowTelemetry] = useState(false);

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

        <div className="w-full mt-4 flex justify-center">
          <PixelButton
            variant="secondary"
            className="text-xs py-2 w-full text-center"
            onClick={() => setShowTelemetry(!showTelemetry)}
          >
            [ {showTelemetry ? '- HIDE' : '+ EXPAND'} TELEMETRY / DRIVE MAP ]
          </PixelButton>
        </div>

        {showTelemetry && (
          <div className="w-full flex flex-col space-y-8 animate-in fade-in duration-300 border-t-2 border-[#333] pt-6 font-vt323">

            {/* Sub-scores */}
            <div className="w-full space-y-4">
              <h3 className="text-dj-cyan font-press-start text-xs tracking-wider mb-2">METRICS:</h3>
              <Gauge label="AUDIO PURITY & DYNAMICS" score={result.details.purityAndDynamics} max={25} />
              <Gauge label="HARDWARE COMPATIBILITY" score={result.details.hardwareCompat} max={20} />
              <Gauge label="EXTENDED CLUB CULTURE" score={result.details.extendedCulture} max={20} />
              <Gauge label="SET ENDURANCE" score={result.details.setEndurance} max={20} />
              <Gauge label="DRIVE HYGIENE & PURITY" score={result.details.driveHygiene} max={15} />
            </div>

            {/* Format Breakdown */}
            <div className="w-full space-y-2">
              <h3 className="text-dj-cyan font-press-start text-xs tracking-wider mb-2">FORMAT DISTRIBUTION:</h3>
              <FormatBreakdown stats={stats} />
            </div>

            {/* Drive Map */}
            <div className="w-full space-y-2">
              <h3 className="text-dj-cyan font-press-start text-xs tracking-wider mb-2">DRIVE MAP:</h3>
              <DriveMap stats={stats} />
            </div>

          </div>
        )}

        {/* Footer info (Timestamp & Checksum) */}
        <div className="w-full flex justify-between items-center text-gray-500 font-vt323 text-lg border-t-2 border-[#333] pt-4 mt-4">
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

// Sub-components for Telemetry

function Gauge({ label, score, max }: { label: string, score: number, max: number }) {
  const percentage = (score / max) * 100;

  let colorClass = 'text-dj-green';
  if (percentage < 50) colorClass = 'text-dj-red animate-pulse';
  else if (percentage <= 80) colorClass = 'text-amber-500';

  const totalBlocks = 10;
  const filledBlocks = Math.round((percentage / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;

  const bar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}]`;

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-lg">
      <span className="text-gray-300">{label}</span>
      <span className={`font-mono ${colorClass} tracking-widest`}>
        {bar} {score}/{max}
      </span>
    </div>
  );
}

function FormatBreakdown({ stats }: { stats: ScanStats }) {
  const distribution = useMemo(() => {
    let aiff = 0, wav = 0, flac = 0, mp3cbr = 0, mp3vbr = 0, other = 0;

    for (const meta of stats.metadataList) {
      const ext = meta.extension.toLowerCase();
      if (ext === 'aiff' || ext === 'aif') aiff++;
      else if (ext === 'wav') wav++;
      else if (ext === 'flac' || ext === 'alac') flac++;
      else if (ext === 'mp3') {
        if (meta.bitrate && meta.bitrate >= 320000) mp3cbr++;
        else mp3vbr++;
      } else {
        other++;
      }
    }

    const total = Math.max(1, stats.metadataList.length);

    return [
      { label: 'AIFF', count: aiff, color: 'bg-dj-green', textClass: 'text-dj-green' },
      { label: 'WAV', count: wav, color: 'bg-dj-cyan', textClass: 'text-dj-cyan' },
      { label: 'FLAC', count: flac, color: 'bg-blue-400', textClass: 'text-blue-400' },
      { label: 'MP3 CBR', count: mp3cbr, color: 'bg-amber-400', textClass: 'text-amber-400' },
      { label: 'MP3 VBR', count: mp3vbr, color: 'bg-dj-orange', textClass: 'text-dj-orange' },
      { label: 'OTHER', count: other, color: 'bg-dj-red', textClass: 'text-dj-red' },
    ].filter(item => item.count > 0).map(item => ({
      ...item,
      percentage: Math.round((item.count / total) * 100)
    }));
  }, [stats]);

  if (distribution.length === 0) return <div className="text-gray-500">NO VALID AUDIO DETECTED</div>;

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      <div className="w-full h-4 flex bg-[#222]">
        {distribution.map((item, idx) => (
          <div key={idx} className={`h-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-base">
        {distribution.map((item, idx) => (
          <span key={idx} className={item.textClass}>
            {item.label}: {item.percentage}%
          </span>
        ))}
      </div>
    </div>
  );
}

function DriveMap({ stats }: { stats: ScanStats }) {
  const treeLines = useMemo(() => {
    // Build tree
    const root: any = { name: 'ROOT', children: {}, audioCount: 0, isFile: false, isParasite: false, fullPath: 'ROOT' };

    for (const file of stats.filesForTree) {
      const parts = file.path.split('/');
      let current = root;
      let pathAccum = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = (i === parts.length - 1);
        pathAccum = pathAccum ? `${pathAccum}/${part}` : part;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            children: {},
            audioCount: 0,
            isFile,
            isParasite: isFile ? file.isParasite : false,
            isAudio: isFile ? file.isAudio : false,
            fullPath: pathAccum
          };
        }

        if (file.isAudio) {
           current.children[part].audioCount++;
        }

        current = current.children[part];
      }
    }

    const lines: string[] = [];

    function traverse(node: any, prefix: string, isLast: boolean, depth: number) {
      if (depth > 3) return; // Limit to 3 levels

      const isRoot = depth === 0;

      let lineStr = "";
      if (isRoot) {
        const rootRank = stats.folderRanks && stats.folderRanks[node.fullPath] ? ` [${stats.folderRanks[node.fullPath]}]` : '';
        lineStr = `ROOT/${rootRank}`;
      } else {
        const marker = isLast ? "└── " : "├── ";
        lineStr = prefix + marker;

        if (node.isFile) {
          if (node.isParasite) {
            lineStr += `[!] ${node.name}`;
          } else {
             // Only print files if it's a parasite, else we rely on dir count
             return;
          }
        } else {
           lineStr += `📁 ${node.name}/`;
           const rank = stats.folderRanks && stats.folderRanks[node.fullPath] ? ` [${stats.folderRanks[node.fullPath]}]` : '';
           lineStr += rank;
           if (node.audioCount > 0) {
             lineStr += ` (${node.audioCount} tracks)`;
           }
        }
      }

      if (node.isFile && node.isParasite) {
         // Return an object to know we need to highlight this line
         lines.push(`$RED$${lineStr}`);
      } else {
         lines.push(lineStr);
      }

      if (!node.isFile) {
        const children = Object.values(node.children);
        // We only want to show directories or parasite files
        const visibleChildren = children.filter((c: any) => !c.isFile || c.isParasite);

        for (let i = 0; i < visibleChildren.length; i++) {
          const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
          traverse(visibleChildren[i], childPrefix, i === visibleChildren.length - 1, depth + 1);
        }
      }
    }

    // Since we parse paths where the first part is a directory, 'ROOT' might not be correct if we want to show folder ranks for the root folder.
    // Actually, stats.folderRanks keys are exactly the path prefixes.
    // E.g. "MyFolder", "MyFolder/TechHouse".
    // For "ROOT", there's no "ROOT" path in stats.folderRanks unless the first folder is named ROOT.
    // So 'ROOT/' rank will be empty, but that's fine.

    traverse(root, "", true, 0);
    return lines;

  }, [stats.filesForTree, stats.folderRanks]);

  return (
    <div className="bg-[#0a0a0a] border border-[#333] p-4 font-mono text-base sm:text-lg overflow-x-auto whitespace-pre rounded">
      {treeLines.map((line, idx) => {
        if (line.startsWith('$RED$')) {
           return <div key={idx} className="text-dj-red">{line.replace('$RED$', '')}</div>;
        }
        return <div key={idx} className="text-gray-300">{line}</div>;
      })}
    </div>
  );
}
