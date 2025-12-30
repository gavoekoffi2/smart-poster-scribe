import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types/generation";
import { DesignerAvatar } from "@/components/DesignerAvatar";
import { User } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-4 animate-fade-up",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      {isAssistant ? (
        <div className="flex-shrink-0">
          <DesignerAvatar size="sm" isWorking={message.isLoading} />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/20 border border-primary/30">
          <User className="w-5 h-5 text-primary" />
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "max-w-[80%] px-5 py-4 shadow-lg transition-all duration-300",
          isAssistant
            ? "chat-bubble-assistant"
            : "chat-bubble-user"
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
            <span className="text-sm text-muted-foreground">Création en cours...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            {message.image && (
              <img
                src={message.image}
                alt="Image partagée"
                className="mt-3 rounded-lg max-w-full max-h-48 object-contain border border-border/20"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
