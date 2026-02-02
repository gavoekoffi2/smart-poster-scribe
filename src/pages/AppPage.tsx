import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import confetti from "canvas-confetti";
import { useConversation } from "@/hooks/useConversation";
import { useHistory } from "@/hooks/useHistory";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTutorial } from "@/hooks/useTutorial";
import { CreditBalance } from "@/components/credits/CreditBalance";
import { UpgradeModal } from "@/components/credits/UpgradeModal";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { DomainSelect } from "@/components/chat/DomainSelect";
import { ColorPalette } from "@/components/chat/ColorPalette";
import { FormatSelect } from "@/components/chat/FormatSelect";
import { ImageUploadButton } from "@/components/chat/ImageUploadButton";
import { LogoPositionSelect } from "@/components/chat/LogoPositionSelect";
import { DefaultLogoSelect } from "@/components/chat/DefaultLogoSelect";
import { StepNavigation, StepIndicator } from "@/components/chat/StepNavigation";
import { HistoryPanel } from "@/components/HistoryPanel";
import { DesignerAvatar } from "@/components/DesignerAvatar";
import { VisualEditor } from "@/components/editor/VisualEditor";
import { InlineFeedbackWidget } from "@/components/feedback/InlineFeedbackWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Download, RotateCcw, SkipForward, History, Sparkles, LogOut, User, Copy, Pencil, FileImage, FileText, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GeneratedImage, AspectRatio } from "@/types/generation";
import { toast } from "sonner";
interface CreditError {
  error: string;
  message: string;
  remaining?: number;
  needed?: number;
  is_free?: boolean;
}

interface CloneTemplateState {
  cloneTemplate?: {
    id: string;
    imageUrl: string;
    domain: string;
    description: string | null;
  };
}

const fireConfetti = () => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#D4AF37', '#1a1a2e', '#FFD700'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#D4AF37', '#C5A028', '#FFD700'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#D4AF37', '#1a1a2e', '#FFD700', '#B8860B'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#FFD700', '#D4AF37'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#D4AF37', '#C5A028', '#B8860B'],
  });
};

