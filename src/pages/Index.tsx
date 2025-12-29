import { useState, useMemo } from "react";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useImageAnalysis } from "@/hooks/useImageAnalysis";
import { PromptInput } from "@/components/PromptInput";
import { GenerationOptions } from "@/components/GenerationOptions";
import { ImagePreview } from "@/components/ImagePreview";
import { HistoryPanel } from "@/components/HistoryPanel";
import { DomainSelector, getDomainInfo } from "@/components/DomainSelector";
import { DomainQuestions } from "@/components/DomainQuestions";
import { ReferenceImageUpload } from "@/components/ReferenceImageUpload";
import { AspectRatio, Resolution, OutputFormat, Domain } from "@/types/generation";
import { Zap } from "lucide-react";

export default function Index() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [domainAnswers, setDomainAnswers] = useState<Record<string, string>>({});

  const { isGenerating, currentImage, history, generateImage, selectFromHistory, clearHistory } = useImageGeneration();
  const { isAnalyzing, referenceImage, referenceDescription, uploadImage, removeImage, analyzeImage } = useImageAnalysis();

  const domainInfo = selectedDomain ? getDomainInfo(selectedDomain) : null;

  const handleDomainChange = (domain: Domain) => {
    setSelectedDomain(domain);
    setDomainAnswers({});
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setDomainAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!selectedDomain) missing.push("Domaine");
    return missing;
  }, [selectedDomain]);

  const canGenerate = selectedDomain !== null;

  const handleGenerate = (prompt: string) => {
    // Build enhanced prompt with context
    let enhancedPrompt = prompt;

    // Add domain context
    if (domainInfo) {
      const answersText = Object.entries(domainAnswers)
        .filter(([_, value]) => value.trim())
        .map(([key, value]) => {
          const question = domainInfo.questions.find((q) => q.id === key);
          return question ? `${question.question} ${value}` : value;
        })
        .join(". ");

      if (answersText) {
        enhancedPrompt = `${enhancedPrompt}. Contexte: ${answersText}`;
      }
    }

    // Add reference template if available
    if (referenceDescription) {
      enhancedPrompt = `Style de référence: ${referenceDescription}\n\nContenu à créer: ${enhancedPrompt}`;
    }

    generateImage({
      prompt: enhancedPrompt,
      aspectRatio,
      resolution,
      outputFormat,
      domain: selectedDomain || undefined,
      referenceImageUrl: referenceImage || undefined,
      referenceDescription: referenceDescription || undefined,
      domainAnswers,
    });
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-4 space-y-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
            {/* Step 1: Reference Image */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-sm tracking-wide text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">1</span>
                IMAGE DE RÉFÉRENCE
              </h2>
              <ReferenceImageUpload
                referenceImage={referenceImage}
                referenceDescription={referenceDescription}
                onImageUpload={uploadImage}
                onImageRemove={removeImage}
                onAnalyze={analyzeImage}
                isAnalyzing={isAnalyzing}
                disabled={isGenerating}
              />
            </div>

            {/* Step 2: Domain Selection */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-sm tracking-wide text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">2</span>
                DOMAINE
              </h2>
              <DomainSelector
                selectedDomain={selectedDomain}
                onDomainChange={handleDomainChange}
                disabled={isGenerating}
              />
            </div>

            {/* Step 3: Domain Questions */}
            {domainInfo && domainInfo.questions.length > 0 && (
              <div className="glass-panel p-4">
                <h2 className="font-display text-sm tracking-wide text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">3</span>
                  PERSONNALISATION
                </h2>
                <DomainQuestions
                  questions={domainInfo.questions}
                  answers={domainAnswers}
                  onAnswerChange={handleAnswerChange}
                  disabled={isGenerating}
                />
              </div>
            )}

            {/* Step 4: Content & Generate */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-sm tracking-wide text-foreground mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                  {domainInfo?.questions.length ? "4" : "3"}
                </span>
                CONTENU DE L'AFFICHE
              </h2>
              <PromptInput
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                canGenerate={canGenerate}
                missingRequirements={missingRequirements}
              />
            </div>

            {/* Options */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-sm tracking-wide text-foreground mb-3">OPTIONS TECHNIQUES</h2>
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
          <div className="lg:col-span-5 glass-panel p-5 lg:h-[calc(100vh-140px)]">
            <ImagePreview image={currentImage} isGenerating={isGenerating} />
          </div>

          {/* Right Panel - History */}
          <div className="lg:col-span-3 glass-panel p-5 lg:h-[calc(100vh-140px)]">
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
