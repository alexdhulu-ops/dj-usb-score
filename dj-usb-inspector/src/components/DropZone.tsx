import React, { useRef, useState, useCallback, useEffect } from 'react';

import { PixelCard } from './ui/PixelCard';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isScanning: boolean;
  progress: number;
  currentScan?: number;
  totalScan?: number;
}

export function DropZone({ onFilesSelected, isScanning, progress: _progress, currentScan = 0, totalScan = 0 }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vuLevels, setVuLevels] = useState({ l: 0, r: 0, peak: -0.3 });

  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(() => {
      const l = Math.floor(Math.random() * 16);
      const r = Math.floor(Math.random() * 16);
      const newPeak = (Math.max(l, r) / 16) * 3 - 3;
      setVuLevels(prev => ({
        l,
        r,
        peak: prev.peak < newPeak ? newPeak : prev.peak - 0.1,
      }));
    }, 100);
    return () => clearInterval(interval);
  }, [isScanning]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    const getFilesFromEntry = async (entry: any): Promise<File[]> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file: File) => {
            Object.defineProperty(file, 'fullPath', {
              value: entry.fullPath,
              writable: true,
              configurable: true,
              enumerable: true
            });
            resolve([file]);
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          dirReader.readEntries(async (entries: any[]) => {
            let files: File[] = [];
            for (let i = 0; i < entries.length; i++) {
              const nestedFiles = await getFilesFromEntry(entries[i]);
              files = files.concat(nestedFiles);
            }
            resolve(files);
          });
        });
      }
      return [];
    };

    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (isScanning) return;

    const items = e.dataTransfer.items;
    let allFiles: File[] = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            const files = await getFilesFromEntry(entry);
            allFiles = allFiles.concat(files);
          }
        }
      }
    }

    if (allFiles.length > 0) {
      onFilesSelected(allFiles);
    }
  }, [isScanning, onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  }, [onFilesSelected]);

  // Handle setting webkitdirectory property
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("webkitdirectory", "true");
      fileInputRef.current.setAttribute("directory", "true");
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <PixelCard
        className={`relative flex flex-col items-center justify-center w-full h-80 transition-all duration-300 ${
          isDragActive
            ? 'border-dj-green shadow-[0_0_20px_rgba(0,255,102,0.3)]'
            : 'hover:border-dj-orange/50'
        } ${isScanning ? 'pointer-events-none' : 'cursor-pointer'} pixelated`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isScanning && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileInput}
          multiple
        />

        {isScanning ? (
          <div className="flex flex-col items-center space-y-6 w-full px-8">
            <div className="text-center space-y-4 w-full">
              {/* Double Stereo VU Meter */}
              <div className="flex flex-col items-center w-full my-6 bg-dj-dark p-4 border border-[#333]">
                <div className="flex justify-between w-full max-w-[150px] mb-2 font-vt323 text-gray-500 text-sm">
                  <span>CH L</span>
                  <span>CH R</span>
                </div>
                <div className="flex justify-between w-full max-w-[150px] gap-4">
                  {/* L Channel */}
                  <div className="flex flex-col-reverse gap-[2px] w-full">
                    {Array.from({ length: 16 }).map((_, i) => {
                      let barColor = 'bg-[#333]';
                      if (i <= vuLevels.l) {
                        if (i < 11) barColor = 'bg-dj-green shadow-[0_0_8px_#00ff66]';
                        else if (i < 14) barColor = 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]';
                        else barColor = 'bg-[#ff0055] shadow-[0_0_8px_#ff0055]';
                      }
                      return (
                        <div
                          key={`l-${i}`}
                          className={`w-full h-2 ${barColor} transition-colors duration-75`}
                          style={{ transitionTimingFunction: 'steps(2)' }}
                        />
                      );
                    })}
                  </div>
                  {/* R Channel */}
                  <div className="flex flex-col-reverse gap-[2px] w-full">
                    {Array.from({ length: 16 }).map((_, i) => {
                      let barColor = 'bg-[#333]';
                      if (i <= vuLevels.r) {
                        if (i < 11) barColor = 'bg-dj-green shadow-[0_0_8px_#00ff66]';
                        else if (i < 14) barColor = 'bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]';
                        else barColor = 'bg-[#ff0055] shadow-[0_0_8px_#ff0055]';
                      }
                      return (
                        <div
                          key={`r-${i}`}
                          className={`w-full h-2 ${barColor} transition-colors duration-75`}
                          style={{ transitionTimingFunction: 'steps(2)' }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <p className="text-xl text-dj-green font-vt323 tracking-widest uppercase">
                  SAMPLING TRACKS... [ {currentScan} / {totalScan > 0 ? totalScan : '?'} ]
                </p>
                <p className="text-lg text-[#ff0055] font-vt323">
                  PEAK LEVEL: {vuLevels.peak.toFixed(1)} dB
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6 text-center p-6">
            <div className={`
              w-48 h-12 border-4 bg-dj-dark flex items-center justify-center
              ${isDragActive ? 'border-dj-green shadow-[0_0_15px_#00ff66]' : 'border-[#444]'}
            `}>
               <div className={`w-3/4 h-2 ${isDragActive ? 'bg-dj-green animate-pulse' : 'bg-[#222]'}`} />
            </div>

            <h3 className={`text-xl font-press-start leading-relaxed ${isDragActive ? 'text-dj-green' : 'text-dj-orange'}`}>
              INSERT USB DRIVE<br/>TO VIBE CHECK
            </h3>

            <div className="flex items-center space-x-2 mt-4">
              <span className={`font-vt323 text-lg ${isDragActive ? 'text-dj-green animate-pulse' : 'text-[#ffaa00] animate-pulse'}`}>
                ● SYSTEM READY
              </span>
            </div>
          </div>
        )}
      </PixelCard>
    </div>
  );
}
