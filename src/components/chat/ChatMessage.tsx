import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/types/generation";
import { DesignerAvatar } from "@/components/DesignerAvatar";
import { User } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

// Simple markdown-like formatting for chat messages
function formatMessage(content: string): React.ReactNode {
  // Split by newlines and process each line
  const lines = content.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Process bold text (**text**)
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedLine = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIndex} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    // Handle bullet points
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
    const isEmoji = line.trim().match(/^[📋📝💡🎨]/);
    
    if (isBullet) {
      return (
        <div key={lineIndex} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-primary flex-shrink-0">{line.trim().charAt(0)}</span>
          <span>{formattedLine.map((part, i) => 
            typeof part === 'string' ? part.slice(line.indexOf(line.trim().charAt(0)) === 0 ? 2 : 1).trim() : part
          )}</span>
        </div>
      );
    }
    
    // Regular line with possible emoji prefix
    return (
      <div key={lineIndex} className={cn(
        lineIndex > 0 && "mt-1",
        isEmoji && "font-medium"
      )}>
        {formattedLine}
      </div>
    );
  });
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
            <div className="text-sm leading-relaxed">
              {formatMessage(message.content)}
            </div>
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
