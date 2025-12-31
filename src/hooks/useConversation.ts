import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChatMessage,
  ConversationState,
  Domain,
  AspectRatio,
  Resolution,
  OutputFormat,
  ExtractedInfo,
  LogoPosition,
  LogoWithPosition,
  Speaker,
  ProductDisplay,
  RestaurantInfo,
  DomainQuestionState,
} from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDomainQuestions, getNextQuestion, domainHasQuestions, DomainQuestion } from "@/config/domainQuestions";

// Domaines qui peuvent avoir des orateurs/artistes/invités
const SPEAKER_DOMAINS: Domain[] = ["church", "event", "music", "formation", "education"];

// Domaines qui sont orientés produit/e-commerce (sans restaurant qui a un traitement spécial)
const PRODUCT_DOMAINS: Domain[] = ["fashion", "technology", "health", "realestate"];

// Domaine restaurant avec traitement spécial
const RESTAURANT_DOMAIN: Domain = "restaurant";

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
    extractedInfo,
    mainSpeaker,
    guests,
    productDisplay,
    restaurantInfo,
    language = "français", // Français par défaut
  } = state;

  const parts: string[] = [];

  // 0. LANGUE - Toujours en français par défaut
  parts.push(`LANGUE: Tous les textes de l'affiche doivent être en ${language}`);

  // 1. STYLE VISUEL D'ABORD (le plus important pour la cohérence)
  if (referenceDescription) {
    const styleKeywords = referenceDescription
      .replace(/\n/g, " ")
      .slice(0, 600);
    parts.push(`STYLE VISUEL À REPRODUIRE: ${styleKeywords}`);
  }

  // 2. PALETTE DE COULEURS (intégrée naturellement, pas en codes hex)
  if (colorPalette?.length) {
    const colorDescriptions = colorPalette
      .slice(0, 5)
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

  // 5. ORATEURS/ARTISTES/INVITÉS
  if (mainSpeaker) {
    parts.push(`ORATEUR PRINCIPAL: ${mainSpeaker.name} (mettre en avant, grande photo)`);
  }
  if (guests && guests.length > 0) {
    const guestNames = guests.map(g => g.name).join(", ");
    parts.push(`INVITÉS: ${guestNames} (photos plus petites)`);
  }

  // 6. MISE EN VALEUR PRODUIT avec personnage
  if (productDisplay?.hasCharacter && productDisplay.characterInteraction) {
    parts.push(`PERSONNAGE METTANT EN VALEUR LE PRODUIT: ${productDisplay.characterInteraction}`);
    parts.push("PERSONNAGES: personne africaine avec traits authentiques");
  }

  // 7. INFORMATIONS RESTAURANT
  if (restaurantInfo) {
    if (restaurantInfo.hasMenu && restaurantInfo.menuContent) {
      parts.push(`MENU À AFFICHER: ${restaurantInfo.menuContent}`);
      parts.push("STYLE: affiche avec espace menu, disposition claire des plats et prix");
    }
    if (restaurantInfo.hasBeverages && restaurantInfo.beverageImages?.length) {
      parts.push(`BOISSONS: ${restaurantInfo.beverageImages.length} images de boissons à intégrer sur l'affiche`);
    }
    if (restaurantInfo.hasDishes && restaurantInfo.dishImages?.length) {
      parts.push(`PLATS: ${restaurantInfo.dishImages.length} images de plats/repas à mettre en valeur sur l'affiche`);
    }
    if (!restaurantInfo.hasMenu) {
      parts.push("STYLE: affiche promotionnelle restaurant sans menu détaillé");
    }
  }

  // 8. INSTRUCTIONS ADDITIONNELLES
  if (description) {
    const cleanDesc = description.replace(/#[0-9A-Fa-f]{6}/g, "").trim();
    if (cleanDesc) {
      parts.push(cleanDesc);
    }
  }

  // 9. PERSONNAGES AFRICAINS si nécessaire (et pas déjà couvert)
  if (needsContentImage && !mainSpeaker && (!guests || guests.length === 0) && !productDisplay?.hasCharacter) {
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
  const [visitedSteps, setVisitedSteps] = useState<ConversationState["step"][]>(["greeting"]);

  // Mettre à jour les étapes visitées quand on change d'étape
  useEffect(() => {
    const currentStep = conversationState.step;
    setVisitedSteps(prev => {
      // Si on revient en arrière, on garde l'historique
      const stepIndex = prev.indexOf(currentStep);
      if (stepIndex !== -1) {
        return prev; // L'étape existe déjà, on ne modifie pas
      }
      return [...prev, currentStep];
    });
  }, [conversationState.step]);

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

        // Préparer les logos pour l'envoi
        const logos = state.logos || [];
        const logoImages = logos.map(l => l.imageUrl);
        const logoPositions = logos.map(l => l.position);

        // Envoyer les images avec le prompt
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt,
            aspectRatio: "3:4" as AspectRatio,
            referenceImage: state.referenceImage || undefined,
            logoImages: logoImages.length > 0 ? logoImages : undefined,
            logoPositions: logoPositions.length > 0 ? logoPositions : undefined,
            contentImage: state.contentImage || undefined,
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
          "Votre affiche est prête ! 🎨 Si vous souhaitez des modifications (changer un texte, ajuster les couleurs, déplacer un élément...), décrivez-les moi. Sinon, téléchargez-la ou créez-en une nouvelle !"
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

  const handleModificationRequest = useCallback(
    async (request: string) => {
      setIsProcessing(true);
      setConversationState((prev) => ({ ...prev, step: "modifying" }));
      addLoadingMessage();

      try {
        const state = conversationStateRef.current;
        // Build a modification prompt that includes the original prompt + modification request
        const originalPrompt = buildPrompt(state);
        const modificationPrompt = `${originalPrompt}. MODIFICATIONS DEMANDÉES: ${request}`;

        console.log("Regenerating with modifications:", request);
        console.log("Modified prompt:", modificationPrompt);

        const logos = state.logos || [];
        const logoImages = logos.map(l => l.imageUrl);
        const logoPositions = logos.map(l => l.position);

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: modificationPrompt,
            aspectRatio: "3:4",
            referenceImage: state.referenceImage || undefined,
            logoImages: logoImages.length > 0 ? logoImages : undefined,
            logoPositions: logoPositions.length > 0 ? logoPositions : undefined,
            contentImage: state.contentImage || undefined,
          },
        });

        removeLoadingMessage();

        if (error || !data?.success) {
          const msg = data?.error || error?.message || "Erreur inconnue";
          addMessage(
            "assistant",
            `Désolé, la modification a échoué : ${msg}. Décrivez à nouveau ce que vous voulez changer.`
          );
          setConversationState((prev) => ({ ...prev, step: "complete" }));
          toast.error("Erreur lors de la modification");
          return;
        }

        setGeneratedImage(data.imageUrl);
        setConversationState((prev) => ({ ...prev, step: "complete" }));
        addMessage(
          "assistant",
          "J'ai appliqué vos modifications ! Si vous voulez d'autres changements, dites-le moi. Sinon, téléchargez votre affiche !"
        );
        toast.success("Modifications appliquées !");
      } catch (err) {
        console.error("Modification error:", err);
        removeLoadingMessage();
        addMessage("assistant", "Une erreur est survenue. Réessayez de décrire vos modifications.");
        setConversationState((prev) => ({ ...prev, step: "complete" }));
        toast.error("Erreur inattendue");
      } finally {
        setIsProcessing(false);
      }
    },
    [addMessage, addLoadingMessage, removeLoadingMessage]
  );

  // Handler pour les préférences de style et sélection automatique de template
  // MUST BE DECLARED BEFORE handleUserMessage since it's used there
  const handleStylePreferencesAndSelectTemplate = useCallback(
    async (preferences?: string) => {
      if (preferences) {
        addMessage("user", preferences);
      } else {
        addMessage("user", "Continuer sans préférences spécifiques");
      }
      
      addLoadingMessage();
      setIsProcessing(true);
      
      const currentDomain = conversationStateRef.current.domain;
      const restaurantInfo = conversationStateRef.current.restaurantInfo;
      
      try {
        // Fetch templates for the domain
        let templates: any[] = [];
        
        if (currentDomain) {
          const { data, error } = await supabase
            .from("reference_templates")
            .select("*")
            .eq("domain", currentDomain);
          
          if (!error && data) {
            templates = data;
          }
        }
        
        // If no templates for this domain, get all templates for inspiration
        if (templates.length === 0) {
          const { data: allTemplates, error } = await supabase
            .from("reference_templates")
            .select("*")
            .limit(20);
          
          if (!error && allTemplates) {
            templates = allTemplates;
          }
        }
        
        removeLoadingMessage();
        setIsProcessing(false);
        
        if (templates.length > 0) {
          // Smart template selection based on user context
          let selectedTemplate = templates[0];
          
          // For restaurant, try to find a template that matches menu/no-menu preference
          if (currentDomain === "restaurant" && restaurantInfo) {
            const hasMenu = restaurantInfo.hasMenu;
            
            // Filter templates by tags or description matching
            const filteredTemplates = templates.filter(t => {
              const desc = (t.description || "").toLowerCase();
              const tags = (t.tags || []).map((tag: string) => tag.toLowerCase());
              
              if (hasMenu) {
                // Look for templates with menu
                return desc.includes("menu") || tags.includes("menu") || 
                       desc.includes("carte") || tags.includes("carte");
              } else {
                // Look for promo/event templates without menu
                return !desc.includes("menu") && !tags.includes("menu") ||
                       desc.includes("promo") || tags.includes("promo") ||
                       desc.includes("offre") || tags.includes("offre");
              }
            });
            
            if (filteredTemplates.length > 0) {
              selectedTemplate = filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
            } else {
              selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
            }
          } else {
            // Random selection for other domains
            selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
          }
          
          const imageUrl = selectedTemplate.image_url.startsWith('/')
            ? window.location.origin + selectedTemplate.image_url
            : selectedTemplate.image_url;
          
          // Build a description that focuses only on STYLE, not content
          let styleDescription = selectedTemplate.description || "";
          
          // If the template has a description, extract only style-related keywords
          if (styleDescription) {
            // Add instruction to use only style, not content
            styleDescription = `STYLE À REPRODUIRE (ignorer le contenu textuel de ce template, utiliser uniquement le style visuel): ${styleDescription}`;
          }
          
          // Add user's style preferences if provided
          if (preferences) {
            styleDescription = `${styleDescription}. PRÉFÉRENCES DE STYLE UTILISATEUR: ${preferences}`;
          }
          
          // Add instruction for originality
          styleDescription = `${styleDescription}. IMPORTANT: Créer un design ORIGINAL en s'inspirant de ce style, ne pas copier exactement. Ajouter de la créativité et de l'originalité.`;
          
          setConversationState((prev) => ({
            ...prev,
            step: "colors",
            referenceImage: imageUrl,
            referenceDescription: styleDescription,
            stylePreferences: preferences,
            usingAutoTemplate: true,
          }));
          
          const domainMessage = currentDomain 
            ? `J'ai sélectionné un style adapté au domaine "${currentDomain}".`
            : "J'ai sélectionné un style à partir de notre collection.";
          
          addMessage(
            "assistant",
            `${domainMessage} Je vais créer un design original en m'inspirant de ce style, en utilisant uniquement VOS informations. Choisissez une palette de couleurs :`
          );
        } else {
          // No templates found - will generate purely from description
          setConversationState((prev) => ({
            ...prev,
            step: "colors",
            stylePreferences: preferences,
            usingAutoTemplate: false,
            referenceDescription: preferences 
              ? `STYLE DEMANDÉ: ${preferences}. Créer un design professionnel et original.`
              : "Créer un design professionnel, moderne et original adapté au domaine.",
          }));
          
          addMessage(
            "assistant",
            "Je vais créer un design original adapté à vos besoins. Choisissez une palette de couleurs :"
          );
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        removeLoadingMessage();
        setIsProcessing(false);
        
        // Fallback
        setConversationState((prev) => ({ 
          ...prev, 
          step: "colors",
          stylePreferences: preferences,
        }));
        addMessage("assistant", "Choisissez une palette de couleurs pour votre affiche :");
      }
    },
    [addMessage, addLoadingMessage, removeLoadingMessage]
  );

  const handleUserMessage = useCallback(
    async (content: string) => {
      addMessage("user", content);
      const { step } = conversationStateRef.current;

      // Handle modification requests when in complete state
      if (step === "complete") {
        handleModificationRequest(content);
        return;
      }

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
          extractedInfo: {
            ...prev.extractedInfo,
            additionalDetails: [prev.extractedInfo?.additionalDetails, content]
              .filter(Boolean)
              .join(". "),
          },
        }));

        // Check if this domain has intelligent questions configured
        const currentDomain = conversationStateRef.current.domain;
        
        if (currentDomain && domainHasQuestions(currentDomain)) {
          // Use the new intelligent domain questions system
          const questions = getDomainQuestions(currentDomain);
          if (questions.length > 0) {
            const firstQuestion = questions[0];
            setConversationState((prev) => ({
              ...prev,
              step: "domain_questions",
              domainQuestionState: {
                currentQuestionId: firstQuestion.id,
                answeredQuestions: {},
                collectedImages: {},
                collectedTexts: {},
              },
            }));
            setTimeout(() => {
              addMessage("assistant", firstQuestion.question);
            }, 250);
            return;
          }
        }
        
        // Fallback to legacy flow for domains without questions
        setConversationState((prev) => ({ ...prev, step: "reference" }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Merci ! Avez-vous une image de référence (une affiche dont vous aimez le style) ? Envoyez-la ou cliquez sur 'Passer'."
          );
        }, 250);
        return;
      }
      
      // Handle domain questions boolean responses (oui/non)
      if (step === "domain_questions") {
        const lowerContent = content.toLowerCase().trim();
        const isYes = ["oui", "yes", "o", "y", "1", "ok", "d'accord", "bien sûr", "absolument"].some(w => lowerContent.includes(w));
        const isNo = ["non", "no", "n", "0", "pas", "aucun", "jamais"].some(w => lowerContent.includes(w));
        
        const state = conversationStateRef.current.domainQuestionState;
        const domain = conversationStateRef.current.domain;
        
        if (state && domain && state.currentQuestionId) {
          const questions = getDomainQuestions(domain);
          const currentQuestion = questions.find(q => q.id === state.currentQuestionId);
          
          if (currentQuestion) {
            const newAnsweredQuestions = {
              ...state.answeredQuestions,
              [state.currentQuestionId]: isYes,
            };
            
            // If yes and has follow-up with image upload
            if (isYes && currentQuestion.followUp?.imageUpload) {
              setConversationState((prev) => ({
                ...prev,
                step: "domain_question_images",
                domainQuestionState: {
                  ...state,
                  answeredQuestions: newAnsweredQuestions,
                  pendingImageUpload: {
                    type: state.currentQuestionId!,
                    multiple: currentQuestion.followUp!.imageUpload!.multiple,
                    label: currentQuestion.followUp!.imageUpload!.label,
                    hint: currentQuestion.followUp!.imageUpload!.hint,
                  },
                },
              }));
              setTimeout(() => {
                addMessage("assistant", `📸 ${currentQuestion.followUp!.imageUpload!.label}\n\n${currentQuestion.followUp!.imageUpload!.hint}`);
              }, 250);
              return;
            }
            
            // If yes and has follow-up with text input
            if (isYes && currentQuestion.followUp?.textInput) {
              setConversationState((prev) => ({
                ...prev,
                step: "domain_question_text",
                domainQuestionState: {
                  ...state,
                  answeredQuestions: newAnsweredQuestions,
                  pendingTextInput: {
                    type: state.currentQuestionId!,
                    label: currentQuestion.followUp!.textInput!.label,
                    placeholder: currentQuestion.followUp!.textInput!.placeholder,
                    multiline: currentQuestion.followUp!.textInput!.multiline || false,
                  },
                },
              }));
              setTimeout(() => {
                addMessage("assistant", `📝 ${currentQuestion.followUp!.textInput!.label}\n\n${currentQuestion.followUp!.textInput!.placeholder}`);
              }, 250);
              return;
            }
            
            // Move to next question
            const nextQuestion = getNextQuestion(domain, newAnsweredQuestions);
            if (nextQuestion) {
              setConversationState((prev) => ({
                ...prev,
                domainQuestionState: {
                  ...state,
                  currentQuestionId: nextQuestion.id,
                  answeredQuestions: newAnsweredQuestions,
                },
              }));
              setTimeout(() => {
                addMessage("assistant", nextQuestion.question);
              }, 250);
            } else {
              // All questions answered, go to reference
              setConversationState((prev) => ({
                ...prev,
                step: "reference",
                domainQuestionState: {
                  ...state,
                  currentQuestionId: null,
                  answeredQuestions: newAnsweredQuestions,
                },
              }));
              setTimeout(() => {
                addMessage("assistant", "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.");
              }, 250);
            }
          }
        }
        return;
      }
      
      // Handle domain question text input
      if (step === "domain_question_text") {
        const state = conversationStateRef.current.domainQuestionState;
        const domain = conversationStateRef.current.domain;
        
        if (state && domain && state.pendingTextInput) {
          const newCollectedTexts = {
            ...state.collectedTexts,
            [state.pendingTextInput.type]: content,
          };
          
          const nextQuestion = getNextQuestion(domain, state.answeredQuestions);
          if (nextQuestion) {
            setConversationState((prev) => ({
              ...prev,
              step: "domain_questions",
              domainQuestionState: {
                ...state,
                currentQuestionId: nextQuestion.id,
                collectedTexts: newCollectedTexts,
                pendingTextInput: undefined,
              },
            }));
            setTimeout(() => {
              addMessage("assistant", nextQuestion.question);
            }, 250);
          } else {
            setConversationState((prev) => ({
              ...prev,
              step: "reference",
              domainQuestionState: {
                ...state,
                currentQuestionId: null,
                collectedTexts: newCollectedTexts,
                pendingTextInput: undefined,
              },
            }));
            setTimeout(() => {
              addMessage("assistant", "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.");
            }, 250);
          }
        }
        return;
      }

      // =========== RESTAURANT STEPS ===========
      
      // Restaurant menu check - user responds yes/no
      if (step === "restaurant_menu_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "restaurant_menu_content",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasMenu: true,
              hasBeverages: false,
              hasDishes: false,
            }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Décrivez le menu que vous souhaitez afficher (plats et prix). Par exemple :\n- Poulet braisé : 5000 FCFA\n- Poisson grillé : 6000 FCFA\n- Riz sauce arachide : 3000 FCFA"
            );
          }, 250);
        } else {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "restaurant_beverages_check",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasMenu: false,
              hasBeverages: false,
              hasDishes: false,
            }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Souhaitez-vous inclure des images de boissons sur l'affiche ?"
            );
          }, 250);
        }
        return;
      }

      // Restaurant menu content
      if (step === "restaurant_menu_content") {
        setConversationState((prev) => ({
          ...prev,
          step: "restaurant_beverages_check",
          restaurantInfo: {
            ...prev.restaurantInfo,
            hasMenu: true,
            hasBeverages: false,
            hasDishes: false,
            menuContent: content.trim(),
          },
        }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Menu noté ! Souhaitez-vous inclure des images de boissons sur l'affiche ?"
          );
        }, 250);
        return;
      }

      // Restaurant beverages check
      if (step === "restaurant_beverages_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "restaurant_beverages_photos",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasBeverages: true,
            },
            currentBeverageImages: [],
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Envoyez les photos de vos boissons (vous pouvez en envoyer plusieurs). Cliquez sur 'Continuer' quand vous avez terminé."
            );
          }, 250);
        } else {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "restaurant_dishes_check",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasBeverages: false,
            }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Souhaitez-vous inclure des images de plats/repas sur l'affiche ?"
            );
          }, 250);
        }
        return;
      }

      // Restaurant dishes check
      if (step === "restaurant_dishes_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "restaurant_dishes_photos",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasDishes: true,
            },
            currentDishImages: [],
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Envoyez les photos de vos plats/repas (vous pouvez en envoyer plusieurs). Cliquez sur 'Continuer' quand vous avez terminé."
            );
          }, 250);
        } else {
          // Check if user wants a character on the poster
          setConversationState((prev) => ({ 
            ...prev, 
            step: "product_character_check",
            restaurantInfo: { 
              ...prev.restaurantInfo,
              hasDishes: false,
            }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Souhaitez-vous qu'un personnage mette en valeur vos produits sur l'affiche ? (Par exemple : un chef qui présente le plat, une personne qui mange...)"
            );
          }, 250);
        }
        return;
      }

      // Product character check - user responds yes/no
      if (step === "product_character_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "product_character_interaction",
            productDisplay: { hasCharacter: true }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Comment le personnage doit-il mettre en valeur le produit ? Décrivez la scène (ex: \"une femme élégante qui boit le jus\", \"un homme assis sur le canapé\", \"une personne qui tient le téléphone\"):"
            );
          }, 250);
        } else {
          setConversationState((prev) => ({ 
            ...prev, 
            step: "reference",
            productDisplay: { hasCharacter: false }
          }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
            );
          }, 250);
        }
        return;
      }

      // Product character interaction description
      if (step === "product_character_interaction") {
        setConversationState((prev) => ({
          ...prev,
          step: "reference",
          productDisplay: {
            hasCharacter: true,
            characterInteraction: content.trim(),
          },
        }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
          );
        }, 250);
        return;
      }

      // Speakers check - user responds yes/no
      if (step === "speakers_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ ...prev, step: "main_speaker_photo", hasSpeakers: true }));
          setTimeout(() => {
            addMessage("assistant", "Envoyez la photo de l'orateur/artiste principal :");
          }, 250);
        } else {
          setConversationState((prev) => ({ ...prev, step: "reference", hasSpeakers: false }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
            );
          }, 250);
        }
        return;
      }

      // Main speaker name
      if (step === "main_speaker_name") {
        const speakerImage = conversationStateRef.current.currentSpeakerImage;
        if (!speakerImage) return;

        const newMainSpeaker: Speaker = {
          id: crypto.randomUUID(),
          name: content.trim(),
          imageUrl: speakerImage,
          role: "main",
        };

        setConversationState((prev) => ({
          ...prev,
          step: "guests_check",
          mainSpeaker: newMainSpeaker,
          currentSpeakerImage: undefined,
        }));

        setTimeout(() => {
          addMessage(
            "assistant",
            "Y a-t-il des invités ou d'autres intervenants à ajouter sur l'affiche ?"
          );
        }, 250);
        return;
      }

      // Guests check
      if (step === "guests_check") {
        const lower = content.toLowerCase().trim();
        const isYes = lower.includes("oui") || lower === "yes" || lower === "o";
        
        if (isYes) {
          setConversationState((prev) => ({ ...prev, step: "guest_photo" }));
          setTimeout(() => {
            addMessage("assistant", "Envoyez la photo du premier invité :");
          }, 250);
        } else {
          setConversationState((prev) => ({ ...prev, step: "reference" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
            );
          }, 250);
        }
        return;
      }

      // Guest name
      if (step === "guest_name") {
        const guestImage = conversationStateRef.current.currentSpeakerImage;
        if (!guestImage) return;

        const newGuest: Speaker = {
          id: crypto.randomUUID(),
          name: content.trim(),
          imageUrl: guestImage,
          role: "guest",
        };

        setConversationState((prev) => ({
          ...prev,
          step: "guest_photo",
          guests: [...(prev.guests || []), newGuest],
          currentSpeakerImage: undefined,
        }));

        setTimeout(() => {
          const guestCount = (conversationStateRef.current.guests?.length || 0) + 1;
          addMessage(
            "assistant",
            `Invité ${guestCount} ajouté ! Envoyez la photo d'un autre invité ou cliquez sur 'Continuer' pour passer à l'étape suivante.`
          );
        }, 250);
        return;
      }

      // Style preferences - user provides optional style instructions
      if (step === "style_preferences") {
        handleStylePreferencesAndSelectTemplate(content.trim());
        return;
      }
    },
    [addMessage, addLoadingMessage, removeLoadingMessage, handleModificationRequest, handleStylePreferencesAndSelectTemplate]
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
        // Check if this domain might have speakers, products, or restaurant
        if (SPEAKER_DOMAINS.includes(domain)) {
          setConversationState((prev) => ({ ...prev, step: "speakers_check" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Y a-t-il un orateur principal, un artiste ou un intervenant dont la photo doit apparaître sur l'affiche ?"
            );
          }, 250);
        } else if (domain === RESTAURANT_DOMAIN) {
          // Restaurant domain - demander les informations spécifiques
          setConversationState((prev) => ({ ...prev, step: "restaurant_menu_check" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Souhaitez-vous inclure un menu (liste des plats avec prix) sur votre affiche ?"
            );
          }, 250);
        } else if (PRODUCT_DOMAINS.includes(domain)) {
          setConversationState((prev) => ({ ...prev, step: "product_character_check" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Souhaitez-vous qu'un personnage mette en valeur votre produit sur l'affiche ? (Par exemple : quelqu'un qui tient le produit, l'utilise, le porte...)"
            );
          }, 250);
        } else {
          setConversationState((prev) => ({ ...prev, step: "reference" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "Parfait, j'ai toutes les infos ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
            );
          }, 250);
        }
      }
    },
    [addMessage]
  );

  // Handler pour la photo de l'orateur principal
  const handleMainSpeakerPhoto = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Photo de l'orateur principal", imageDataUrl);
      setConversationState((prev) => ({
        ...prev,
        step: "main_speaker_name",
        currentSpeakerImage: imageDataUrl,
      }));
      setTimeout(() => {
        addMessage("assistant", "Quel est le nom de cet orateur/artiste ? (Ce nom apparaîtra sur l'affiche)");
      }, 250);
    },
    [addMessage]
  );

  // Handler pour la photo d'un invité
  const handleGuestPhoto = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Photo d'invité", imageDataUrl);
      setConversationState((prev) => ({
        ...prev,
        step: "guest_name",
        currentSpeakerImage: imageDataUrl,
      }));
      setTimeout(() => {
        addMessage("assistant", "Quel est le nom de cet invité ? (Ce nom apparaîtra sur l'affiche)");
      }, 250);
    },
    [addMessage]
  );

  // Handler pour passer les orateurs
  const handleSkipSpeakers = useCallback(() => {
    addMessage("user", "Pas d'orateur principal");
    setConversationState((prev) => ({ ...prev, step: "reference", hasSpeakers: false }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
      );
    }, 250);
  }, [addMessage]);

  // Handler pour passer les invités
  const handleSkipGuests = useCallback(() => {
    const guestsCount = conversationStateRef.current.guests?.length || 0;
    addMessage("user", guestsCount > 0 ? "Pas d'autre invité" : "Pas d'invité");
    setConversationState((prev) => ({ ...prev, step: "reference" }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
      );
    }, 250);
  }, [addMessage]);

  // Handler pour passer le personnage produit
  const handleSkipProductCharacter = useCallback(() => {
    addMessage("user", "Pas de personnage sur l'affiche");
    setConversationState((prev) => ({ 
      ...prev, 
      step: "reference",
      productDisplay: { hasCharacter: false }
    }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'."
      );
    }, 250);
  }, [addMessage]);

  // =========== RESTAURANT HANDLERS ===========

  // Handler pour passer la question du menu
  const handleSkipRestaurantMenu = useCallback(() => {
    addMessage("user", "Pas de menu sur l'affiche");
    setConversationState((prev) => ({ 
      ...prev, 
      step: "restaurant_beverages_check",
      restaurantInfo: { 
        ...prev.restaurantInfo,
        hasMenu: false,
        hasBeverages: false,
        hasDishes: false,
      }
    }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Souhaitez-vous inclure des images de boissons sur l'affiche ?"
      );
    }, 250);
  }, [addMessage]);

  // Handler pour les photos de boissons
  const handleBeveragePhoto = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Photo de boisson envoyée", imageDataUrl);
      setConversationState((prev) => ({
        ...prev,
        currentBeverageImages: [...(prev.currentBeverageImages || []), imageDataUrl],
        restaurantInfo: {
          ...prev.restaurantInfo,
          hasBeverages: true,
          hasDishes: prev.restaurantInfo?.hasDishes || false,
          hasMenu: prev.restaurantInfo?.hasMenu || false,
          beverageImages: [...(prev.restaurantInfo?.beverageImages || []), imageDataUrl],
        },
      }));
      setTimeout(() => {
        const count = (conversationStateRef.current.currentBeverageImages?.length || 0) + 1;
        addMessage(
          "assistant",
          `${count} photo(s) de boisson ajoutée(s) ! Envoyez d'autres photos ou cliquez sur 'Continuer'.`
        );
      }, 250);
    },
    [addMessage]
  );

  // Handler pour passer les boissons
  const handleSkipBeverages = useCallback(() => {
    const beveragesCount = conversationStateRef.current.currentBeverageImages?.length || 0;
    addMessage("user", beveragesCount > 0 ? "Continuer sans autre boisson" : "Pas de boissons");
    setConversationState((prev) => ({ 
      ...prev, 
      step: "restaurant_dishes_check",
      restaurantInfo: {
        ...prev.restaurantInfo,
        hasBeverages: beveragesCount > 0,
        hasDishes: false,
        hasMenu: prev.restaurantInfo?.hasMenu || false,
      }
    }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Souhaitez-vous inclure des images de plats/repas sur l'affiche ?"
      );
    }, 250);
  }, [addMessage]);

  // Handler pour les photos de plats
  const handleDishPhoto = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Photo de plat envoyée", imageDataUrl);
      setConversationState((prev) => ({
        ...prev,
        currentDishImages: [...(prev.currentDishImages || []), imageDataUrl],
        restaurantInfo: {
          ...prev.restaurantInfo,
          hasDishes: true,
          hasBeverages: prev.restaurantInfo?.hasBeverages || false,
          hasMenu: prev.restaurantInfo?.hasMenu || false,
          dishImages: [...(prev.restaurantInfo?.dishImages || []), imageDataUrl],
        },
      }));
      setTimeout(() => {
        const count = (conversationStateRef.current.currentDishImages?.length || 0) + 1;
        addMessage(
          "assistant",
          `${count} photo(s) de plat(s) ajoutée(s) ! Envoyez d'autres photos ou cliquez sur 'Continuer'.`
        );
      }, 250);
    },
    [addMessage]
  );

  // Handler pour passer les plats et aller vers personnage
  const handleSkipDishes = useCallback(() => {
    const dishesCount = conversationStateRef.current.currentDishImages?.length || 0;
    addMessage("user", dishesCount > 0 ? "Continuer sans autre plat" : "Pas de plats");
    setConversationState((prev) => ({ 
      ...prev, 
      step: "product_character_check",
      restaurantInfo: {
        ...prev.restaurantInfo,
        hasDishes: dishesCount > 0,
        hasBeverages: prev.restaurantInfo?.hasBeverages || false,
        hasMenu: prev.restaurantInfo?.hasMenu || false,
      }
    }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Souhaitez-vous qu'un personnage mette en valeur vos produits sur l'affiche ? (Par exemple : un chef qui présente le plat, une personne qui mange...)"
      );
    }, 250);
  }, [addMessage]);

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

        // Enrichir automatiquement la base de données avec cette image de référence
        const currentDomain = conversationStateRef.current.domain;
        if (currentDomain) {
          // Lancer l'enrichissement en arrière-plan (ne pas bloquer l'utilisateur)
          supabase.functions.invoke("enrich-templates", {
            body: {
              imageData: imageDataUrl,
              domain: currentDomain,
              description: data.description,
              designCategory: "user-contributed",
              tags: [currentDomain, "user-contributed", "auto-added"],
            },
          }).then(({ data: enrichData, error: enrichError }) => {
            if (enrichError) {
              console.error("Failed to enrich templates:", enrichError);
            } else if (enrichData?.isDuplicate) {
              console.log("Reference image already exists in database");
            } else if (enrichData?.success) {
              console.log("Reference image added to database:", enrichData.template?.id);
            }
          }).catch((err) => {
            console.error("Error enriching templates:", err);
          });
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

  const handleSkipReference = useCallback(async () => {
    addMessage("user", "Passer l'image de référence");
    
    // Demander des instructions de style optionnelles avant de sélectionner un template
    setConversationState((prev) => ({ ...prev, step: "style_preferences" }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Avez-vous des préférences de style particulières ? (Par exemple : style moderne, coloré, sobre, élégant, festif...) Décrivez brièvement ou cliquez sur 'Continuer' pour que je choisisse automatiquement."
      );
    }, 250);
  }, [addMessage]);

  // Handler pour passer les préférences de style
  const handleSkipStylePreferences = useCallback(() => {
    handleStylePreferencesAndSelectTemplate(undefined);
  }, [handleStylePreferencesAndSelectTemplate]);

  const handleColorsConfirm = useCallback(
    (colors: string[]) => {
      addMessage("user", `Couleurs : ${colors.join(", ")}`);
      setConversationState((prev) => ({ ...prev, step: "logo", colorPalette: colors }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Souhaitez-vous ajouter le logo de votre entreprise sur l'affiche ? Envoyez-le ou cliquez sur 'Passer'."
        );
      }, 250);
    },
    [addMessage]
  );

  const handleLogoImage = useCallback(
    (imageDataUrl: string) => {
      addMessage("user", "Logo envoyé", imageDataUrl);
      // Store the logo temporarily and ask for position
      setConversationState((prev) => ({ 
        ...prev, 
        step: "logo_position", 
        currentLogoImage: imageDataUrl 
      }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Où souhaitez-vous positionner ce logo sur l'affiche ?"
        );
      }, 250);
    },
    [addMessage]
  );

  const handleLogoPosition = useCallback(
    (position: LogoPosition) => {
      const positionLabels: Record<LogoPosition, string> = {
        "top-left": "Haut gauche",
        "top-right": "Haut droite",
        "center": "Centre",
        "bottom-left": "Bas gauche",
        "bottom-right": "Bas droite",
      };
      
      addMessage("user", `Position : ${positionLabels[position]}`);
      
      const currentLogo = conversationStateRef.current.currentLogoImage;
      if (!currentLogo) return;

      const newLogo: LogoWithPosition = {
        imageUrl: currentLogo,
        position,
      };

      setConversationState((prev) => ({
        ...prev,
        logos: [...(prev.logos || []), newLogo],
        currentLogoImage: undefined,
        step: "logo",
      }));

      setTimeout(() => {
        addMessage(
          "assistant",
          "Logo ajouté ! Avez-vous un autre logo à ajouter ? Envoyez-le ou cliquez sur 'Continuer' pour passer à l'étape suivante."
        );
      }, 250);
    },
    [addMessage]
  );

  const handleSkipLogo = useCallback(() => {
    const logosCount = conversationStateRef.current.logos?.length || 0;
    addMessage("user", logosCount > 0 ? "Continuer sans autre logo" : "Passer le logo");
    setConversationState((prev) => ({ ...prev, step: "content_image" }));
    setTimeout(() => {
      addMessage(
        "assistant",
        "Avez-vous une image à intégrer dans l'affiche (produit, photo) ? Envoyez-la, ou cliquez sur 'Générer automatiquement'."
      );
    }, 250);
  }, [addMessage]);

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

  // Fonction pour revenir à une étape précédente
  const goBackToStep = useCallback((targetStep: ConversationState["step"]) => {
    const stepMessages: Record<string, string> = {
      greeting: "Décrivez-moi l'affiche que vous souhaitez créer :",
      domain: "Sélectionnez le domaine de l'affiche :",
      details: "Quelles informations souhaitez-vous ajouter ou modifier ?",
      speakers_check: "Y a-t-il un orateur principal, un artiste ou un intervenant dont la photo doit apparaître sur l'affiche ?",
      main_speaker_photo: "Envoyez la photo de l'orateur/artiste principal :",
      guests_check: "Y a-t-il des invités ou d'autres intervenants à ajouter sur l'affiche ?",
      guest_photo: "Envoyez la photo d'un invité :",
      reference: "Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.",
      colors: "Choisissez une palette de couleurs pour votre affiche :",
      logo: "Souhaitez-vous ajouter ou modifier un logo ?",
      content_image: "Avez-vous une image à intégrer dans l'affiche ? Envoyez-la, ou cliquez sur 'Générer automatiquement'.",
    };

    // Définir quelles données garder selon l'étape cible
    setConversationState((prev) => {
      const newState: ConversationState = { ...prev, step: targetStep };
      
      // Nettoyer les données des étapes après l'étape cible
      if (targetStep === "greeting") {
        return { step: "greeting" };
      }
      if (targetStep === "domain") {
        return { 
          step: "domain", 
          description: prev.description,
          extractedInfo: prev.extractedInfo,
          missingInfo: prev.missingInfo,
        };
      }
      if (targetStep === "details") {
        return { 
          step: "details", 
          description: prev.description,
          domain: prev.domain,
          customDomain: prev.customDomain,
          extractedInfo: prev.extractedInfo,
          missingInfo: prev.missingInfo,
        };
      }
      if (targetStep === "speakers_check" || targetStep === "main_speaker_photo") {
        return { 
          step: targetStep, 
          description: prev.description,
          domain: prev.domain,
          customDomain: prev.customDomain,
          extractedInfo: prev.extractedInfo,
          hasSpeakers: undefined,
          mainSpeaker: undefined,
          guests: undefined,
        };
      }
      if (targetStep === "guests_check" || targetStep === "guest_photo") {
        return { 
          ...newState,
          guests: targetStep === "guest_photo" ? prev.guests : undefined,
          currentSpeakerImage: undefined,
        };
      }
      if (targetStep === "reference") {
        return { 
          step: "reference", 
          description: prev.description,
          domain: prev.domain,
          customDomain: prev.customDomain,
          extractedInfo: prev.extractedInfo,
          mainSpeaker: prev.mainSpeaker,
          guests: prev.guests,
          hasSpeakers: prev.hasSpeakers,
          missingInfo: [],
        };
      }
      if (targetStep === "colors") {
        return { 
          ...newState,
          logos: undefined,
          currentLogoImage: undefined,
          contentImage: undefined,
          needsContentImage: undefined,
        };
      }
      if (targetStep === "logo") {
        return { 
          ...newState,
          logos: prev.logos,
          currentLogoImage: undefined,
          contentImage: undefined,
          needsContentImage: undefined,
        };
      }
      
      return newState;
    });

    // Ajouter un message système pour indiquer le retour
    addMessage("user", `↩️ Retour à l'étape : ${targetStep}`);
    setTimeout(() => {
      addMessage("assistant", stepMessages[targetStep] || "Continuons...");
    }, 250);
  }, [addMessage]);

  // Fonction pour avancer vers une étape déjà visitée
  const goForwardToStep = useCallback((targetStep: ConversationState["step"]) => {
    const stepIndex = visitedSteps.indexOf(targetStep);
    if (stepIndex === -1) return;

    const stepMessages: Record<string, string> = {
      domain: "Dans quel domaine souhaitez-vous créer votre affiche ?",
      details: "Parfait ! Y a-t-il des informations supplémentaires à ajouter ?",
      speakers_check: "Voulez-vous ajouter un orateur principal ou des invités sur l'affiche ?",
      main_speaker_photo: "Envoyez la photo de l'orateur principal.",
      guests_check: "Voulez-vous ajouter des invités ?",
      guest_photo: "Envoyez la photo de l'invité.",
      restaurant_menu_check: "Souhaitez-vous inclure un menu sur l'affiche ?",
      restaurant_menu_content: "Décrivez le menu avec les plats et les prix.",
      restaurant_beverages_check: "Souhaitez-vous inclure des images de boissons ?",
      restaurant_beverages_photos: "Envoyez les photos de vos boissons.",
      restaurant_dishes_check: "Souhaitez-vous inclure des images de plats ?",
      restaurant_dishes_photos: "Envoyez les photos de vos plats.",
      reference: "Avez-vous une image de référence pour le style ?",
      colors: "Choisissez les couleurs pour votre affiche.",
      logo: "Souhaitez-vous ajouter un logo ?",
      content_image: "Voulez-vous ajouter une image de contenu ?",
    };

    setConversationState(prev => ({ ...prev, step: targetStep }));

    addMessage("user", `➡️ Retour à l'étape : ${targetStep}`);
    setTimeout(() => {
      addMessage("assistant", stepMessages[targetStep] || "Continuons...");
    }, 250);
  }, [addMessage, visitedSteps]);

  return {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    suggestedDomain,
    visitedSteps,
    handleUserMessage,
    handleDomainSelect,
    handleMainSpeakerPhoto,
    handleGuestPhoto,
    handleSkipSpeakers,
    handleSkipGuests,
    handleSkipProductCharacter,
    // Restaurant handlers
    handleSkipRestaurantMenu,
    handleBeveragePhoto,
    handleSkipBeverages,
    handleDishPhoto,
    handleSkipDishes,
    // Other handlers
    handleReferenceImage,
    handleSkipReference,
    handleStylePreferencesAndSelectTemplate,
    handleSkipStylePreferences,
    handleColorsConfirm,
    handleLogoImage,
    handleLogoPosition,
    handleSkipLogo,
    handleContentImage,
    handleSkipContentImage,
    resetConversation,
    goBackToStep,
    goForwardToStep,
  };
}
