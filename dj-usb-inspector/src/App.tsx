import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { scanFiles } from './services/fileScanner';
import { calculateScore, type ScoreResult } from './services/scoringEngine';
import { Headphones } from 'lucide-react';

function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setIsScanning(true);
    setProgress(0);
    setResult(null);

    try {
      const stats = await scanFiles(files, (p) => setProgress(p));
      const finalScore = calculateScore(stats);
      setResult(finalScore);
    } catch (error) {
      console.error("Error during scan:", error);
      alert("Une erreur est survenue lors de l'analyse.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-dj-dark text-gray-100 font-sans selection:bg-dj-orange selection:text-white">
      <header className="border-b border-white/5 bg-dj-gray/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center space-x-3">
          <Headphones className="w-8 h-8 text-dj-orange" />
          <h1 className="text-xl font-black tracking-widest uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-dj-orange to-dj-green">
            USB Inspector
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        {!result ? (
          <div className="w-full space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-4 max-w-xl mx-auto">
              <h2 className="text-3xl font-bold font-mono tracking-tight">
                L'épreuve de vérité.
              </h2>
              <p className="text-gray-400">
                Découvre le rang secret de ta collection. Notre algorithme impitoyable analyse tes formats, tes durées et la pureté spectrale de tes kicks.
              </p>
            </div>

            <DropZone
              onFilesSelected={handleFilesSelected}
              isScanning={isScanning}
              progress={progress}
            />
          </div>
        ) : (
          <ResultCard
            result={result}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;
