import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChatMessage,
  ConversationState,
  Domain,
  AspectRatio,
  Resolution,
  OutputFormat,
} from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INITIAL_MESSAGE =
  "Bonjour ! Je suis votre assistant graphiste. Que souhaitez-vous créer aujourd'hui ? Décrivez votre affiche en quelques mots.";

function buildPrompt(state: ConversationState) {
  const { description, domain, referenceDescription, colorPalette, needsContentImage } = state;

  let prompt = (description ?? "").trim();

  if (domain) {
    prompt = `Affiche (${domain}). ${prompt}`.trim();
  }

  if (referenceDescription) {
    prompt = `Style de référence: ${referenceDescription}. ${prompt}`.trim();
  }

  if (colorPalette?.length) {
    prompt = `${prompt}. Palette de couleurs: ${colorPalette.join(", ")}`.trim();
  }

  if (needsContentImage) {
    prompt = `${prompt}. Si l'affiche nécessite des personnes, utiliser des personnages africains.`.trim();
  }

  return prompt;
}

export function useConversation() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: INITIAL_MESSAGE,
      timestamp: new Date(),
    },
  ]);

  const [conversationState, setConversationState] = useState<ConversationState>({
    step: "greeting",
  });

  const conversationStateRef = useRef<ConversationState>(conversationState);
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const addMessage = useCallback((role: "user" | "assistant", content: string, image?: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
      image,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  const addLoadingMessage = useCallback(() => {
    const loadingMessage: ChatMessage = {
      id: "loading",
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);
  }, []);

  const removeLoadingMessage = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.id !== "loading"));
  }, []);

  const generatePoster = useCallback(
    async (stateOverride?: ConversationState) => {
      setIsProcessing(true);

      try {
        const state = stateOverride ?? conversationStateRef.current;
        const prompt = buildPrompt(state);

        if (!prompt.trim()) {
          addMessage(
            "assistant",
            "Il me manque la description de l'affiche. Dites-moi en une phrase ce que vous voulez créer (ex: ‘Affiche formation design graphique, dates, prix, contact’)."
          );
          toast.error("Description manquante");
          setConversationState({ step: "greeting" });
          return;
        }

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt,
            aspectRatio: "3:4" as AspectRatio,
            resolution: "2K" as Resolution,
            outputFormat: "png" as OutputFormat,
          },
        });

        if (error || !data?.success) {
          const msg = data?.error || error?.message || "Erreur inconnue";
          addMessage(
            "assistant",
            `Désolé, la génération a échoué : ${msg}. Pouvez-vous réessayer ?`
          );
          toast.error("Erreur lors de la génération");
          setConversationState((prev) => ({ ...prev, step: "content_image" }));
          return;
        }

        setGeneratedImage(data.imageUrl);
        setConversationState((prev) => ({ ...prev, step: "complete" }));
        addMessage(
          "assistant",
          "Votre affiche est prête ! Vous pouvez la télécharger à droite. Souhaitez-vous en créer une autre ?"
        );
        toast.success("Affiche générée avec succès !");
      } catch (err) {
        console.error("Generation error:", err);
        addMessage("assistant", "Une erreur inattendue est survenue. Veuillez réessayer.");
        toast.error("Erreur inattendue");
      } finally {
        setIsProcessing(false);
      }
    },
    [addMessage]
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      addMessage("user", content);

      const { step } = conversationStateRef.current;

      if (step === "greeting") {
        setConversationState((prev) => ({ ...prev, step: "domain", description: content }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Super. Sélectionnez le domaine de l'affiche dans la liste ci-dessous :"
          );
        }, 250);
        return;
      }

      if (step === "details") {
        setConversationState((prev) => ({
          ...prev,
          step: "reference",
          description: `${prev.description}. ${content}`,
        }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Avez-vous une image de référence (une affiche dont vous aimez le style) ? Envoyez-la maintenant, ou cliquez sur ‘Passer’."
          );
        }, 250);
      }
    },
    [addMessage]
  );

  const handleDomainSelect = useCallback(
    (domain: Domain) => {
      addMessage("user", `Domaine sélectionné : ${domain}`);
      setConversationState((prev) => ({ ...prev, step: "details", domain }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Donnez-moi les détails : textes à mettre (titre, dates, prix, contact), public visé et ambiance." 
        );
      }, 250);
    },
    [addMessage]
  );

  const handleReferenceImage = useCallback(
    async (imageDataUrl: string) => {
      addMessage("user", "Image de référence envoyée", imageDataUrl);
      addLoadingMessage();
      setIsProcessing(true);

      try {
        const { data, error } = await supabase.functions.invoke("analyze-image", {
          body: { imageData: imageDataUrl },
        });

        removeLoadingMessage();

        if (error || !data?.success) {
          addMessage(
            "assistant",
            "Je n'ai pas pu analyser l'image, mais je l'ai bien reçue. Choisissez maintenant une palette de couleurs :"
          );
          setConversationState((prev) => ({
            ...prev,
            step: "colors",
            referenceImage: imageDataUrl,
          }));
          return;
        }

        addMessage(
          "assistant",
          `Image analysée. Choisissez maintenant une palette de couleurs pour personnaliser votre affiche :`
        );

        setConversationState((prev) => ({
          ...prev,
          step: "colors",
          referenceImage: imageDataUrl,
          referenceDescription: data.description,
        }));
      } catch (err) {
        removeLoadingMessage();
        addMessage(
          "assistant",
          "Une erreur est survenue pendant l'analyse. Choisissez quand même une palette de couleurs :"
        );
        setConversationState((prev) => ({ ...prev, step: "colors", referenceImage: imageDataUrl }));
      } finally {
        setIsProcessing(false);
      }
    },
    [addMessage, addLoadingMessage, removeLoadingMessage]
  );

  const handleSkipReference = useCallback(() => {
    addMessage("user", "Passer l'image de référence");
    setConversationState((prev) => ({ ...prev, step: "colors" }));
    setTimeout(() => {
      addMessage("assistant", "Choisissez maintenant une palette de couleurs :");
    }, 250);
  }, [addMessage]);

  const handleColorsConfirm = useCallback(
    (colors: string[]) => {
      addMessage("user", `Couleurs choisies : ${colors.join(", ")}`);
      setConversationState((prev) => ({ ...prev, step: "content_image", colorPalette: colors }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Avez-vous une image à intégrer (produit, personne, logo) ? Envoyez-la, ou cliquez sur ‘Générer automatiquement’."
        );
      }, 250);
    },
    [addMessage]
  );

  const handleContentImage = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Image de contenu envoyée", imageDataUrl);

      const nextState: ConversationState = {
        ...conversationStateRef.current,
        step: "generating",
        contentImage: imageDataUrl,
        needsContentImage: false,
      };

      setConversationState(nextState);

      setTimeout(() => {
        addMessage("assistant", "Parfait. Génération de votre affiche en cours...");
        generatePoster(nextState);
      }, 250);
    },
    [addMessage, generatePoster]
  );

  const handleSkipContentImage = useCallback(() => {
    addMessage("user", "Générer l'image de contenu automatiquement");

    const nextState: ConversationState = {
      ...conversationStateRef.current,
      step: "generating",
      needsContentImage: true,
    };

    setConversationState(nextState);

    setTimeout(() => {
      addMessage(
        "assistant",
        "Compris. Génération de votre affiche en cours (avec des personnages africains si nécessaire)..."
      );
      generatePoster(nextState);
    }, 250);
  }, [addMessage, generatePoster]);

  const resetConversation = useCallback(() => {
    setMessages([
      {
        id: "initial",
        role: "assistant",
        content: INITIAL_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    setConversationState({ step: "greeting" });
    setGeneratedImage(null);
  }, []);

  return {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    handleUserMessage,
    handleDomainSelect,
    handleReferenceImage,
    handleSkipReference,
    handleColorsConfirm,
    handleContentImage,
    handleSkipContentImage,
    resetConversation,
  };
}
