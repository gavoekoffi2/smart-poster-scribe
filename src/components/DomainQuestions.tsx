import { DomainQuestion } from "@/types/generation";
import { Input } from "@/components/ui/input";
import { MessageCircleQuestion } from "lucide-react";

interface DomainQuestionsProps {
  questions: DomainQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  disabled?: boolean;
}

export function DomainQuestions({ questions, answers, onAnswerChange, disabled }: DomainQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageCircleQuestion className="w-4 h-4 text-primary" />
        <span>Questions pour affiner votre affiche</span>
      </div>
      <div className="space-y-3">
        {questions.map((question) => (
          <div key={question.id} className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              {question.question}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <Input
              value={answers[question.id] || ""}
              onChange={(e) => onAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              disabled={disabled}
              className="bg-card/50 border-border/50 focus:border-primary/50 text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
