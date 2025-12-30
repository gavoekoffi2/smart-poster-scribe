import { useState, useRef, useCallback } from "react";
import { ChatMessage, ConversationState, Domain, AspectRatio, Resolution, OutputFormat } from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INITIAL_MESSAGE = "Bonjour ! 👋 Je suis votre assistant graphiste. Que souhaitez-vous créer aujourd'hui ? Décrivez-moi votre projet d'affiche en quelques mots.";

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

  const handleUserMessage = useCallback(async (content: string) => {
    addMessage("user", content);
    
    const { step } = conversationState;

    if (step === "greeting") {
      // User described their project, ask for domain
      setConversationState((prev) => ({ ...prev, step: "domain", description: content }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Super projet ! 🎨 Pour mieux vous aider, veuillez sélectionner le domaine de votre affiche dans la liste ci-dessous :"
        );
      }, 500);
    } else if (step === "details") {
      // Additional details provided
      setConversationState((prev) => ({ 
        ...prev, 
        step: "reference",
        description: `${prev.description}. ${content}`
      }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Parfait ! Avez-vous une image de référence (une affiche existante dont vous aimez le style) ? Si oui, envoyez-la maintenant. Sinon, tapez 'non' ou 'passer'."
        );
      }, 500);
    }
  }, [conversationState, addMessage]);

  const handleDomainSelect = useCallback((domain: Domain) => {
    addMessage("user", `Domaine sélectionné : ${domain}`);
    setConversationState((prev) => ({ ...prev, step: "details", domain }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Excellent choix ! Maintenant, donnez-moi plus de détails sur votre affiche : quel message voulez-vous transmettre, quels textes inclure, quelle ambiance souhaitez-vous ?"
      );
    }, 500);
  }, [addMessage]);

  const handleReferenceImage = useCallback(async (imageDataUrl: string) => {
    addMessage("user", "Image de référence envoyée", imageDataUrl);
    addLoadingMessage();
    setIsProcessing(true);

    try {
      // Analyze the reference image
      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { imageData: imageDataUrl },
      });

      removeLoadingMessage();

      if (error || !data?.success) {
        addMessage("assistant", "Je n'ai pas pu analyser l'image, mais je l'ai bien reçue. Passons aux couleurs ! Choisissez une palette de couleurs pour votre affiche :");
      } else {
        addMessage(
          "assistant",
          `J'ai analysé votre image de référence ! Je note un style : ${data.description?.substring(0, 100)}... Maintenant, choisissez une palette de couleurs pour personnaliser votre affiche :`
        );
        setConversationState((prev) => ({ 
          ...prev, 
          referenceImage: imageDataUrl,
          referenceDescription: data.description 
        }));
      }

      setConversationState((prev) => ({ ...prev, step: "colors", referenceImage: imageDataUrl }));
    } catch (err) {
      removeLoadingMessage();
      addMessage("assistant", "Une erreur est survenue lors de l'analyse. Passons aux couleurs ! Choisissez une palette :");
      setConversationState((prev) => ({ ...prev, step: "colors", referenceImage: imageDataUrl }));
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage, addLoadingMessage, removeLoadingMessage]);

  const handleSkipReference = useCallback(() => {
    addMessage("user", "Pas d'image de référence");
    setConversationState((prev) => ({ ...prev, step: "colors" }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Pas de souci ! Choisissez maintenant une palette de couleurs pour personnaliser votre affiche :"
      );
    }, 500);
  }, [addMessage]);

  const handleColorsConfirm = useCallback((colors: string[]) => {
    addMessage("user", `Couleurs choisies : ${colors.join(", ")}`);
    setConversationState((prev) => ({ ...prev, step: "content_image", colorPalette: colors }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Parfait ! Avez-vous une image spécifique que vous souhaitez intégrer dans l'affiche (photo d'un produit, personne, etc.) ? Si oui, envoyez-la. Sinon, tapez 'non' et je générerai une image adaptée au contexte."
      );
    }, 500);
  }, [addMessage]);

  const handleContentImage = useCallback((imageDataUrl: string) => {
    addMessage("user", "Image de contenu envoyée", imageDataUrl);
    setConversationState((prev) => ({ 
      ...prev, 
      step: "generating",
      contentImage: imageDataUrl,
      needsContentImage: false
    }));
    setTimeout(() => {
      addMessage("assistant", "Parfait ! J'ai tous les éléments. Génération de votre affiche en cours... 🎨");
      generatePoster();
    }, 500);
  }, [addMessage]);

  const handleSkipContentImage = useCallback(() => {
    addMessage("user", "Pas d'image de contenu, générer automatiquement");
    setConversationState((prev) => ({ 
      ...prev, 
      step: "generating",
      needsContentImage: true
    }));
    setTimeout(() => {
      addMessage("assistant", "Compris ! Je vais générer une image adaptée au contexte (avec des personnages africains si nécessaire). Génération de votre affiche en cours... 🎨");
      generatePoster();
    }, 500);
  }, [addMessage]);

  const generatePoster = useCallback(async () => {
    setIsProcessing(true);

    try {
      const { description, domain, referenceDescription, colorPalette, contentImage, needsContentImage } = conversationState;

      // Build the prompt
      let prompt = description || "";
      
      if (domain) {
        prompt = `Affiche de type ${domain}. ${prompt}`;
      }

      if (referenceDescription) {
        prompt = `Style de référence: ${referenceDescription}. ${prompt}`;
      }

      if (colorPalette && colorPalette.length > 0) {
        prompt = `${prompt}. Utiliser la palette de couleurs: ${colorPalette.join(", ")}`;
      }

      if (needsContentImage) {
        prompt = `${prompt}. Si l'affiche nécessite des personnes, utiliser des personnages africains.`;
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
        addMessage("assistant", `Désolé, une erreur est survenue lors de la génération : ${data?.error || error?.message || "Erreur inconnue"}. Voulez-vous réessayer ?`);
        toast.error("Erreur lors de la génération");
      } else {
        setGeneratedImage(data.imageUrl);
        setConversationState((prev) => ({ ...prev, step: "complete" }));
        addMessage(
          "assistant",
          "🎉 Votre affiche est prête ! Vous pouvez la télécharger ci-dessous. Voulez-vous en créer une autre ou apporter des modifications ?"
        );
        toast.success("Affiche générée avec succès !");
      }
    } catch (err) {
      console.error("Generation error:", err);
      addMessage("assistant", "Une erreur inattendue est survenue. Veuillez réessayer.");
      toast.error("Erreur inattendue");
    } finally {
      setIsProcessing(false);
    }
  }, [conversationState, addMessage]);

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