export default function AppPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as CloneTemplateState | null;
  const cloneTemplate = locationState?.cloneTemplate;
  
  const { profile } = useUserProfile();
  const { user, isAuthenticated, signOut } = useAuth();
  const { shouldShowTutorial, isLoading: tutorialLoading, completeTutorial } = useTutorial(user?.id);
  const {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    suggestedDomain,
    visitedSteps,
    handleUserMessage,
    handleDomainSelect,
    handleMainSpeakerPhoto,
    handleGuestPhoto,
    handleSkipSpeakers,
    handleSkipGuests,
    handleSkipProductCharacter,
    // Restaurant handlers
    handleSkipRestaurantMenu,
    handleBeveragePhoto,
    handleSkipBeverages,
    handleDishPhoto,
    handleSkipDishes,
    // Domain questions handlers
    handleDomainQuestionImage,
    handleSkipDomainQuestionImages,
    // Other handlers
    handleReferenceImage,
    handleSkipReference,
    handleStylePreferencesAndSelectTemplate,
    handleSkipStylePreferences,
    handleColorsConfirm,
    handleColorsSkip,
    handleLogoImage,
    handleLogoPosition,
    handleSkipLogo,
    handleContentImage,
    handleSkipContentImage,
    handleFormatSelect,
    handleSkipFormat,
    resetConversation,
    goBackToStep,
    goForwardToStep,
    isCloneMode,
    creditError,
    clearCreditError,
  } = useConversation(cloneTemplate);

  const { history, saveToHistory, clearHistory, updateEditedImage, markAsDownloaded, updateUserRating, isAuthenticated: historyAuth } = useHistory();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show upgrade modal when credit error occurs
  useEffect(() => {
    if (creditError && (
      creditError.error === "FREE_LIMIT_REACHED" ||
      creditError.error === "RESOLUTION_NOT_ALLOWED" ||
      creditError.error === "INSUFFICIENT_CREDITS"
    )) {
      setShowUpgradeModal(true);
    }
  }, [creditError]);

  const [inputValue, setInputValue] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<GeneratedImage | null>(null);
  const [prevGeneratedImage, setPrevGeneratedImage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [feedbackImageId, setFeedbackImageId] = useState<string | undefined>();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fire confetti and save to history when image is generated
  useEffect(() => {
    if (generatedImage && generatedImage !== prevGeneratedImage) {
      fireConfetti();
      setPrevGeneratedImage(generatedImage);
      
      // Save generated image to history automatically
      const saveGeneratedImage = async () => {
        try {
          // Cast aspectRatio to AspectRatio type
          const aspectRatio = (conversationState.formatPreset?.aspectRatio || "3:4") as AspectRatio;
          
          const savedImage = await saveToHistory({
            imageUrl: generatedImage,
            prompt: conversationState.description || "Affiche générée",
            aspectRatio,
            resolution: conversationState.formatPreset?.resolution || "1K",
            domain: conversationState.domain,
            referenceImageUrl: conversationState.referenceImage,
            contentImageUrl: conversationState.contentImage,
            logoUrls: conversationState.logos?.map(l => l.imageUrl),
            logoPositions: conversationState.logos?.map(l => l.position),
            colorPalette: conversationState.colorPalette,
          });
          
          // Set feedback image ID for later use
          if (savedImage?.id) {
            setFeedbackImageId(savedImage.id);
          }
          // Don't auto-show feedback immediately - let user appreciate the result first
          // They can click the feedback button when ready
        } catch (err) {
          console.error("Error saving to history:", err);
        }
      };
      
      saveGeneratedImage();
    }
  }, [generatedImage, prevGeneratedImage, saveToHistory, conversationState]);

  const handleSend = () => {
    if (inputValue.trim() && !isProcessing) {
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

  // Fonction pour télécharger en JPEG
  const downloadAsJpeg = async (pngBlob: Blob): Promise<void> => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(pngBlob);
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((jpegBlob) => {
            if (jpegBlob) {
              const jpegUrl = URL.createObjectURL(jpegBlob);
              const link = document.createElement('a');
              link.href = jpegUrl;
              link.download = `graphiste-gpt-${Date.now()}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(jpegUrl);
              resolve();
            } else {
              reject(new Error("Failed to convert to JPEG"));
            }
          }, 'image/jpeg', 0.92);
        }
        
        URL.revokeObjectURL(blobUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = blobUrl;
    });
  };

  // Fonction pour télécharger en PDF (via impression)
  const downloadAsPdf = async (imageBlob: Blob): Promise<void> => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(imageBlob);
    
    return new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Graphiste GPT - Affiche</title>
                <style>
                  @page { size: auto; margin: 0; }
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                  img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" />
                <script>
                  window.onload = function() {
                    setTimeout(function() { window.print(); }, 300);
                  }
                </script>
              </body>
              </html>
            `);
            printWindow.document.close();
          }
          resolve();
        }
        URL.revokeObjectURL(blobUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = blobUrl;
    });
  };

  const handleDownloadWithFormat = async (format: 'png' | 'jpeg' | 'pdf') => {
    const imageToDownload = generatedImage || selectedHistoryImage?.imageUrl;
    const imageId = feedbackImageId || selectedHistoryImage?.id;
    
    if (!imageToDownload) return;
    
    try {
      // Essayer d'abord avec fetch + blob
      let blob: Blob | null = null;
      
      try {
        const response = await fetch(imageToDownload, { 
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'image/*'
          }
        });
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (fetchError) {
        console.log("Direct fetch failed, trying alternative method:", fetchError);
      }
      
      // Si fetch a échoué ou CORS bloqué, utiliser une approche alternative
      if (!blob) {
        // Créer un canvas avec l'image pour contourner CORS
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Fond blanc pour JPEG
                if (format === 'jpeg') {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((canvasBlob) => {
                  if (canvasBlob) {
                    blob = canvasBlob;
                    resolve();
                  } else {
                    reject(new Error("Canvas to blob failed"));
                  }
                }, format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
              } else {
                reject(new Error("No canvas context"));
              }
            } catch (canvasError) {
              reject(canvasError);
            }
          };
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = imageToDownload;
        });
      }
      
      if (!blob) {
        // Dernier recours: ouvrir dans un nouvel onglet
        window.open(imageToDownload, '_blank');
        toast.info("Image ouverte dans un nouvel onglet. Clic droit → Enregistrer l'image.");
        return;
      }
      
      if (format === 'pdf') {
        await downloadAsPdf(blob);
        toast.success("Impression PDF ouverte !");
      } else if (format === 'jpeg') {
        // Si le blob n'est pas déjà JPEG, convertir
        if (blob.type !== 'image/jpeg') {
          await downloadAsJpeg(blob);
        } else {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = `graphiste-gpt-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }
        toast.success("Image téléchargée en JPEG !");
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `graphiste-gpt-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toast.success("Image téléchargée en PNG !");
      }
      
      if (imageId) {
        await markAsDownloaded({ id: imageId });
      }
    } catch (error) {
      console.error("Download error:", error);
      // Fallback final: ouvrir dans un nouvel onglet
      window.open(imageToDownload, '_blank');
      toast.info("Image ouverte dans un nouvel onglet. Clic droit → Enregistrer l'image.");
    }
  };

  const handleDownload = async () => {
    await handleDownloadWithFormat('png');
  };

  const { step } = conversationState;
  const showTextInput = step === "greeting" || step === "clone_gathering" || step === "confirm_missing_zones" || step === "confirm_context_mismatch" || step === "details" || step === "custom_domain" || step === "complete" || step === "speakers_check" || step === "main_speaker_name" || step === "guests_check" || step === "guest_name" || step === "product_character_check" || step === "product_character_interaction" || step === "restaurant_menu_check" || step === "restaurant_menu_content" || step === "restaurant_beverages_check" || step === "restaurant_dishes_check" || step === "style_preferences" || step === "domain_questions" || step === "domain_question_text";
  const showDomainSelect = step === "domain";
  const showReferenceUpload = step === "reference";
  const showColorPalette = step === "colors";
  const showBeveragesUpload = step === "restaurant_beverages_photos";
  const showDishesUpload = step === "restaurant_dishes_photos";
  const showLogoUpload = step === "logo";
  const showLogoPosition = step === "logo_position";
  const showContentImageUpload = step === "content_image";
  const showMainSpeakerPhotoUpload = step === "main_speaker_photo";
  const showGuestPhotoUpload = step === "guest_photo";
  const showProductCharacterSkip = step === "product_character_check";
  const showStylePreferencesSkip = step === "style_preferences";
  const showDomainQuestionImages = step === "domain_question_images";
  const showFormatSelect = step === "format";

  const displayImage = generatedImage || selectedHistoryImage?.imageUrl;

  const handleHistorySelect = (image: GeneratedImage) => {
    setSelectedHistoryImage(image);
  };

  const handleReset = () => {
    resetConversation();
    setSelectedHistoryImage(null);
  };

  // Handle opening the visual editor
  const handleOpenEditor = (imageUrl: string, imageId?: string) => {
    setEditingImage(imageUrl);
    setEditingImageId(imageId || null);
    setShowEditor(true);
  };

  // Handle saving edited image with persistence
  const handleSaveEditedImage = async (editedImageUrl: string) => {
    // If editing an existing history image, update it in Supabase
    if (editingImageId) {
      const updatedImage = await updateEditedImage({
        id: editingImageId,
        imageUrl: editedImageUrl
      });
      
      if (updatedImage) {
        // Update the selected image if it was the one being edited
        if (selectedHistoryImage?.id === editingImageId) {
          setSelectedHistoryImage(updatedImage);
        }
      }
    } else if (selectedHistoryImage) {
      // Fallback for images without ID
      setSelectedHistoryImage({
        ...selectedHistoryImage,
        imageUrl: editedImageUrl
      });
    }
    
    setShowEditor(false);
    setEditingImage(null);
    setEditingImageId(null);
  };

  // Handle edit from history
  const handleEditFromHistory = (image: GeneratedImage) => {
    setSelectedHistoryImage(image);
    handleOpenEditor(image.imageUrl, image.id);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <DesignerAvatar size="sm" isWorking={isProcessing} />
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-lg md:text-xl font-semibold tracking-tight gradient-text leading-tight">
                Graphiste GPT
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 leading-tight">
                {isCloneMode ? (
                  <>
                    <Copy className="w-2.5 h-2.5 text-accent" />
                    Mode clonage
                  </>
                ) : (
                  <>
                    <Sparkles className="w-2.5 h-2.5 text-primary" />
                    Assistant design premium
                  </>
                )}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <CreditBalance compact onUpgrade={() => navigate("/pricing")} />
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              <History className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Historique</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
            {isAuthenticated ? (
              <>
                <Link to="/account">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  >
                    <User className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Mon compte</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-primary/30 hover:bg-primary/10"
                >
                  <User className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Connexion</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 max-w-7xl overflow-hidden">
        {/* Main Panel - Chat + Preview below */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Chat Panel */}
          <div className="flex flex-col glass-panel overflow-hidden animate-scale-in" style={{ minHeight: displayImage ? '40vh' : '70vh', maxHeight: displayImage ? '50vh' : '80vh' }}>
            {/* Step Indicator */}
            <StepIndicator currentStep={step} />
            
            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
            >
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {/* Interactive elements based on step */}
              {showDomainSelect && (
                <div className="ml-14 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <DomainSelect 
                    onSelect={handleDomainSelect} 
                    disabled={isProcessing}
                    suggestedDomain={suggestedDomain}
                  />
                </div>
              )}

              {showColorPalette && (
                <div className="ml-14 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <ColorPalette
                    selectedColors={selectedColors}
                    onColorsChange={setSelectedColors}
                    onConfirm={() => handleColorsConfirm(selectedColors)}
                    onSkip={handleColorsSkip}
                    disabled={isProcessing}
                    defaultPalette={profile?.default_color_palette}
                  />
                </div>
              )}

              {showFormatSelect && (
                <div className="ml-14 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <FormatSelect
                    onSelect={handleFormatSelect}
                    disabled={isProcessing}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSkipFormat} 
                    disabled={isProcessing} 
                    className="mt-2 hover:bg-muted/50"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Utiliser le format par défaut
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border/30 p-4 bg-card/30 backdrop-blur-sm">
              {/* Navigation avant/arrière */}
              <StepNavigation 
                currentStep={step} 
                onGoBack={goBackToStep}
                onGoForward={goForwardToStep}
                visitedSteps={visitedSteps}
                disabled={isProcessing} 
              />
              
              {showTextInput && (
                <div className="flex gap-3">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={step === "complete" ? "Décrivez vos modifications..." : "Décrivez votre projet créatif..."}
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing}
                    className="flex-1 bg-background/60 border-border/40 focus:border-brand-orange/50 focus:ring-brand-orange/20 transition-all"
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!inputValue.trim() || isProcessing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 px-6 glow-gold"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {showProductCharacterSkip && (
                <div className="flex flex-wrap gap-3 mt-2">
                  <Button variant="ghost" size="sm" onClick={handleSkipProductCharacter} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Non, pas de personnage
                  </Button>
                </div>
              )}

              {showStylePreferencesSkip && (
                <div className="flex flex-wrap gap-3 mt-2">
                  <Button variant="ghost" size="sm" onClick={handleSkipStylePreferences} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Continuer sans préférences
                  </Button>
                </div>
              )}

              {showMainSpeakerPhotoUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleMainSpeakerPhoto}
                    disabled={isProcessing}
                    label="Envoyer photo de l'orateur"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipSpeakers} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Pas d'orateur
                  </Button>
                </div>
              )}

              {showGuestPhotoUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleGuestPhoto}
                    disabled={isProcessing}
                    label="Envoyer photo d'invité"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipGuests} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    {(conversationState.guests?.length || 0) > 0 ? "Continuer" : "Pas d'invité"}
                  </Button>
                </div>
              )}

              {showBeveragesUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleBeveragePhoto}
                    disabled={isProcessing}
                    label="Envoyer photo de boisson"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipBeverages} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    {(conversationState.currentBeverageImages?.length || 0) > 0 ? "Continuer" : "Pas de boissons"}
                  </Button>
                </div>
              )}

              {showDishesUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleDishPhoto}
                    disabled={isProcessing}
                    label="Envoyer photo de plat"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipDishes} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    {(conversationState.currentDishImages?.length || 0) > 0 ? "Continuer" : "Pas de plats"}
                  </Button>
                </div>
              )}

              {showReferenceUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleReferenceImage}
                    disabled={isProcessing}
                    label="Envoyer image de référence"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipReference} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Passer
                  </Button>
                </div>
              )}

              {showLogoUpload && (
                <DefaultLogoSelect
                  defaultLogoUrl={profile?.default_logo_url || null}
                  onUseDefault={() => {
                    if (profile?.default_logo_url) {
                      handleLogoImage(profile.default_logo_url);
                    }
                  }}
                  onUploadNew={handleLogoImage}
                  onSkip={handleSkipLogo}
                  disabled={isProcessing}
                  hasLogos={(conversationState.logos?.length || 0) > 0}
                />
              )}

              {showLogoPosition && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <LogoPositionSelect
                    onSelect={handleLogoPosition}
                    disabled={isProcessing}
                  />
                </div>
              )}

              {showContentImageUpload && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleContentImage}
                    disabled={isProcessing}
                    label="Ajouter image de contenu"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipContentImage} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Générer automatiquement
                  </Button>
                </div>
              )}

              {showDomainQuestionImages && (
                <div className="flex flex-wrap gap-3">
                  <ImageUploadButton
                    onImageSelect={handleDomainQuestionImage}
                    disabled={isProcessing}
                    label={conversationState.domainQuestionState?.pendingImageUpload?.label || "Envoyer une photo"}
                  />
                  <Button variant="ghost" size="sm" onClick={handleSkipDomainQuestionImages} disabled={isProcessing} className="hover:bg-muted/50">
                    <SkipForward className="w-4 h-4 mr-2" />
                    {(conversationState.domainQuestionState?.collectedImages?.[conversationState.domainQuestionState?.pendingImageUpload?.type || ""] || []).length > 0 
                      ? "Continuer" 
                      : "Passer"}
                  </Button>
                </div>
              )}

              {(step === "generating" || step === "modifying") && (
                <div className="flex justify-center">
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {step === "modifying" ? "Application des modifications..." : "Génération en cours..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel - Below Chat */}
          {(displayImage || (isProcessing && step === "generating")) && (
            <div className="glass-panel gradient-border p-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
              <h2 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {displayImage ? "VOTRE CRÉATION" : "GÉNÉRATION EN COURS"}
              </h2>
              
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Image */}
                <div className="flex-1 flex items-center justify-center min-h-[280px] lg:min-h-[400px] rounded-xl bg-background/40 border border-border/20 overflow-hidden relative">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt="Affiche générée"
                      className="max-w-full max-h-[400px] object-contain animate-scale-in"
                    />
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="relative mx-auto w-24 h-24">
                        <DesignerAvatar size="xl" isWorking={true} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Création en cours...</p>
                        <p className="text-xs text-muted-foreground">Notre graphiste travaille sur votre affiche</p>
                      </div>
                      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mx-auto">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-orange to-brand-blue rounded-full"
                          style={{
                            animation: "shimmer 1.5s infinite",
                            backgroundSize: "200% 100%"
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions & Feedback */}
                {displayImage && (
                  <div className="lg:w-80 space-y-4">
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => handleOpenEditor(displayImage, selectedHistoryImage?.id)} 
                        className="flex-1 border-primary/30 hover:bg-primary/10 hover:border-primary transition-all duration-300"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Éditer
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-medium glow-gold"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleDownloadWithFormat('png')}>
                            <FileImage className="w-4 h-4 mr-2" />
                            PNG (Haute qualité)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadWithFormat('jpeg')}>
                            <FileImage className="w-4 h-4 mr-2" />
                            JPEG (Fichier léger)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadWithFormat('pdf')}>
                            <FileText className="w-4 h-4 mr-2" />
                            PDF (Impression)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Inline Feedback Widget */}
                    {feedbackImageId && (
                      <InlineFeedbackWidget 
                        imageId={feedbackImageId}
                        onFeedbackSubmitted={() => setFeedbackImageId(undefined)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* History Panel - Collapsible */}
        {showHistory && (
          <div className="lg:w-72 glass-panel p-4 animate-in slide-in-from-right-5 duration-300">
            <HistoryPanel
              history={history}
              currentImage={selectedHistoryImage}
              onSelect={handleHistorySelect}
              onClear={clearHistory}
              onEdit={handleEditFromHistory}
            />
          </div>
        )}
      </main>

      {/* Visual Editor Modal */}
      {showEditor && editingImage && (
        <VisualEditor
          imageUrl={editingImage}
          onClose={() => {
            setShowEditor(false);
            setEditingImage(null);
          }}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          clearCreditError();
        }}
        creditError={creditError}
      />

      {/* Tutorial Overlay */}
      {shouldShowTutorial && user && !tutorialLoading && (
        <TutorialOverlay
          userId={user.id}
          onComplete={completeTutorial}
        />
      )}
    </div>
  );
}
