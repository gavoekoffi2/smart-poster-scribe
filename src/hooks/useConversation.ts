import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChatMessage,
  ConversationState,
  Domain,
  AspectRatio,
  Resolution,
  OutputFormat,
  ExtractedInfo,
} from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INITIAL_MESSAGE =
  "Bonjour ! Je suis votre assistant graphiste. Décrivez-moi l'affiche que vous souhaitez créer (type, textes, dates, prix, contact, etc.)";

function buildPrompt(state: ConversationState) {
  const { 
    description, 
    domain, 
    customDomain,
    referenceDescription, 
    colorPalette, 
    needsContentImage,
    extractedInfo 
  } = state;

  const parts: string[] = [];

  // Domain
  const domainLabel = domain === "other" && customDomain ? customDomain : domain;
  if (domainLabel) {
    parts.push(`Affiche (${domainLabel}).`);
  }

  // Reference style
  if (referenceDescription) {
    parts.push(`Style de référence: ${referenceDescription}.`);
  }

  // Extracted info details
  if (extractedInfo) {
    const details: string[] = [];
    if (extractedInfo.title) details.push(`Titre: ${extractedInfo.title}`);
    if (extractedInfo.organizer) details.push(`Organisateur: ${extractedInfo.organizer}`);
    if (extractedInfo.dates) details.push(`Dates: ${extractedInfo.dates}`);
    if (extractedInfo.prices) details.push(`Prix: ${extractedInfo.prices}`);
    if (extractedInfo.contact) details.push(`Contact: ${extractedInfo.contact}`);
    if (extractedInfo.location) details.push(`Lieu: ${extractedInfo.location}`);
    if (extractedInfo.targetAudience) details.push(`Public: ${extractedInfo.targetAudience}`);
    if (extractedInfo.additionalDetails) details.push(extractedInfo.additionalDetails);
    
    if (details.length > 0) {
      parts.push(`Détails: ${details.join(". ")}.`);
    }
  }

  // Original description (may contain additional context)
  if (description) {
    parts.push(description);
  }

  // Colors
  if (colorPalette?.length) {
    parts.push(`Palette de couleurs: ${colorPalette.join(", ")}.`);
  }

  // African characters instruction
  if (needsContentImage) {
    parts.push("Si l'affiche nécessite des personnes, utiliser des personnages africains.");
  }

  return parts.join(" ").trim();
}

