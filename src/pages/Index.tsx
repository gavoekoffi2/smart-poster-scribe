import { useState } from "react";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { PromptInput } from "@/components/PromptInput";
import { GenerationOptions } from "@/components/GenerationOptions";
import { ImagePreview } from "@/components/ImagePreview";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AspectRatio, Resolution, OutputFormat } from "@/types/generation";
import { Zap } from "lucide-react";

export default function Index() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");

  const { isGenerating, currentImage, history, generateImage, selectFromHistory, clearHistory } = useImageGeneration();

  const handleGenerate = (prompt: string) => {
    generateImage({ prompt, aspectRatio, resolution, outputFormat });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl tracking-wider text-foreground neon-text">
                PRO GRAPHISTE AI
              </h1>
              <p className="text-xs text-muted-foreground">Powered by Nano Banana Pro</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-120px)]">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto">
            <div className="glass-panel p-5">
              <h2 className="font-display text-xl tracking-wide text-foreground mb-4">CRÉER UNE AFFICHE</h2>
              <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
            </div>
            <div className="glass-panel p-5">
              <h2 className="font-display text-xl tracking-wide text-foreground mb-4">OPTIONS</h2>
              <GenerationOptions
                aspectRatio={aspectRatio}
                resolution={resolution}
                outputFormat={outputFormat}
                onAspectRatioChange={setAspectRatio}
                onResolutionChange={setResolution}
                onOutputFormatChange={setOutputFormat}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Center - Preview */}
          <div className="lg:col-span-5 glass-panel p-5">
            <ImagePreview image={currentImage} isGenerating={isGenerating} />
          </div>

          {/* Right Panel - History */}
          <div className="lg:col-span-3 glass-panel p-5">
            <HistoryPanel
              history={history}
              currentImage={currentImage}
              onSelect={selectFromHistory}
              onClear={clearHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
