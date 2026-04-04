import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTextToSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    if (!text || text.trim().length === 0) return;

    // Stop any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: { text },
      });

      if (error) {
        console.error("TTS edge function error:", error);
        // Fallback to Web Speech API
        fallbackSpeak(text);
        return;
      }

      if (data?.audioBase64 && data?.mimeType) {
        const audioUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          isSpeakingRef.current = false;
          audioRef.current = null;
        };

        audio.onerror = () => {
          console.error("Audio playback error, falling back to Web Speech");
          isSpeakingRef.current = false;
          audioRef.current = null;
          fallbackSpeak(text);
        };

        await audio.play();
      } else {
        console.warn("No audio data received, falling back");
        fallbackSpeak(text);
      }
    } catch (err) {
      console.error("TTS error:", err);
      fallbackSpeak(text);
    }
  }, []);

  const fallbackSpeak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (v) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("google")
    ) || voices.find((v) => v.lang.startsWith("fr"));
    if (frenchVoice) utterance.voice = frenchVoice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
