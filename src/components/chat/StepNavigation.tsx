import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationState } from "@/types/generation";

// Ordre des étapes pour la navigation
const STEP_ORDER = [
  "greeting",
  "domain",
  "custom_domain", 
  "details",
  "speakers_check",
  "main_speaker_photo",
  "main_speaker_name",
  "guests_check",
  "guest_photo",
  "guest_name",
  "product_character_check",
  "product_character_interaction",
  "reference",
  "colors",
  "logo",
  "logo_position",
  "content_image",
  "generating",
  "complete",
] as const;

const STEP_LABELS: Record<string, string> = {
  greeting: "Description",
  domain: "Domaine",
  custom_domain: "Domaine personnalisé",
  details: "Détails",
  speakers_check: "Orateurs",
  main_speaker_photo: "Photo orateur",
  main_speaker_name: "Nom orateur",
  guests_check: "Invités",
  guest_photo: "Photo invité",
  guest_name: "Nom invité",
  product_character_check: "Personnage produit",
  product_character_interaction: "Interaction produit",
  reference: "Image de référence",
  colors: "Couleurs",
  logo: "Logo",
  logo_position: "Position logo",
  content_image: "Image de contenu",
  complete: "Terminé",
};

interface StepNavigationProps {
  currentStep: ConversationState["step"];
  onGoBack: (targetStep: ConversationState["step"]) => void;
  onGoForward?: (targetStep: ConversationState["step"]) => void;
  visitedSteps?: ConversationState["step"][];
  disabled?: boolean;
}

export function StepNavigation({ currentStep, onGoBack, onGoForward, visitedSteps = [], disabled }: StepNavigationProps) {
  // Ne pas afficher la navigation pour l'étape initiale, l'analyse ou la génération
  if (currentStep === "greeting" || currentStep === "analyzing" || currentStep === "generating" || currentStep === "modifying") {
    return null;
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep as typeof STEP_ORDER[number]);
  
  // Trouver l'étape précédente valide
  const getPreviousStep = (): ConversationState["step"] | null => {
    if (currentStep === "custom_domain") return "domain";
    if (currentStep === "logo_position") return "logo";
    if (currentStep === "details") return "domain";
    if (currentStep === "speakers_check") return "details";
    if (currentStep === "main_speaker_photo") return "speakers_check";
    if (currentStep === "main_speaker_name") return "main_speaker_photo";
    if (currentStep === "guests_check") return "main_speaker_photo";
    if (currentStep === "guest_photo") return "guests_check";
    if (currentStep === "guest_name") return "guest_photo";
    if (currentStep === "product_character_check") return "details";
    if (currentStep === "product_character_interaction") return "product_character_check";
    
    if (currentIndex > 0) {
      const previousSteps = STEP_ORDER.slice(0, currentIndex).reverse();
      for (const step of previousSteps) {
        if (step === "greeting" || step === "domain" || step === "details" || 
            step === "speakers_check" || step === "main_speaker_photo" || step === "guests_check" || step === "guest_photo" ||
            step === "product_character_check" || step === "product_character_interaction" ||
            step === "reference" || step === "colors" || step === "logo" || step === "content_image") {
          return step;
        }
      }
    }
    return null;
  };

  // Trouver l'étape suivante valide (seulement parmi les étapes déjà visitées)
  const getNextStep = (): ConversationState["step"] | null => {
    if (!visitedSteps || visitedSteps.length === 0) return null;
    
    const currentVisitedIndex = visitedSteps.indexOf(currentStep);
    if (currentVisitedIndex === -1 || currentVisitedIndex >= visitedSteps.length - 1) {
      return null;
    }
    
    // Retourner la prochaine étape visitée
    return visitedSteps[currentVisitedIndex + 1];
  };

  const previousStep = getPreviousStep();
  const nextStep = getNextStep();
  
  const hasPrevious = !!previousStep;
  const hasNext = !!nextStep && onGoForward;

  if (!hasPrevious && !hasNext) return null;

  return (
    <div className="flex items-center justify-between gap-2 mb-3 px-1">
      {hasPrevious ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onGoBack(previousStep)}
          disabled={disabled}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 text-xs group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{STEP_LABELS[previousStep] || "Retour"}</span>
          <span className="sm:hidden">Retour</span>
        </Button>
      ) : (
        <div />
      )}
      
      {hasNext && onGoForward ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onGoForward(nextStep)}
          disabled={disabled}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 text-xs group"
        >
          <span className="hidden sm:inline">{STEP_LABELS[nextStep] || "Suivant"}</span>
          <span className="sm:hidden">Suivant</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}

// Composant pour afficher la progression avec style amélioré
export function StepIndicator({ currentStep }: { currentStep: ConversationState["step"] }) {
  const mainSteps = ["domain", "details", "speakers_check", "reference", "colors", "logo", "content_image", "complete"];
  
  // Mapper les sous-étapes aux étapes principales
  const stepMapping: Record<string, string> = {
    custom_domain: "domain",
    main_speaker_photo: "speakers_check",
    main_speaker_name: "speakers_check",
    guests_check: "speakers_check",
    guest_photo: "speakers_check",
    guest_name: "speakers_check",
    product_character_check: "speakers_check",
    product_character_interaction: "speakers_check",
    logo_position: "logo",
  };
  
  const mappedStep = stepMapping[currentStep] || currentStep;
  const mappedIndex = mainSteps.indexOf(mappedStep);
  
  if (mappedIndex === -1 && currentStep !== "greeting") return null;

  const stepLabels = ["Domaine", "Détails", "Contenu", "Style", "Couleurs", "Logo", "Image", "Fini"];

  return (
    <div className="relative pt-4 pb-8 px-4 overflow-visible">
      {/* Background decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
      
      <div className="flex items-center justify-center gap-1 relative z-10">
        {mainSteps.map((step, index) => {
          const isActive = index === mappedIndex || (currentStep === "greeting" && index === 0);
          const isPast = index < mappedIndex;
          const isFuture = index > mappedIndex && currentStep !== "greeting";

          return (
            <div key={step} className="flex items-center group">
              <div className="relative">
                {/* Glow effect for active step */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-primary/40 blur-md animate-pulse" />
                )}
                
                <div
                  className={`
                    relative flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold 
                    transition-all duration-500 ease-out
                    ${isActive ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground scale-110 shadow-lg shadow-primary/30" : ""}
                    ${isPast ? "bg-primary/20 text-primary border border-primary/30" : ""}
                    ${isFuture ? "bg-muted/50 text-muted-foreground border border-border/50" : ""}
                  `}
                >
                  {isPast ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                
                {/* Step label - always visible for active, hover for others */}
                <div className={`
                  absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-[9px] font-medium transition-all duration-300
                  ${isActive ? "text-primary opacity-100" : "text-muted-foreground opacity-70 group-hover:opacity-100"}
                `}>
                  {stepLabels[index]}
                </div>
              </div>
              
              {/* Connector line */}
              {index < mainSteps.length - 1 && (
                <div className="relative w-6 h-0.5 mx-1">
                  <div className="absolute inset-0 bg-border/50 rounded-full" />
                  <div 
                    className={`
                      absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out
                      ${isPast ? "w-full bg-gradient-to-r from-primary/60 to-primary/40" : "w-0 bg-primary"}
                    `}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}