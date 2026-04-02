import { useCallback, useRef } from "react";

export function useTextToSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, lang = "fr-FR") => {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1;

    // Try to pick a French voice
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(
      (v) => v.lang.startsWith("fr") && v.name.toLowerCase().includes("google")
    ) || voices.find((v) => v.lang.startsWith("fr"));
    if (frenchVoice) utterance.voice = frenchVoice;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