function formatMissingInfo(missingInfo: string[]): string {
  const translations: Record<string, string> = {
    dates: "les dates",
    contact: "le contact (téléphone/email)",
    prix: "les prix/tarifs",
    prices: "les prix/tarifs",
    location: "le lieu",
    lieu: "le lieu",
    organizer: "l'organisateur",
    organisateur: "l'organisateur",
    title: "le titre",
    titre: "le titre",
  };

  const translated = missingInfo.map((info) => translations[info.toLowerCase()] || info);
  
  if (translated.length === 0) return "";
  if (translated.length === 1) return translated[0];
  
  const last = translated.pop();
  return `${translated.join(", ")} et ${last}`;
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
  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(null);

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
            "Il me manque des informations pour créer l'affiche. Pouvez-vous me décrire ce que vous voulez ?"
          );
          toast.error("Description manquante");
          setConversationState({ step: "greeting" });
          return;
        }

        console.log("Generating with prompt:", prompt);

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
            `Désolé, la génération a échoué : ${msg}. Voulez-vous réessayer ?`
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

      // Initial greeting - analyze the request
      if (step === "greeting") {
        setConversationState((prev) => ({ ...prev, step: "analyzing", description: content }));
        addLoadingMessage();
        setIsProcessing(true);

        try {
          const { data, error } = await supabase.functions.invoke("analyze-request", {
            body: { userText: content },
          });

          removeLoadingMessage();
          setIsProcessing(false);

          if (error || !data?.success) {
            // Fallback: just ask for domain
            setConversationState((prev) => ({ ...prev, step: "domain" }));
            addMessage("assistant", "Merci ! Sélectionnez le domaine de votre affiche :");
            return;
          }

          const analysis = data.analysis;
          setSuggestedDomain(analysis.suggestedDomain);

          // Store extracted info
          const detectedDomain = analysis.suggestedDomain as Domain | null;
          const validDomains: Domain[] = ["church", "event", "education", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "formation", "other"];
          const isValidDomain = detectedDomain && validDomains.includes(detectedDomain);
          
          // Build response based on what was understood
          let response = `J'ai bien compris : ${analysis.summary}. `;
          
          // Mention what info was extracted
          const extractedKeys = Object.keys(analysis.extractedInfo || {}).filter(
            (k) => analysis.extractedInfo[k]
          );
          if (extractedKeys.length > 0) {
            response += "J'ai noté les informations fournies. ";
          }

          // If domain detected, skip domain selection
          if (isValidDomain) {
            const missingInfo = analysis.missingInfo || [];
            
            if (missingInfo.length > 0) {
              // Ask for missing info
              setConversationState((prev) => ({
                ...prev,
                step: "details",
                domain: detectedDomain,
                extractedInfo: analysis.extractedInfo,
                missingInfo: analysis.missingInfo,
              }));
              const missingText = formatMissingInfo(missingInfo);
              response += `Pour compléter l'affiche, pouvez-vous me donner ${missingText} ?`;
            } else {
              // All info provided, go to reference
              setConversationState((prev) => ({
                ...prev,
                step: "reference",
                domain: detectedDomain,
                extractedInfo: analysis.extractedInfo,
                missingInfo: [],
              }));
              response += "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.";
            }
          } else {
            // Domain not detected, ask user to select
            setConversationState((prev) => ({
              ...prev,
              step: "domain",
              extractedInfo: analysis.extractedInfo,
              missingInfo: analysis.missingInfo,
            }));
            response += "Sélectionnez le domaine de l'affiche :";
          }

          addMessage("assistant", response);
        } catch (err) {
          removeLoadingMessage();
          setIsProcessing(false);
          setConversationState((prev) => ({ ...prev, step: "domain" }));
          addMessage("assistant", "Merci ! Sélectionnez le domaine de votre affiche :");
        }
        return;
      }

      // Custom domain input
      if (step === "custom_domain") {
        setConversationState((prev) => ({
          ...prev,
          step: "details",
          customDomain: content,
        }));

        // Check if there are missing infos to ask
        const missingInfo = conversationStateRef.current.missingInfo || [];
        if (missingInfo.length > 0) {
          const missingText = formatMissingInfo(missingInfo);
          setTimeout(() => {
            addMessage(
              "assistant",
              `Domaine "${content}" noté. Pour compléter l'affiche, pouvez-vous me donner ${missingText} ?`
            );
          }, 250);
        } else {
          setTimeout(() => {
            addMessage(
              "assistant",
              "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
            );
            setConversationState((prev) => ({ ...prev, step: "reference" }));
          }, 250);
        }
        return;
      }

      // Additional details
      if (step === "details") {
        // Merge additional details into extractedInfo
        setConversationState((prev) => ({
          ...prev,
          step: "reference",
          extractedInfo: {
            ...prev.extractedInfo,
            additionalDetails: [prev.extractedInfo?.additionalDetails, content]
              .filter(Boolean)
              .join(". "),
          },
        }));

        setTimeout(() => {
          addMessage(
            "assistant",
            "Merci ! Avez-vous une image de référence (une affiche dont vous aimez le style) ? Envoyez-la ou cliquez sur 'Passer'."
          );
        }, 250);
        return;
      }
    },
    [addMessage, addLoadingMessage, removeLoadingMessage]
  );

  const handleDomainSelect = useCallback(
    (domain: Domain) => {
      addMessage("user", `Domaine : ${domain}`);

      if (domain === "other") {
        setConversationState((prev) => ({ ...prev, step: "custom_domain", domain }));
        setTimeout(() => {
          addMessage("assistant", "Précisez le domaine de votre affiche :");
        }, 250);
        return;
      }

      setConversationState((prev) => ({ ...prev, domain }));

      // Check if there's missing info to request
      const missingInfo = conversationStateRef.current.missingInfo || [];
      
      if (missingInfo.length > 0) {
        const missingText = formatMissingInfo(missingInfo);
        setConversationState((prev) => ({ ...prev, step: "details" }));
        setTimeout(() => {
          addMessage(
            "assistant",
            `Pour compléter l'affiche, pouvez-vous me donner ${missingText} ?`
          );
        }, 250);
      } else {
        // All info already provided, go to reference
        setConversationState((prev) => ({ ...prev, step: "reference" }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Parfait, j'ai toutes les infos ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
          );
        }, 250);
      }
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
          "Image analysée ! Choisissez une palette de couleurs pour personnaliser votre affiche :"
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
          "Une erreur est survenue. Choisissez quand même une palette de couleurs :"
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
      addMessage("assistant", "Choisissez une palette de couleurs pour votre affiche :");
    }, 250);
  }, [addMessage]);

  const handleColorsConfirm = useCallback(
    (colors: string[]) => {
      addMessage("user", `Couleurs : ${colors.join(", ")}`);
      setConversationState((prev) => ({ ...prev, step: "content_image", colorPalette: colors }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Avez-vous une image à intégrer dans l'affiche (produit, logo, photo) ? Envoyez-la, ou cliquez sur 'Générer automatiquement'."
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
        addMessage("assistant", "Parfait ! Génération de votre affiche en cours...");
        generatePoster(nextState);
      }, 250);
    },
    [addMessage, generatePoster]
  );

  const handleSkipContentImage = useCallback(() => {
    addMessage("user", "Générer l'image automatiquement");

    const nextState: ConversationState = {
      ...conversationStateRef.current,
      step: "generating",
      needsContentImage: true,
    };

    setConversationState(nextState);

    setTimeout(() => {
      addMessage(
        "assistant",
        "Génération de votre affiche en cours (avec des personnages africains si nécessaire)..."
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
    setSuggestedDomain(null);
  }, []);

  return {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    suggestedDomain,
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
