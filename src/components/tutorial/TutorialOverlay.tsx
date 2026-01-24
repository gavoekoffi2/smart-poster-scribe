import { useState, useEffect } from "react";
import { TutorialStep } from "./TutorialStep";
import { supabase } from "@/integrations/supabase/client";

interface TutorialOverlayProps {
  userId: string;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 1,
    title: "Bienvenue sur Graphiste GPT ! 🎨",
    description: "Je suis votre assistant graphiste virtuel. Je vais vous guider à travers les fonctionnalités de la plateforme pour que vous puissiez créer des affiches incroyables en quelques clics !",
    position: "center" as const
  },
  {
    id: 2,
    title: "Choisissez votre domaine",
    description: "Commencez par sélectionner le type d'affiche que vous souhaitez créer : restaurant, événement, église, e-commerce, et bien plus encore !",
    position: "center" as const
  },
  {
    id: 3,
    title: "Décrivez votre projet",
    description: "Expliquez-moi ce que vous voulez : le thème, les couleurs, le texte principal... Plus vous êtes précis, plus le résultat sera parfait !",
    position: "center" as const
  },
  {
    id: 4,
    title: "Ajoutez vos éléments",
    description: "Vous pouvez ajouter votre logo, des photos de vos produits, et même une image de référence pour m'inspirer. Tout est personnalisable !",
    position: "center" as const
  },
  {
    id: 5,
    title: "Choisissez le format",
    description: "Sélectionnez le format et la résolution de votre affiche. Plus la résolution est haute, plus les détails seront nets pour l'impression.",
    position: "center" as const
  },
  {
    id: 6,
    title: "Générez et téléchargez ! ✨",
    description: "Cliquez sur 'Générer' et laissez la magie opérer ! En quelques secondes, votre affiche professionnelle sera prête à télécharger.",
    position: "center" as const
  }
];

export function TutorialOverlay({ userId, onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = async () => {
    await markTutorialCompleted();
    setIsVisible(false);
    onComplete();
  };

  const handleComplete = async () => {
    await markTutorialCompleted();
    setIsVisible(false);
    onComplete();
  };

  const markTutorialCompleted = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tutorial_completed: true })
        .eq("user_id", userId);
      
      if (error) {
        console.error("Error marking tutorial as completed:", error);
      }
    } catch (err) {
      console.error("Error updating tutorial status:", err);
    }
  };

  if (!isVisible) return null;

  return (
    <TutorialStep
      step={TUTORIAL_STEPS[currentStep]}
      currentStep={currentStep}
      totalSteps={TUTORIAL_STEPS.length}
      onNext={handleNext}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isLastStep={currentStep === TUTORIAL_STEPS.length - 1}
    />
  );
}
