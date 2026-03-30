import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        if (blob.size < 100) {
          toast.error("Audio trop court, réessayez.");
          return;
        }

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const { data, error } = await supabase.functions.invoke("transcribe-audio", {
            body: { audioBase64: base64, mimeType: mediaRecorder.mimeType },
          });

          if (error) throw error;

          const text = data?.text?.trim();
          if (text) {
            onTranscript(text);
          } else {
            toast.info("Aucun texte détecté, réessayez.");
          }
        } catch (err) {
          console.error("Transcription error:", err);
          toast.error("Erreur de transcription. Réessayez.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      toast.info("🎙️ Parlez maintenant...");
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Veuillez autoriser l'accès au microphone.");
    }
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const busy = isRecording || isTranscribing;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleRecording}
      disabled={disabled || isTranscribing}
      title={isRecording ? "Arrêter l'enregistrement" : isTranscribing ? "Transcription..." : "Parler"}
      className={cn(
        "transition-all duration-300 shrink-0",
        isRecording && "border-destructive text-destructive hover:bg-destructive/10 hover:border-destructive animate-pulse",
        isTranscribing && "opacity-70"
      )}
    >
      {isTranscribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}
