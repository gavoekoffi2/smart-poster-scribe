import { useState, useRef, useEffect } from "react";
import { useConversation } from "@/hooks/useConversation";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { DomainSelect } from "@/components/chat/DomainSelect";
import { ColorPalette } from "@/components/chat/ColorPalette";
import { ImageUploadButton } from "@/components/chat/ImageUploadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Send, Download, RotateCcw, SkipForward } from "lucide-react";

export default function Index() {
  const {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    suggestedDomain,
    handleUserMessage,
    handleDomainSelect,
    handleReferenceImage,
    handleSkipReference,
    handleColorsConfirm,
    handleContentImage,
    handleSkipContentImage,
    resetConversation,
  } = useConversation();

  const [inputValue, setInputValue] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
      // Check if user wants to skip reference or content image
      const lower = inputValue.toLowerCase().trim();
      if (conversationState.step === "reference" && (lower === "non" || lower === "passer" || lower === "skip")) {
        handleSkipReference();
      } else if (conversationState.step === "content_image" && (lower === "non" || lower === "passer" || lower === "skip")) {
        handleSkipContentImage();
      } else {
        handleUserMessage(inputValue.trim());
      }
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = `affiche-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const { step } = conversationState;
  const showTextInput = step === "greeting" || step === "details" || step === "custom_domain";
  const showDomainSelect = step === "domain";
  const showReferenceUpload = step === "reference";
  const showColorPalette = step === "colors";
  const showContentImageUpload = step === "content_image";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl md:text-2xl tracking-wider text-foreground neon-text">
                PRO GRAPHISTE AI
              </h1>
              <p className="text-xs text-muted-foreground">Votre assistant créatif</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetConversation}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Nouveau
          </Button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 max-w-7xl">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col glass-panel overflow-hidden">
          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {/* Interactive elements based on step */}
            {showDomainSelect && (
              <div className="ml-11 animate-in fade-in slide-in-from-bottom-2">
                <DomainSelect 
                  onSelect={handleDomainSelect} 
                  disabled={isProcessing}
                  suggestedDomain={suggestedDomain}
                />
              </div>
            )}

            {showColorPalette && (
              <div className="ml-11 animate-in fade-in slide-in-from-bottom-2">
                <ColorPalette
                  selectedColors={selectedColors}
                  onColorsChange={setSelectedColors}
                  onConfirm={() => handleColorsConfirm(selectedColors)}
                  disabled={isProcessing}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 p-4 bg-card/30">
            {showTextInput && (
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message..."
                  disabled={isProcessing}
                  className="flex-1 bg-background/50"
                />
                <Button onClick={handleSend} disabled={!inputValue.trim() || isProcessing}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {showReferenceUpload && (
              <div className="flex flex-wrap gap-2">
                <ImageUploadButton
                  onImageSelect={handleReferenceImage}
                  disabled={isProcessing}
                  label="Envoyer image de référence"
                />
                <Button variant="ghost" size="sm" onClick={handleSkipReference} disabled={isProcessing}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Passer
                </Button>
              </div>
            )}

            {showContentImageUpload && (
              <div className="flex flex-wrap gap-2">
                <ImageUploadButton
                  onImageSelect={handleContentImage}
                  disabled={isProcessing}
                  label="Envoyer image de contenu"
                />
                <Button variant="ghost" size="sm" onClick={handleSkipContentImage} disabled={isProcessing}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Générer automatiquement
                </Button>
              </div>
            )}

            {(step === "generating" || step === "complete") && !showTextInput && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={resetConversation}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Créer une nouvelle affiche
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:w-96 glass-panel p-4 flex flex-col">
          <h2 className="font-display text-sm tracking-wide text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            APERÇU
          </h2>
          
          <div className="flex-1 flex items-center justify-center min-h-[400px] rounded-lg bg-background/50 border border-border/30 overflow-hidden">
            {generatedImage ? (
              <img
                src={generatedImage}
                alt="Affiche générée"
                className="max-w-full max-h-full object-contain"
              />
            ) : isProcessing && step === "generating" ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Génération en cours...</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Zap className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Votre affiche apparaîtra ici</p>
              </div>
            )}
          </div>

          {generatedImage && (
            <Button onClick={handleDownload} className="mt-4 w-full">
              <Download className="w-4 h-4 mr-2" />
              Télécharger l'affiche
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
