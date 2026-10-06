import React, { useRef, useState, useCallback, useEffect } from 'react';

import { PixelCard } from './ui/PixelCard';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isScanning: boolean;
  progress: number;
}

export function DropZone({ onFilesSelected, isScanning, progress }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          entry.file((file: File) => resolve([file]));
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

  // Calculate VU meter bars based on progress (0-100)
  // Let's use 10 bars
  const totalBars = 10;
  const activeBars = Math.floor((progress / 100) * totalBars);

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
              <p className="text-dj-green font-vt323 text-2xl tracking-widest uppercase animate-pulse">
                ANALYZING BITRATES & CUES...
              </p>

              {/* Pixel VU Meter */}
              <div className="flex gap-2 justify-center w-full my-6 bg-dj-dark p-4 border border-[#333]">
                {Array.from({ length: totalBars }).map((_, i) => {
                  let barColor = 'bg-[#333]';
                  if (i < activeBars) {
                    if (i < 6) barColor = 'bg-dj-green shadow-[0_0_8px_#00ff66]';
                    else if (i < 8) barColor = 'bg-dj-gold shadow-[0_0_8px_#ffd700]';
                    else barColor = 'bg-dj-red shadow-[0_0_8px_#ff0055]';
                  }
                  return (
                    <div
                      key={i}
                      className={`w-6 h-12 ${barColor} transition-colors duration-75`}
                      style={{ transitionTimingFunction: 'steps(2)' }}
                    />
                  );
                })}
              </div>

              <p className="text-xl text-dj-green font-vt323">
                {Math.floor(progress)}%
              </p>
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
              INSERT DRIVE<br/>TO CHECK VIBE
            </h3>

            <div className="flex items-center space-x-2 mt-4">
              <div className={`w-3 h-3 rounded-full ${isDragActive ? 'bg-dj-green shadow-[0_0_10px_#00ff66]' : 'bg-[#ffaa00] shadow-[0_0_10px_#ffaa00] opacity-50'}`} />
              <span className="font-vt323 text-lg text-gray-400">USB PORT READY</span>
            </div>
          </div>
        )}
      </PixelCard>
    </div>
  );
}
