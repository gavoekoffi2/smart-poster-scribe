import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types/generation";
import { Bot, User, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isAssistant
            ? "bg-primary/20 text-primary"
            : "bg-accent/20 text-accent"
        )}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isAssistant
            ? "bg-card border border-border/50 text-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">En train d'écrire...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.image && (
              <img
                src={message.image}
                alt="Image partagée"
                className="mt-2 rounded-lg max-w-full max-h-48 object-contain"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
