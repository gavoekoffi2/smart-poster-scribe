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

// Convertit un code hex en description de couleur naturelle
function hexToColorName(hex: string): string {
  const colorMap: Record<string, string> = {
    // Rouges
    "#FF0000": "rouge vif", "#FF6B6B": "rouge corail", "#DC143C": "rouge cramoisi",
    "#8B0000": "rouge foncé", "#FF4500": "rouge orangé", "#CD5C5C": "rouge indien",
    // Oranges
    "#FFA500": "orange", "#FF8C00": "orange foncé", "#FF7F50": "orange corail",
    "#E67E22": "orange citrouille", "#F39C12": "orange doré",
    // Jaunes
    "#FFFF00": "jaune vif", "#FFD700": "jaune doré", "#F1C40F": "jaune soleil",
    "#FFEAA7": "jaune pâle", "#FFC300": "jaune safran",
    // Verts
    "#00FF00": "vert vif", "#228B22": "vert forêt", "#32CD32": "vert lime",
    "#2ECC71": "vert émeraude", "#27AE60": "vert jade", "#1ABC9C": "vert turquoise",
    "#006400": "vert foncé", "#90EE90": "vert clair",
    // Bleus
    "#0000FF": "bleu vif", "#1E90FF": "bleu dodger", "#4169E1": "bleu royal",
    "#000080": "bleu marine", "#87CEEB": "bleu ciel", "#3498DB": "bleu azur",
    "#2980B9": "bleu océan", "#00CED1": "bleu turquoise",
    // Violets/Mauves
    "#800080": "violet", "#9B59B6": "violet améthyste", "#8E44AD": "violet profond",
    "#E91E63": "rose magenta", "#FF69B4": "rose vif", "#FFC0CB": "rose pâle",
    // Marrons/Beiges
    "#8B4513": "marron", "#D2691E": "chocolat", "#A0522D": "terre de sienne",
    "#DEB887": "beige", "#F5DEB3": "blé", "#D2B48C": "brun clair",
    // Gris/Noir/Blanc
    "#000000": "noir", "#FFFFFF": "blanc", "#808080": "gris",
    "#C0C0C0": "gris argent", "#2C3E50": "gris anthracite", "#34495E": "gris ardoise",
    // Dorés/Métalliques
    "#C0A000": "or antique", "#B8860B": "or foncé",
  };
  
  const upperHex = hex.toUpperCase();
  if (colorMap[upperHex]) return colorMap[upperHex];
  
  // Parse RGB et déterminer une description générique
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  
  if (lightness < 0.2) return "sombre";
  if (lightness > 0.85) return "clair lumineux";
  
  if (r > g && r > b) return g > b ? "orangé chaud" : "rouge";
  if (g > r && g > b) return r > b ? "vert olive" : "vert";
  if (b > r && b > g) return r > g ? "violet" : "bleu";
  if (r === g && r > b) return "jaune doré";
  if (r === b && r > g) return "magenta";
  if (g === b && g > r) return "cyan";
  
  return "couleur harmonieuse";
}

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

  // 1. STYLE VISUEL D'ABORD (le plus important pour la cohérence)
  if (referenceDescription) {
    // Extraire et reformuler le style de référence de façon concise
    const styleKeywords = referenceDescription
      .replace(/\n/g, " ")
      .slice(0, 600);
    parts.push(`STYLE VISUEL À REPRODUIRE: ${styleKeywords}`);
  }

  // 2. PALETTE DE COULEURS (intégrée naturellement, pas en codes hex)
  if (colorPalette?.length) {
    const colorDescriptions = colorPalette
      .slice(0, 5) // Max 5 couleurs principales
      .map(hexToColorName);
    const uniqueColors = [...new Set(colorDescriptions)];
    parts.push(`PALETTE: tons ${uniqueColors.join(", ")}`);
  }

  // 3. TYPE D'AFFICHE
  const domainLabel = domain === "other" && customDomain ? customDomain : domain;
  if (domainLabel) {
    parts.push(`TYPE: affiche ${domainLabel}`);
  }

  // 4. CONTENU TEXTUEL (ce qui doit apparaître sur l'affiche)
  if (extractedInfo) {
    const textElements: string[] = [];
    if (extractedInfo.title) textElements.push(`"${extractedInfo.title}"`);
    if (extractedInfo.dates) textElements.push(`date: ${extractedInfo.dates}`);
    if (extractedInfo.location) textElements.push(`lieu: ${extractedInfo.location}`);
    if (extractedInfo.organizer) textElements.push(`par ${extractedInfo.organizer}`);
    if (extractedInfo.prices) textElements.push(`tarif: ${extractedInfo.prices}`);
    if (extractedInfo.contact) textElements.push(`contact: ${extractedInfo.contact}`);
    
    if (textElements.length > 0) {
      parts.push(`TEXTES SUR L'AFFICHE: ${textElements.join(", ")}`);
    }
  }

  // 5. INSTRUCTIONS ADDITIONNELLES
  if (description) {
    // Nettoyer la description des potentiels codes couleurs
    const cleanDesc = description.replace(/#[0-9A-Fa-f]{6}/g, "").trim();
    if (cleanDesc) {
      parts.push(cleanDesc);
    }
  }

  // 6. PERSONNAGES AFRICAINS si nécessaire
  if (needsContentImage) {
    parts.push("PERSONNAGES: inclure des personnes africaines avec traits authentiques");
  }

  return parts.join(". ").trim();
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

        console.log("Generating with Nano Banana Pro");
        console.log("Prompt:", prompt);
        console.log("Reference image:", state.referenceImage ? "Present" : "None");
        console.log("Content image:", state.contentImage ? "Present" : "None");

        // Envoyer les images avec le prompt
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt,
            aspectRatio: "3:4" as AspectRatio,
            referenceImage: state.referenceImage || undefined, // Image de référence (style)
            contentImage: state.contentImage || undefined,     // Image de contenu
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
