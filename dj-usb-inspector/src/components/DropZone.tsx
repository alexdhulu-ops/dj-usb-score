import React, { useRef, useState, useCallback, useEffect } from 'react';
import { UploadCloud, Usb, Loader2 } from 'lucide-react';

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
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
      <div
        className={`relative flex flex-col items-center justify-center w-full h-80 rounded-xl border-2 border-dashed transition-all duration-300 ${
          isDragActive
            ? 'border-dj-orange bg-dj-orange/10 scale-105'
            : 'border-dj-gray bg-dj-dark hover:border-dj-orange/50 hover:bg-dj-gray/50'
        } ${isScanning ? 'opacity-80 pointer-events-none' : 'cursor-pointer'}`}
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
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-dj-orange animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Usb className="w-6 h-6 text-dj-gray animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-dj-orange font-mono font-bold tracking-widest uppercase">
                Analyse spectrale en cours...
              </p>
              <div className="w-64 h-2 bg-dj-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-dj-orange transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 font-mono">
                {progress}%
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4 text-center p-6">
            <div className="p-4 rounded-full bg-dj-gray/80 shadow-[0_0_15px_rgba(255,81,0,0.2)]">
              <UploadCloud className="w-12 h-12 text-dj-orange" />
            </div>
            <h3 className="text-xl font-bold font-mono tracking-wide text-white uppercase">
              Connecte ta clé USB
            </h3>
            <p className="text-gray-400 max-w-sm">
              Glisse-dépose ton dossier Rekordbox ou clique pour parcourir.
              <br/>
              <span className="text-xs text-dj-orange/80 mt-2 block">
                100% Local • Tes tracks restent sur ta machine
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
