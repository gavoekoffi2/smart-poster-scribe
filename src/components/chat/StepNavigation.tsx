import { ChevronLeft } from "lucide-react";
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
  reference: "Image de référence",
  colors: "Couleurs",
  logo: "Logo",
  logo_position: "Position logo",
  content_image: "Image de contenu",
};

interface StepNavigationProps {
  currentStep: ConversationState["step"];
  onGoBack: (targetStep: ConversationState["step"]) => void;
  disabled?: boolean;
}

export function StepNavigation({ currentStep, onGoBack, disabled }: StepNavigationProps) {
  // Ne pas afficher la navigation pour l'étape initiale, l'analyse ou la génération
  if (currentStep === "greeting" || currentStep === "analyzing" || currentStep === "generating" || currentStep === "modifying") {
    return null;
  }

  const currentIndex = STEP_ORDER.indexOf(currentStep as typeof STEP_ORDER[number]);
  
  // Trouver l'étape précédente valide
  const getPreviousStep = (): ConversationState["step"] | null => {
    // Pour custom_domain, retourner à domain
    if (currentStep === "custom_domain") return "domain";
    
    // Pour logo_position, retourner à logo
    if (currentStep === "logo_position") return "logo";
    
    // Pour details après domain, on pourrait revenir à domain
    if (currentStep === "details") return "domain";
    
    // Pour speakers_check, retourner à details ou domain
    if (currentStep === "speakers_check") return "details";
    
    // Pour main_speaker_photo, retourner à speakers_check
    if (currentStep === "main_speaker_photo") return "speakers_check";
    
    // Pour main_speaker_name, retourner à main_speaker_photo
    if (currentStep === "main_speaker_name") return "main_speaker_photo";
    
    // Pour guests_check, retourner à main_speaker_name ou speakers_check
    if (currentStep === "guests_check") return "main_speaker_photo";
    
    // Pour guest_photo, retourner à guests_check
    if (currentStep === "guest_photo") return "guests_check";
    
    // Pour guest_name, retourner à guest_photo
    if (currentStep === "guest_name") return "guest_photo";
    
    // Pour les autres étapes, trouver l'étape précédente
    if (currentIndex > 0) {
      // Sauter les étapes intermédiaires non pertinentes
      const previousSteps = STEP_ORDER.slice(0, currentIndex).reverse();
      for (const step of previousSteps) {
        if (step === "greeting" || step === "domain" || step === "details" || 
            step === "speakers_check" || step === "main_speaker_photo" || step === "guests_check" || step === "guest_photo" ||
            step === "reference" || step === "colors" || step === "logo" || step === "content_image") {
          return step;
        }
      }
    }
    return null;
  };

  const previousStep = getPreviousStep();
  
  if (!previousStep) return null;

  return (
    <div className="flex items-center gap-2 mb-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onGoBack(previousStep)}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-xs"
      >
        <ChevronLeft className="w-3 h-3 mr-1" />
        Retour à {STEP_LABELS[previousStep] || previousStep}
      </Button>
    </div>
  );
}

// Composant pour afficher la progression
export function StepIndicator({ currentStep }: { currentStep: ConversationState["step"] }) {
  const mainSteps = ["domain", "details", "speakers_check", "reference", "colors", "logo", "content_image", "complete"];
  const currentIndex = mainSteps.indexOf(currentStep as string);
  
  // Mapper les sous-étapes aux étapes principales
  const stepMapping: Record<string, string> = {
    custom_domain: "domain",
    main_speaker_photo: "speakers_check",
    main_speaker_name: "speakers_check",
    guests_check: "speakers_check",
    guest_photo: "speakers_check",
    guest_name: "speakers_check",
    logo_position: "logo",
  };
  
  const mappedStep = stepMapping[currentStep] || currentStep;
  const mappedIndex = mainSteps.indexOf(mappedStep);
  
  // Ne pas afficher pour les étapes non principales
  if (mappedIndex === -1 && currentStep !== "greeting") return null;

  const stepLabels = ["Domaine", "Détails", "Intervenants", "Référence", "Couleurs", "Logo", "Image", "Terminé"];

  return (
    <div className="flex items-center justify-center gap-1 py-2 px-4 overflow-x-auto">
      {mainSteps.map((step, index) => {
        const isActive = index === mappedIndex || (currentStep === "greeting" && index === 0);
        const isPast = index < mappedIndex;
        const isFuture = index > mappedIndex && currentStep !== "greeting";

        return (
          <div key={step} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium transition-all
                ${isActive ? "bg-primary text-primary-foreground scale-110" : ""}
                ${isPast ? "bg-primary/30 text-primary" : ""}
                ${isFuture ? "bg-muted text-muted-foreground" : ""}
              `}
            >
              {index + 1}
            </div>
            {index < mainSteps.length - 1 && (
              <div 
                className={`w-4 h-0.5 mx-0.5 transition-all ${
                  isPast ? "bg-primary/50" : "bg-muted"
                }`} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
