import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types/generation";
import { DesignerAvatar } from "@/components/DesignerAvatar";
import { User, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isAssistant ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      {isAssistant ? (
        <div className="flex-shrink-0">
          <DesignerAvatar size="sm" isWorking={message.isLoading} />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-brand-orange to-brand-blue">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
          isAssistant
            ? "bg-card/80 backdrop-blur-sm border border-border/40 text-foreground"
            : "bg-gradient-to-br from-brand-orange to-brand-blue text-primary-foreground"
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-sm text-muted-foreground">En train de créer...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            {message.image && (
              <img
                src={message.image}
                alt="Image partagée"
                className="mt-3 rounded-xl max-w-full max-h-48 object-contain border border-border/20"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
