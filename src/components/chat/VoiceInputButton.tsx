import { useState, useRef, useCallback } from "react";
import { Mic, Loader2, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RecordingState = "idle" | "recording" | "processing";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Votre navigateur ne supporte pas l'enregistrement audio");
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      setPermissionDenied(false);
      chunksRef.current = [];

      // Determine best supported format
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());

        if (chunksRef.current.length === 0) {
          toast.error("L'enregistrement est trop court. Parlez plus longtemps.");
          setState("idle");
          return;
        }

        setState("processing");

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          
          // Check minimum audio length (roughly 0.5 seconds based on size)
          if (audioBlob.size < 5000) {
            toast.error("L'enregistrement est trop court. Parlez plus longtemps.");
            setState("idle");
            return;
          }

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;

            try {
              const { data, error } = await supabase.functions.invoke("transcribe-audio", {
                body: { audioBase64: base64Audio },
              });

              if (error) {
                console.error("Transcription error:", error);
                toast.error("Erreur de transcription. Veuillez réessayer.");
                setState("idle");
                return;
              }

              if (data?.text && data.text.trim()) {
                onTranscript(data.text.trim());
                toast.success("Transcription réussie !");
              } else {
                toast.warning("Aucun texte détecté. Parlez plus clairement.");
              }
            } catch (invokeError) {
              console.error("Function invoke error:", invokeError);
              toast.error("Erreur de transcription. Veuillez réessayer.");
            }

            setState("idle");
          };

          reader.onerror = () => {
            toast.error("Erreur lors de la lecture de l'audio");
            setState("idle");
          };
        } catch (processError) {
          console.error("Audio processing error:", processError);
          toast.error("Erreur lors du traitement de l'audio");
          setState("idle");
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");
    } catch (error) {
      console.error("Recording start error:", error);
      
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur");
      } else {
        toast.error("Impossible d'accéder au microphone");
      }
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const handleClick = useCallback(() => {
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
    // If processing, do nothing
  }, [state, startRecording, stopRecording]);

  const getButtonContent = () => {
    switch (state) {
      case "recording":
        return <Mic className="w-4 h-4 animate-pulse" />;
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      default:
        return permissionDenied ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />;
    }
  };

  const getButtonTitle = () => {
    switch (state) {
      case "recording":
        return "Cliquez pour arrêter l'enregistrement";
      case "processing":
        return "Transcription en cours...";
      default:
        return permissionDenied 
          ? "Microphone non autorisé - Cliquez pour réessayer" 
          : "Cliquez pour parler";
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={disabled || state === "processing"}
      title={getButtonTitle()}
      className={cn(
        "transition-all duration-300",
        state === "recording" && "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30 hover:border-red-500",
        state === "processing" && "bg-orange-500/20 border-orange-500 text-orange-500",
        permissionDenied && state === "idle" && "border-destructive/50 text-destructive"
      )}
    >
      {getButtonContent()}
    </Button>
  );
}
