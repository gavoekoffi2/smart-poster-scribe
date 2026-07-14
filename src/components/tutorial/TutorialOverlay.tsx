import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TutorialStep } from "./TutorialStep";
import { supabase } from "@/integrations/supabase/client";

interface TutorialOverlayProps {
  userId: string;
  onComplete: () => void;
}

export function TutorialOverlay({ userId, onComplete }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const rawSteps = t("tutorial.steps", { returnObjects: true }) as Array<{ title: string; description: string }>;
  const steps = (Array.isArray(rawSteps) ? rawSteps : []).map((s, i) => ({
    id: i + 1,
    title: s.title,
    description: s.description,
    position: "center" as const,
  }));
  const totalSteps = steps.length;

  const markCompleted = async () => {
    try {
      await supabase.from("profiles").update({ tutorial_completed: true }).eq("user_id", userId);
    } catch (err) {
      console.error("Error updating tutorial status:", err);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep((p) => p + 1);
  };
  const handleSkip = async () => {
    await markCompleted();
    setIsVisible(false);
    onComplete();
  };
  const handleComplete = async () => {
    await markCompleted();
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible || totalSteps === 0) return null;

  return (
    <TutorialStep
      step={steps[currentStep]}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onSkip={handleSkip}
      onComplete={handleComplete}
      isLastStep={currentStep === totalSteps - 1}
    />
  );
}
