import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TutorialMascot } from "./TutorialMascot";

interface TutorialStepProps {
  step: {
    id: number;
    title: string;
    description: string;
    highlight?: string;
    position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isLastStep: boolean;
}

export function TutorialStep({
  step,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  onComplete,
  isLastStep
}: TutorialStepProps) {
  const positionClasses = {
    "center": "items-center justify-center",
    "top-left": "items-start justify-start pt-32 pl-8",
    "top-right": "items-start justify-end pt-32 pr-8",
    "bottom-left": "items-end justify-start pb-32 pl-8",
    "bottom-right": "items-end justify-end pb-32 pr-8"
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`fixed inset-0 z-50 flex ${positionClasses[step.position]}`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
        
        {/* Content Card */}
        <motion.div 
          className="relative max-w-md mx-4"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Tutorial Card */}
          <div className="glass-panel p-6 rounded-3xl border-2 border-primary/30 shadow-2xl shadow-primary/20">
            {/* Mascot */}
            <div className="flex justify-center -mt-16 mb-4">
              <TutorialMascot 
                isWaving={step.id === 1} 
                isPointing={step.id > 1 && !isLastStep}
                size="lg" 
              />
            </div>
            
            {/* Progress indicator */}
            <div className="flex gap-1.5 justify-center mb-4">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx < currentStep 
                      ? "w-6 bg-primary" 
                      : idx === currentStep 
                        ? "w-8 bg-primary"
                        : "w-4 bg-muted"
                  }`}
                  initial={false}
                  animate={{ 
                    scale: idx === currentStep ? [1, 1.1, 1] : 1 
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
            
            {/* Step number */}
            <div className="text-center mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Étape {currentStep + 1} sur {totalSteps}
              </span>
            </div>
            
            {/* Title */}
            <motion.h3 
              className="text-xl font-bold text-center mb-3 gradient-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {step.title}
            </motion.h3>
            
            {/* Description */}
            <motion.p 
              className="text-muted-foreground text-center mb-6 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {step.description}
            </motion.p>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Passer
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={onComplete}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2"
                >
                  <Check className="w-4 h-4" />
                  C'est compris !
                </Button>
              ) : (
                <Button
                  onClick={onNext}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <motion.div
            className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full blur-lg"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-4 -right-4 w-12 h-12 bg-accent/20 rounded-full blur-lg"
            animate={{ scale: [1.5, 1, 1.5], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
