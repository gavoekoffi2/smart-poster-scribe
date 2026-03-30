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
  FormatPreset,
  UsageType,
  TemplateAnalysisDetail,
  MissingElement,
  CollectedReplacements,
  SecondaryImage,
  CreationMode,
} from "@/types/generation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDomainQuestions, getNextQuestion, domainHasQuestions, DomainQuestion } from "@/config/domainQuestions";
import { detectContextMismatch, getDomainLabel as getContextDomainLabel } from "@/utils/contextDetection";

// Domaines qui peuvent avoir des orateurs/artistes/invités
const SPEAKER_DOMAINS: Domain[] = ["church", "event", "music", "formation", "education"];

// Domaines qui sont orientés produit/e-commerce (sans restaurant qui a un traitement spécial)
const PRODUCT_DOMAINS: Domain[] = ["fashion", "technology", "health", "realestate"];

// Domaine restaurant avec traitement spécial
const RESTAURANT_DOMAIN: Domain = "restaurant";

const INITIAL_MESSAGE =
  "Bonjour ! Je suis votre assistant graphiste. Comment souhaitez-vous créer votre affiche ?";

const MODE_SELECT_MESSAGE =
  "Bonjour ! Je suis votre assistant graphiste. Comment souhaitez-vous créer votre affiche ?";

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
    language = "français",
    referenceImage,
    secondaryImages,
  } = state;

  const lines: string[] = [];

  lines.push(`LANGUE: ${language.toUpperCase()}`);
  lines.push("");

  // ====== SECTION 1: PALETTE COULEUR OBLIGATOIRE ======
  if (colorPalette?.length) {
    lines.push("╔══════════════════════════════════════════════════════════════╗");
    lines.push("║  🎨 PALETTE COULEUR OBLIGATOIRE - REMPLACEMENT TOTAL          ║");
    lines.push("╚══════════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push("🚨 REMPLACER TOUTES les couleurs du template par celles-ci:");
    lines.push("");
    
    colorPalette.slice(0, 6).forEach((hex, index) => {
      const colorName = hexToColorName(hex);
      if (index === 0) {
        lines.push(`   🎯 DOMINANTE (60%): ${hex} (${colorName})`);
        lines.push(`      → Utiliser pour: arrière-plan, grandes zones, fonds`);
      } else if (index === 1) {
        lines.push(`   🎯 SECONDAIRE (30%): ${hex} (${colorName})`);
        lines.push(`      → Utiliser pour: titres, accents, bandeaux importants`);
      } else if (index === 2) {
        lines.push(`   🎯 ACCENT (10%): ${hex} (${colorName})`);
        lines.push(`      → Utiliser pour: détails, CTA, bordures, highlights`);
      } else {
        lines.push(`   ➕ COMPLÉMENTAIRE #${index + 1}: ${hex} (${colorName})`);
        lines.push(`      → Utiliser pour: dégradés, effets, variations`);
      }
    });
    
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("⚠️ HARMONISATION INTELLIGENTE:");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("   • Créer des dégradés harmonieux entre ces couleurs");
    lines.push("   • Ajouter des effets (ombres, glow, reflets) pour unifier");
    lines.push("   • Utiliser la plus sombre pour le fond si besoin de contraste");
    lines.push("   • Garantir la lisibilité avec contrastes forts sur le texte");
    lines.push("");
    lines.push("❌ INTERDIT: Garder TOUTE couleur du template original");
    lines.push("❌ INTERDIT: Mélanger anciennes et nouvelles couleurs");
    lines.push("");
  }

  // ====== SECTION 2: CONTENU CLIENT À AFFICHER ======
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║  📝 CONTENU CLIENT - SEULES INFOS À AFFICHER                 ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");

  // Collecter tous les éléments fournis par le client
  const contentElements: { label: string; value: string; priority: number }[] = [];

  if (extractedInfo?.title) {
    contentElements.push({ label: "TITRE PRINCIPAL", value: String(extractedInfo.title), priority: 1 });
  }

  if (extractedInfo?.dates) {
    contentElements.push({ label: "DATE(S) ET HEURE(S)", value: String(extractedInfo.dates), priority: 2 });
  }

  if (extractedInfo?.location) {
    contentElements.push({ label: "LIEU / ADRESSE", value: String(extractedInfo.location), priority: 3 });
  }

  if (mainSpeaker?.name) {
    contentElements.push({ label: "ORATEUR PRINCIPAL", value: mainSpeaker.name, priority: 4 });
  }

  if (guests?.length) {
    const guestList = guests.map(g => g.name).filter(Boolean).join(", ");
    if (guestList) {
      contentElements.push({ label: "INVITÉ(S)", value: guestList, priority: 5 });
    }
  }

  if (extractedInfo?.prices) {
    contentElements.push({ label: "PRIX / TARIFS", value: String(extractedInfo.prices), priority: 6 });
  }

  if (extractedInfo?.contact) {
    contentElements.push({ label: "CONTACT", value: String(extractedInfo.contact), priority: 7 });
  }

  if (extractedInfo?.organizer) {
    contentElements.push({ label: "ORGANISATEUR", value: String(extractedInfo.organizer), priority: 8 });
  }

  if (restaurantInfo?.hasMenu && restaurantInfo.menuContent) {
    contentElements.push({ label: "MENU COMPLET", value: String(restaurantInfo.menuContent), priority: 4 });
  }

  if (productDisplay?.hasCharacter && productDisplay.characterInteraction) {
    contentElements.push({ label: "MISE EN SCÈNE PRODUIT", value: String(productDisplay.characterInteraction), priority: 4 });
  }

  contentElements.sort((a, b) => a.priority - b.priority);
  
  if (contentElements.length > 0) {
    contentElements.forEach((el, index) => {
      lines.push(`${index + 1}. ${el.label}:`);
      lines.push(`   → "${el.value}"`);
      lines.push("");
    });
  }

  if (description) {
    const cleanDesc = description.replace(/#[0-9A-Fa-f]{6}/g, "").trim();
    if (cleanDesc) {
      lines.push("DEMANDE ADDITIONNELLE:");
      lines.push(`→ ${cleanDesc}`);
      lines.push("");
    }
  }

  // ====== SECTION 3: CE QUI DOIT ÊTRE SUPPRIMÉ ======
  if (referenceImage || referenceDescription) {
    lines.push("╔══════════════════════════════════════════════════════════════╗");
    lines.push("║  🧹 ÉLÉMENTS À SUPPRIMER DU TEMPLATE ORIGINAL                ║");
    lines.push("╚══════════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push("⚠️ SUPPRIMER TOUS ces éléments du template s'ils ne sont pas ci-dessus:");
    
    if (!extractedInfo?.contact) {
      lines.push("   ❌ Tous numéros de téléphone du template → SUPPRIMER");
    }
    if (!extractedInfo?.location) {
      lines.push("   ❌ Toutes adresses/lieux du template → SUPPRIMER");
    }
    if (!extractedInfo?.dates) {
      lines.push("   ❌ Toutes dates/horaires du template → SUPPRIMER");
    }
    if (!extractedInfo?.prices) {
      lines.push("   ❌ Tous prix/tarifs du template → SUPPRIMER");
    }
    if (!mainSpeaker?.name && !guests?.length) {
      lines.push("   ❌ Tous noms d'orateurs/artistes du template → SUPPRIMER");
    }
    lines.push("   ❌ Tous logos/marques du template original → SUPPRIMER");
    lines.push("   ❌ Toutes icônes réseaux sociaux du template → SUPPRIMER");
    lines.push("   ❌ Tout autre texte du template → SUPPRIMER");
    lines.push("");
    lines.push("🎯 L'affiche ne doit contenir QUE les informations listées ci-dessus.");
    lines.push("");
  }

  // ====== SECTION 4: STYLE DU TEMPLATE ======
  if (referenceDescription || domain || customDomain) {
    lines.push("╔══════════════════════════════════════════════════════════════╗");
    lines.push("║  🎨 STYLE VISUEL - DESIGN DU TEMPLATE (PAS SON CONTENU)      ║");
    lines.push("╚══════════════════════════════════════════════════════════════╝");
    lines.push("");

    const domainLabel = domain === "other" && customDomain ? customDomain : domain;
    if (domainLabel) {
      lines.push(`Domaine: ${domainLabel}`);
    }

    if (referenceDescription) {
      lines.push("Style à reproduire:");
      lines.push(referenceDescription.replace(/\n/g, " ").slice(0, 800));
      lines.push("");
    }
    
    lines.push("");
  }

  // ====== SECTION 5: YOUTUBE THUMBNAIL SPECIFICS ======
  if (domain === "youtube") {
    lines.push("╔══════════════════════════════════════════════════════════════╗");
    lines.push("║  🎬 MINIATURE YOUTUBE - RÈGLES SPÉCIFIQUES                    ║");
    lines.push("╚══════════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push("FORMAT: 16:9 obligatoire (1280x720 ou 1920x1080).");
    lines.push("VISAGE: Expression virale marquée (30-50% de la surface). Regard caméra.");
    
    // Titre vidéo
    const videoTitle = state.domainQuestionState?.collectedTexts?.video_title;
    if (videoTitle) {
      lines.push(`THÈME VIDÉO: "${videoTitle}" → adapter TOUS les éléments visuels à ce thème.`);
    }
    
    // Photo propre ou IA
    const hasOwnImage = state.domainQuestionState?.answeredQuestions?.has_own_image;
    if (!hasOwnImage) {
      lines.push("VISAGE IA: Générer un visage expressif d'origine africaine correspondant au thème.");
      lines.push("Expression virale: surprise/choc si argent/gains, confiance si coaching/formation, excitation si lifestyle.");
    }
    
    // Éléments spécifiques
    const specificElements = state.domainQuestionState?.collectedTexts?.specific_elements;
    if (specificElements && specificElements.toLowerCase() !== "passer") {
      lines.push(`ÉLÉMENTS SPÉCIFIQUES: ${specificElements}`);
    }
    
    // Texte sur miniature
    const wantsText = state.domainQuestionState?.answeredQuestions?.wants_text;
    const thumbnailText = state.domainQuestionState?.collectedTexts?.wants_text;
    if (wantsText && thumbnailText) {
      lines.push(`TEXTE MINIATURE: "${thumbnailText}" (typographie MASSIVE, max 5 mots, très lisible).`);
    } else {
      lines.push("TEXTE: PAS de texte sur la miniature. 100% visuel.");
    }
    
    lines.push("COULEURS: Hyper-saturées (+30-50%), contrastes forts.");
    lines.push("RÉFÉRENCE: Si miniature de référence fournie, reproduire le STYLE et la COMPOSITION mais adapter au thème du client.");
    lines.push("ADAPTATION: Remplacer icônes/objets non pertinents par des éléments correspondant au thème vidéo.");
    lines.push("");
  }

  // ====== SECTION 6: PERSONNAGES ======
  if (domain !== "youtube" && (needsContentImage || mainSpeaker || (guests && guests.length > 0) || productDisplay?.hasCharacter)) {
    lines.push("PERSONNAGES: Générer des personnes africaines avec traits authentiques.");
    lines.push("");
  }

  // ====== SECTION 6: IMAGES SECONDAIRES ======
  if (secondaryImages && secondaryImages.length > 0) {
    lines.push("╔══════════════════════════════════════════════════════════════╗");
    lines.push("║  📸 IMAGES SECONDAIRES À INTÉGRER                            ║");
    lines.push("╚══════════════════════════════════════════════════════════════╝");
    lines.push("");
    lines.push(`${secondaryImages.length} image(s) secondaire(s) à placer sur l'affiche:`);
    lines.push("");
    
    secondaryImages.forEach((img, index) => {
      lines.push(`IMAGE SECONDAIRE #${index + 1}:`);
      if (img.instructions && img.instructions.trim()) {
        lines.push(`   → Instructions: "${img.instructions}"`);
      } else {
        lines.push(`   → Placer harmonieusement sur l'affiche`);
      }
      lines.push("");
    });
    
    lines.push("⚠️ Intégrer ces images de manière cohérente avec le design global.");
    lines.push("");
  }

  return lines.join("\n").trim();
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

// Fonction d'extraction simple pour fallback - extrait les infos basiques du texte utilisateur
function simpleExtractInfo(text: string): ExtractedInfo {
  const extractedInfo: ExtractedInfo = {};
  
  // Extraire le titre (première ligne ou texte avant "le" ou début)
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    // Chercher un titre explicite
    const titleMatch = text.match(/titre\s*[:=]?\s*([^\n,]+)/i);
    if (titleMatch) {
      extractedInfo.title = titleMatch[1].trim();
    }
  }
  
  // Extraire les dates
  const datePatterns = [
    /(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/gi,
    /(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})/gi,
    /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{1,2}/gi,
    /\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedInfo.dates = match[0];
      break;
    }
  }
  
  // Extraire les contacts (téléphone, whatsapp)
  const phoneMatch = text.match(/(\+?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4})/);
  if (phoneMatch) {
    extractedInfo.contact = phoneMatch[1];
  }
  
  // Extraire les prix
  const priceMatch = text.match(/(\d+[\s,.]?\d*\s*(FCFA|CFA|€|EUR|XOF|XAF|\$|USD))/i);
  if (priceMatch) {
    extractedInfo.prices = priceMatch[0];
  }
  
  // Extraire le lieu
  const lieuMatch = text.match(/lieu\s*[:=]?\s*([^\n,]+)/i) || text.match(/adresse\s*[:=]?\s*([^\n,]+)/i);
  if (lieuMatch) {
    extractedInfo.location = lieuMatch[1].trim();
  }
  
  // Si pas de titre trouvé, prendre une partie du texte
  if (!extractedInfo.title && text.length > 0) {
    extractedInfo.title = text.split('\n')[0].substring(0, 100);
  }
  
  return extractedInfo;
}

// Interface pour les zones de texte du template
interface TemplateTextZone {
  type: string;
  content: string;
  position?: string;
}

// Vérifie quelles zones de texte du template n'ont pas de remplacement fourni par l'utilisateur
function checkMissingTextZones(
  templateZones: TemplateTextZone[],
  userInfo: ExtractedInfo,
  userMessage: string
): TemplateTextZone[] {
  const missing: TemplateTextZone[] = [];
  const lowerMessage = userMessage.toLowerCase();
  
  for (const zone of templateZones) {
    // Ignorer les zones illisibles ou vides
    if (!zone.content || zone.content === "[illisible]" || zone.content.trim() === "") {
      continue;
    }
    
    // Vérifier si l'utilisateur a fourni un remplacement pour ce type de zone
    let hasReplacement = false;
    
    switch (zone.type) {
      case "title":
        hasReplacement = !!(userInfo.title && userInfo.title.trim().length > 0);
        break;
      case "subtitle":
      case "slogan":
      case "tagline":
        // Ces zones sont couvertes par le titre, description ou additionalDetails
        hasReplacement = !!(
          userInfo.title ||
          userInfo.additionalDetails ||
          lowerMessage.includes("sous-titre") ||
          lowerMessage.includes("slogan")
        );
        break;
      case "date":
      case "time":
        hasReplacement = !!(userInfo.dates && userInfo.dates.trim().length > 0);
        break;
      case "location":
        hasReplacement = !!(userInfo.location && userInfo.location.trim().length > 0);
        break;
      case "contact":
        hasReplacement = !!(userInfo.contact && userInfo.contact.trim().length > 0);
        break;
      case "price":
        hasReplacement = !!(userInfo.prices && userInfo.prices.trim().length > 0);
        break;
      case "speaker":
        hasReplacement = !!(
          userInfo.speakers ||
          lowerMessage.includes("orateur") ||
          lowerMessage.includes("artiste") ||
          lowerMessage.includes("invité") ||
          lowerMessage.includes("pasteur") ||
          lowerMessage.includes("évêque") ||
          lowerMessage.includes("bishop")
        );
        break;
      case "organizer":
        hasReplacement = !!(
          userInfo.organizer ||
          lowerMessage.includes("organisateur") ||
          lowerMessage.includes("organisé par") ||
          lowerMessage.includes("présenté par")
        );
        break;
      case "social":
        // Les réseaux sociaux sont optionnels, on les ignore si pas fournis
        hasReplacement = true;
        break;
      default:
        // Pour les autres types, vérifier si mentionné dans additionalDetails ou le message
        hasReplacement = !!(
          userInfo.additionalDetails ||
          lowerMessage.includes(zone.content.toLowerCase().slice(0, 10))
        );
    }
    
    if (!hasReplacement) {
      missing.push(zone);
    }
  }
  
  return missing;
}

// Construit le message pour demander confirmation des zones manquantes
function buildMissingZonesQuestion(missingZones: TemplateTextZone[]): string {
  let message = `⚠️ **Attention !** J'ai remarqué que l'affiche originale contient des éléments que vous n'avez pas fournis :\n\n`;
  
  // Regrouper par type pour un affichage plus clair
  const typeLabels: Record<string, string> = {
    title: "Titre",
    subtitle: "Sous-titre",
    slogan: "Slogan/Accroche",
    tagline: "Phrase d'accroche",
    date: "Date",
    time: "Heure",
    location: "Lieu/Adresse",
    contact: "Contact",
    price: "Prix/Tarif",
    speaker: "Orateur/Artiste",
    organizer: "Organisateur",
    social: "Réseaux sociaux",
    other: "Autre texte",
  };
  
  for (const zone of missingZones) {
    const label = typeLabels[zone.type] || zone.type;
    const content = zone.content.length > 50 ? zone.content.slice(0, 50) + "..." : zone.content;
    message += `• **${label}**: "${content}"\n`;
  }
  
  message += `\n📌 **Que souhaitez-vous faire ?**\n`;
  message += `- **Fournir** les informations manquantes (écrivez-les ci-dessous)\n`;
  message += `- **Supprimer** ces zones de l'affiche finale (tapez "supprimer" ou "continuer sans")\n`;
  
  return message;
}

interface CloneTemplateData {
  id: string;
  imageUrl: string;
  domain: string;
  description: string | null;
}

interface TemplateQuestion {
  id: string;
  question: string;
  type: "text" | "multiline";
  placeholder: string;
  required: boolean;
}

export function useConversation(cloneTemplate?: CloneTemplateData) {
  const [isCloneMode] = useState(!!cloneTemplate);
  const [templateQuestions, setTemplateQuestions] = useState<TemplateQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [templateAnswers, setTemplateAnswers] = useState<Record<string, string>>({});
  
  const getInitialMessage = () => {
    if (cloneTemplate) {
      return "J'analyse cette affiche pour comprendre les informations à personnaliser...";
    }
    return INITIAL_MESSAGE;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: getInitialMessage(),
      timestamp: new Date(),
      image: cloneTemplate?.imageUrl,
    },
  ]);

  const [conversationState, setConversationState] = useState<ConversationState>({
    step: cloneTemplate ? "analyzing_template" : "mode_select",
    domain: cloneTemplate?.domain as Domain | undefined,
    referenceImage: cloneTemplate?.imageUrl,
  });

  const conversationStateRef = useRef<ConversationState>(conversationState);
  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(cloneTemplate?.domain || null);
  const [visitedSteps, setVisitedSteps] = useState<ConversationState["step"][]>(["mode_select"]);
  const [creditError, setCreditError] = useState<{
    error: string;
    message: string;
    remaining?: number;
    needed?: number;
    is_free?: boolean;
  } | null>(null);

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

  // Fonction pour compresser une image base64 (max 2MB pour analyse rapide)
  const compressImageForAnalysis = async (base64: string, maxSizeMB: number = 2): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculer la taille actuelle approximative
        const base64Content = base64.includes(',') ? base64.split(',')[1] : base64;
        const currentSizeMB = (base64Content.length * 3 / 4) / (1024 * 1024);
        
        // Si déjà assez petit, retourner tel quel
        if (currentSizeMB <= maxSizeMB) {
          resolve(base64);
          return;
        }
        
        // Calculer le ratio de réduction nécessaire
        const ratio = Math.sqrt(maxSizeMB / currentSizeMB);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        
        // Limiter à 1200px max pour l'analyse
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        // Utiliser une qualité réduite pour l'analyse (0.7)
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        console.log(`Image compressed for analysis: ${currentSizeMB.toFixed(2)}MB -> ${((compressed.length * 3 / 4) / (1024 * 1024)).toFixed(2)}MB`);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error("Impossible de charger l'image"));
      img.src = base64;
    });
  };

  // Analyser le template au démarrage en mode clone - FLUX OPTIMISÉ
  useEffect(() => {
    if (isCloneMode && cloneTemplate && conversationState.step === "analyzing_template") {
      const analyzeTemplate = async () => {
        setIsProcessing(true);
        try {
          // Convertir l'image locale en base64 si nécessaire
          let imageToAnalyze = cloneTemplate.imageUrl;
          if (cloneTemplate.imageUrl.startsWith('/')) {
            try {
              const res = await fetch(cloneTemplate.imageUrl);
              if (res.ok) {
                const blob = await res.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(String(reader.result));
                  reader.onerror = () => reject(new Error("Impossible de lire l'image"));
                  reader.readAsDataURL(blob);
                });
                // Compresser pour l'analyse (max 2MB)
                imageToAnalyze = await compressImageForAnalysis(base64, 2);
              }
            } catch (e) {
              console.warn("Erreur conversion base64:", e);
            }
          } else if (imageToAnalyze.startsWith('data:image/')) {
            // Compresser aussi les images base64 déjà fournies
            imageToAnalyze = await compressImageForAnalysis(imageToAnalyze, 2);
          }

          // Détecter si c'est une miniature YouTube
          const isYouTubeThumbnail = cloneTemplate.domain === 'youtube' || 
            cloneTemplate.imageUrl.toLowerCase().includes('youtube') ||
            cloneTemplate.imageUrl.toLowerCase().includes('thumbnail');

          const { data, error } = await supabase.functions.invoke("analyze-template", {
            body: { 
              imageUrl: imageToAnalyze, 
              domain: cloneTemplate.domain,
              existingDescription: cloneTemplate.description,
              isYouTubeThumbnail,
            },
          });

          setIsProcessing(false);
          
          // Stocker les infos du template avec analyse détaillée
          let templateDescription = "Template professionnel africain";
          let youtubeAnalysis: any = null;
          let templateAnalysis: TemplateAnalysisDetail | undefined = undefined;
          
          if (!error && data?.success && data.analysis) {
            templateDescription = `${data.analysis.templateDescription || ''}. ${data.analysis.suggestedPrompt || ''}`;
            youtubeAnalysis = data.analysis.youtubeAnalysis || null;
            
            // Extraire l'analyse détaillée du template
            const detected = data.analysis.detectedElements || {};
            templateAnalysis = {
              peopleCount: detected.peopleCount || 0,
              peopleDescriptions: detected.peopleDescriptions || [],
              logoCount: detected.logoCount || 0,
              logoPositions: detected.logoPositions || [],
              hasPhoneNumber: detected.hasPhoneNumber || false,
              hasEmail: detected.hasEmail || false,
              hasAddress: detected.hasAddress || false,
              hasDate: detected.hasDate || false,
              hasTime: detected.hasTime || false,
              hasPrice: detected.hasPrice || false,
              hasSocialIcons: detected.hasSocialIcons || false,
              socialPlatforms: detected.socialPlatforms || [],
              productCount: detected.productCount || 0,
              textZones: detected.textZones || [],
            };
          }

          // Mettre à jour l'état avec la description du style, le domaine, et l'analyse détaillée
          setConversationState(prev => ({
            ...prev,
            step: "clone_gathering",
            referenceDescription: templateDescription,
            domain: (cloneTemplate.domain as Domain) || prev.domain,
            templateAnalysis: templateAnalysis,
            collectedReplacements: {}, // Initialiser les remplacements
          }));
          
          // Construire le message d'intro enrichi selon le type de template
          const introMessage = isYouTubeThumbnail 
            ? buildYouTubeCloneIntroMessage(templateAnalysis, youtubeAnalysis)
            : buildEnhancedCloneIntroMessage(templateAnalysis);
          
          // Remplacer le message initial par le message avec l'image et les instructions
          setMessages([{
            id: "clone-intro",
            role: "assistant",
            content: introMessage,
            timestamp: new Date(),
            image: cloneTemplate.imageUrl
          }]);
          
        } catch (err) {
          console.error("Error analyzing template:", err);
          setIsProcessing(false);
          
          // Fallback: passer directement à la collecte
          setConversationState(prev => ({ 
            ...prev, 
            step: "clone_gathering",
            referenceDescription: "Template professionnel"
          }));
          
          setMessages([{
            id: "clone-intro",
            role: "assistant", 
            content: buildEnhancedCloneIntroMessage(undefined),
            timestamp: new Date(),
            image: cloneTemplate.imageUrl
          }]);
        }
      };

      analyzeTemplate();
    }
  }, [isCloneMode, cloneTemplate, conversationState.step]);
  
  // Construire le message d'introduction enrichi pour le mode clone
  const buildEnhancedCloneIntroMessage = (analysis?: TemplateAnalysisDetail): string => {
    let message = `🎨 **J'ai analysé cette affiche en détail !**\n\n`;
    
    if (analysis) {
      message += `📋 **Éléments détectés à remplacer :**\n`;
      
      if (analysis.peopleCount > 0) {
        const descriptions = analysis.peopleDescriptions.length > 0 
          ? ` (${analysis.peopleDescriptions.join(", ")})` 
          : "";
        message += `• **${analysis.peopleCount} personne(s)**${descriptions}\n`;
      }
      if (analysis.logoCount > 0) {
        message += `• **${analysis.logoCount} logo(s)**\n`;
      }
      if (analysis.hasPhoneNumber || analysis.hasEmail) {
        message += `• Contact (téléphone/email)\n`;
      }
      if (analysis.hasAddress) {
        message += `• Lieu/Adresse\n`;
      }
      if (analysis.hasDate || analysis.hasTime) {
        message += `• Date et heure\n`;
      }
      if (analysis.hasPrice) {
        message += `• Prix/Tarifs\n`;
      }
      if (analysis.hasSocialIcons && analysis.socialPlatforms.length > 0) {
        message += `• Réseaux sociaux (${analysis.socialPlatforms.join(", ")})\n`;
      }
      if (analysis.productCount > 0) {
        message += `• **${analysis.productCount} produit(s)**\n`;
      }
      
      // Lister les zones de texte détectées
      const textTypes = [...new Set(analysis.textZones.map(z => z.type))];
      if (textTypes.length > 0) {
        message += `• Textes: ${textTypes.join(", ")}\n`;
      }
      
      message += `\n`;
    }
    
    message += `📝 **Donnez-moi VOS informations pour personnaliser cette affiche :**\n\n`;
    message += `• **Titre** de votre événement/offre\n`;
    message += `• **Date et heure** (si applicable)\n`;
    message += `• **Lieu** (si applicable)\n`;
    message += `• **Contact** : téléphone, WhatsApp, email\n`;
    message += `• **Prix/Tarifs** (si applicable)\n`;
    message += `• **Orateur/Artiste** (si applicable)\n`;
    message += `• Tout autre détail important\n\n`;
    message += `💡 **Important** : Tout ce que vous ne fournissez pas sera **supprimé** de l'affiche finale.\n`;
    message += `💡 Si vous voulez ajouter des **photos** ou un **logo**, envoyez-les après avoir fourni vos informations.`;
    
    return message;
  };

  // Construire le message d'introduction pour le clone de miniature YouTube
  const buildYouTubeCloneIntroMessage = (analysis?: TemplateAnalysisDetail, youtubeAnalysis?: any): string => {
    let message = `🎬 **Je vais créer une miniature YouTube en m'inspirant de ce style !**\n\n`;
    
    if (analysis) {
      message += `📋 **Éléments détectés :**\n`;
      if (analysis.peopleCount > 0) {
        message += `• ${analysis.peopleCount} personne(s) avec expression ${youtubeAnalysis?.faceExpression || 'expressive'}\n`;
      }
      if (analysis.logoCount > 0) {
        message += `• ${analysis.logoCount} logo(s)\n`;
      }
      if (analysis.textZones.length > 0) {
        message += `• Texte percutant\n`;
      }
      if (youtubeAnalysis?.objects?.length > 0) {
        message += `• Objets symboliques: ${youtubeAnalysis.objects.join(', ')}\n`;
      }
      message += `\n`;
    }
    
    if (youtubeAnalysis?.suggestedStagingOptions?.length > 0) {
      message += `🎭 **Options de mise en scène similaires :**\n`;
      youtubeAnalysis.suggestedStagingOptions.slice(0, 3).forEach((option: string) => {
        message += `• ${option}\n`;
      });
      message += `\n`;
    }
    
    message += `📝 **Pour personnaliser votre miniature :**\n\n`;
    message += `• 🎬 **Titre de votre vidéo** (obligatoire)\n`;
    message += `• 🔄 **Éléments à remplacer** sur la miniature de référence\n`;
    message += `• 📸 **Photo de la personne** (ou je génère un visage expressif)\n`;
    message += `• 🏷️ **Logos/icônes** à ajouter (YouTube, TikTok, etc.)\n`;
    message += `• Tout autre détail important\n\n`;
    message += `💡 **Important** : Tout ce que vous ne fournissez pas sera **adapté automatiquement** au thème de votre vidéo.\n`;
    message += `💡 Envoyez vos **photos** et **logos** après avoir fourni vos informations.`;
    message += `• 📸 **Votre photo** (envoyez-la) OU dites "générer" pour que l'IA crée un visage\n`;
    message += `• 🎭 **Mise en scène souhaitée** (ex: "je tiens des billets", "mon logo flotte à côté")\n`;
    message += `• 🏷️ **Logo(s)** à ajouter (si applicable)\n\n`;
    message += `💡 **Important** : Le visage expressif est la clé d'une miniature virale !`;
    
    return message;
  };

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
        const logoImages = logos.map((l) => l.imageUrl);
        const logoPositions = logos.map((l) => l.position);

        // Fonction pour compresser une image pour la génération (max 8MB)
        const compressImageForGeneration = async (base64: string, maxSizeMB: number = 8): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let { width, height } = img;
              
              // Calculer la taille actuelle approximative
              const base64Content = base64.includes(',') ? base64.split(',')[1] : base64;
              const currentSizeMB = (base64Content.length * 3 / 4) / (1024 * 1024);
              
              // Si déjà assez petit, retourner tel quel
              if (currentSizeMB <= maxSizeMB) {
                resolve(base64);
                return;
              }
              
              // Calculer le ratio de réduction nécessaire
              const ratio = Math.sqrt(maxSizeMB / currentSizeMB);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
              
              // Limiter à 2000px max pour la génération
              const maxDim = 2000;
              if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(base64);
                return;
              }
              
              ctx.drawImage(img, 0, 0, width, height);
              // Utiliser qualité 0.85 pour la génération
              const compressed = canvas.toDataURL('image/jpeg', 0.85);
              console.log(`Image compressed for generation: ${currentSizeMB.toFixed(2)}MB -> ${((compressed.length * 3 / 4) / (1024 * 1024)).toFixed(2)}MB`);
              resolve(compressed);
            };
            img.onerror = () => reject(new Error("Impossible de charger l'image"));
            img.src = base64;
          });
        };

        // Si on utilise un template local (public/reference-templates), on l'envoie en base64
        // pour éviter les échecs de téléchargement côté backend.
        let referenceImageToSend: string | undefined = state.referenceImage || undefined;
        if (referenceImageToSend && !referenceImageToSend.startsWith("data:image/")) {
          const looksLikeLocalTemplate = referenceImageToSend.includes("/reference-templates/");
          if (looksLikeLocalTemplate) {
            try {
              const res = await fetch(referenceImageToSend);
              if (res.ok) {
                const blob = await res.blob();
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(String(reader.result));
                  reader.onerror = () => reject(new Error("Impossible de lire l'image de template"));
                  reader.readAsDataURL(blob);
                });
                // Compresser pour la génération (max 8MB)
                referenceImageToSend = await compressImageForGeneration(base64, 8);
              }
            } catch (e) {
              console.warn("Impossible de convertir le template en base64, envoi de l'URL:", e);
            }
          }
        } else if (referenceImageToSend && referenceImageToSend.startsWith("data:image/")) {
          // Compresser aussi les images base64 existantes si trop grandes
          try {
            referenceImageToSend = await compressImageForGeneration(referenceImageToSend, 8);
          } catch (e) {
            console.warn("Impossible de compresser l'image de référence:", e);
          }
        }

        // Envoyer les images avec le prompt
        // Détecter le mode clone: si on a une image de référence ET qu'on est parti du cloneTemplate
        const isCloneModeActive = isCloneMode && !!referenceImageToSend;
        
        // Déterminer le format et la résolution
        const formatPreset = state.formatPreset;
        // YouTube: forcer 16:9
        const aspectRatio = state.domain === "youtube" ? "16:9" : (formatPreset?.aspectRatio || "3:4");
        // Utiliser la résolution choisie par l'utilisateur, défaut à 1K (économique pour tous)
        const resolution: Resolution = formatPreset?.resolution || "1K";
        
        // Rafraîchir la session avant l'appel pour éviter les tokens expirés
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log("Session refresh warning:", refreshError.message);
        }
        
        // Extraire les préférences de mise en scène YouTube si disponibles
        const youtubeScenePreference = state.domainSpecificInfo?.youtube?.scenePreference 
          || state.domainQuestionState?.collectedTexts?.scene_preference;
        
        // Préparer les images secondaires
        const secondaryImagesData = state.secondaryImages?.map(img => ({
          imageUrl: img.imageUrl,
          instructions: img.instructions || "",
        })) || [];

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt,
            aspectRatio,
            resolution,
            referenceImage: referenceImageToSend,
            logoImages: logoImages.length > 0 ? logoImages : undefined,
            logoPositions: logoPositions.length > 0 ? logoPositions : undefined,
            contentImage: state.contentImage || undefined,
            secondaryImages: secondaryImagesData.length > 0 ? secondaryImagesData : undefined,
            isCloneMode: isCloneModeActive,
            formatWidth: formatPreset?.width,
            formatHeight: formatPreset?.height,
            usageType: state.usageType || "social",
            // Nouvelles props pour YouTube
            scenePreference: youtubeScenePreference || undefined,
            domain: state.domain || undefined,
          },
        });

        if (error || !data?.success) {
          const errorData = data as any;
          
          // Check for credit-related errors
          if (errorData?.error === "FREE_LIMIT_REACHED" ||
              errorData?.error === "RESOLUTION_NOT_ALLOWED" ||
              errorData?.error === "INSUFFICIENT_CREDITS" ||
              errorData?.error === "AUTHENTICATION_REQUIRED") {
            setCreditError(errorData);
            addMessage(
              "assistant",
              errorData.message || "Erreur de crédits. Veuillez vérifier votre abonnement."
            );
            setConversationState((prev) => ({ ...prev, step: "content_image" }));
            return;
          }
          
          const msg = errorData?.error || error?.message || "Erreur inconnue";
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
        const logoImages = logos.map((l) => l.imageUrl);
        const logoPositions = logos.map((l) => l.position);

        // Même logique: si référence = template local, envoyer en base64
        let referenceImageToSend: string | undefined = state.referenceImage || undefined;
        if (referenceImageToSend && !referenceImageToSend.startsWith("data:image/")) {
          const looksLikeLocalTemplate = referenceImageToSend.includes("/reference-templates/");
          if (looksLikeLocalTemplate) {
            try {
              const res = await fetch(referenceImageToSend);
              if (res.ok) {
                const blob = await res.blob();
                referenceImageToSend = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(String(reader.result));
                  reader.onerror = () => reject(new Error("Impossible de lire l'image de template"));
                  reader.readAsDataURL(blob);
                });
              }
            } catch (e) {
              console.warn("Impossible de convertir le template en base64, envoi de l'URL:", e);
            }
          }
        }
        
        // Rafraîchir la session avant l'appel pour éviter les tokens expirés
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log("Session refresh warning:", refreshError.message);
        }

        // Use the same aspect ratio and resolution as the original generation
        const formatPreset = state.formatPreset;
        const aspectRatio = state.domain === "youtube" ? "16:9" : (formatPreset?.aspectRatio || "3:4");
        const resolution = formatPreset?.resolution || "2K";
        const outputFormat = "png";

        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: modificationPrompt,
            aspectRatio,
            resolution,
            outputFormat,
            referenceImage: generatedImage || referenceImageToSend,
            logoImages: logoImages.length > 0 ? logoImages : undefined,
            logoPositions: logoPositions.length > 0 ? logoPositions : undefined,
            contentImage: state.contentImage || undefined,
            isCloneMode: true,
            isModification: true,
            domain: state.domain || undefined,
          },
        });

        removeLoadingMessage();

        if (error || !data?.success) {
          const errorData = data as any;
          
          // Check for credit-related errors
          if (errorData?.error === "FREE_LIMIT_REACHED" ||
              errorData?.error === "RESOLUTION_NOT_ALLOWED" ||
              errorData?.error === "INSUFFICIENT_CREDITS" ||
              errorData?.error === "AUTHENTICATION_REQUIRED") {
            setCreditError(errorData);
            addMessage(
              "assistant",
              errorData.message || "Erreur de crédits. Veuillez vérifier votre abonnement."
            );
            setConversationState((prev) => ({ ...prev, step: "complete" }));
            return;
          }
          
          const msg = errorData?.error || error?.message || "Erreur inconnue";
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
      const extractedInfo = conversationStateRef.current.extractedInfo;
      const description = conversationStateRef.current.description || "";
      
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
            .limit(30);
          
          if (!error && allTemplates) {
            templates = allTemplates;
          }
        }
        
        removeLoadingMessage();
        setIsProcessing(false);
        
        if (templates.length > 0) {
          // =========== SÉLECTION CONTEXTUELLE DES TEMPLATES ===========
          // Analyser quels éléments l'utilisateur a fournis
          const hasLocation = !!(extractedInfo?.location);
          const hasContact = !!(extractedInfo?.contact);
          const hasPrice = !!(extractedInfo?.prices);
          const hasDates = !!(extractedInfo?.dates);
          const hasSpeakers = !!(extractedInfo?.speakers);
          const hasMenu = restaurantInfo?.hasMenu;
          
          // Créer un score pour chaque template basé sur la compatibilité
          const scoredTemplates = templates.map(t => {
            const desc = (t.description || "").toLowerCase();
            const tags = (t.tags || []).map((tag: string) => tag.toLowerCase());
            const allText = desc + " " + tags.join(" ");
            
            let score = 0;
            let penalty = 0;
            
            // BONUS: template correspond aux éléments fournis
            if (hasLocation && (allText.includes("lieu") || allText.includes("adresse") || allText.includes("location"))) {
              score += 2;
            }
            if (hasContact && (allText.includes("contact") || allText.includes("phone") || allText.includes("tel"))) {
              score += 2;
            }
            if (hasPrice && (allText.includes("prix") || allText.includes("price") || allText.includes("tarif"))) {
              score += 2;
            }
            if (hasDates && (allText.includes("date") || allText.includes("heure") || allText.includes("time"))) {
              score += 2;
            }
            if (hasSpeakers && (allText.includes("orateur") || allText.includes("speaker") || allText.includes("artiste") || allText.includes("invité"))) {
              score += 3;
            }
            
            // PÉNALITÉ: template contient des éléments NON fournis par l'utilisateur
            // (pour éviter de choisir un template avec localisation si user n'a pas donné de lieu)
            if (!hasLocation && (allText.includes("lieu") || allText.includes("adresse") || allText.includes("location icon"))) {
              penalty += 1;
            }
            if (!hasContact && (allText.includes("contact") || allText.includes("whatsapp") || allText.includes("téléphone"))) {
              penalty += 1;
            }
            
            // Restaurant spécifique
            if (currentDomain === "restaurant") {
              if (hasMenu && (allText.includes("menu") || allText.includes("carte"))) {
                score += 3;
              } else if (!hasMenu && (allText.includes("menu") || allText.includes("carte"))) {
                penalty += 2;
              } else if (!hasMenu && (allText.includes("promo") || allText.includes("offre"))) {
                score += 2;
              }
            }
            
            // Match avec le domaine
            if (t.domain === currentDomain) {
              score += 5;
            }
            
            // Match avec la description utilisateur (mots-clés)
            const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
            descWords.forEach(word => {
              if (allText.includes(word)) score += 1;
            });
            
            // Préférences de style
            if (preferences) {
              const prefLower = preferences.toLowerCase();
              if (prefLower.includes("moderne") && allText.includes("modern")) score += 2;
              if (prefLower.includes("élégant") && (allText.includes("élégant") || allText.includes("luxe"))) score += 2;
              if (prefLower.includes("coloré") && allText.includes("color")) score += 2;
              if (prefLower.includes("sobre") && (allText.includes("sobre") || allText.includes("minimal"))) score += 2;
              if (prefLower.includes("festif") && (allText.includes("fête") || allText.includes("celebration"))) score += 2;
            }
            
            return { template: t, score: score - penalty };
          });
          
          // Trier par score décroissant et prendre un des meilleurs (avec un peu d'aléatoire)
          scoredTemplates.sort((a, b) => b.score - a.score);
          const topTemplates = scoredTemplates.slice(0, Math.min(5, scoredTemplates.length));
          const selectedTemplate = topTemplates[Math.floor(Math.random() * topTemplates.length)].template;
          
          const imageUrl = selectedTemplate.image_url.startsWith('/')
            ? window.location.origin + selectedTemplate.image_url
            : selectedTemplate.image_url;
          
          // Build a description that emphasizes EXACT design replication but NEW content
          // PLUS: indiquer quels éléments NE PAS inclure
          const missingElements: string[] = [];
          if (!hasLocation) missingElements.push("lieu/adresse");
          if (!hasContact) missingElements.push("contact/téléphone");
          if (!hasPrice) missingElements.push("prix");
          if (!hasDates) missingElements.push("dates");
          
          let styleDescription = selectedTemplate.description || "";
          
          // Add strong instructions to copy design but create new content
          styleDescription = `DESIGN TEMPLATE À REPRODUIRE: Ce template sert de modèle de design. ` +
            `Reproduire FIDÈLEMENT: la mise en page, la disposition des éléments, les polices, les couleurs, ` +
            `les formes décoratives, le style graphique, et l'atmosphère visuelle. ` +
            `MAIS créer du contenu NOUVEAU: remplacer tous les textes par les informations de l'utilisateur, ` +
            `et si le template contient des personnages/personnes, générer des NOUVEAUX personnages africains ` +
            `avec des poses et apparences DIFFÉRENTES mais dans le même emplacement. ` +
            (missingElements.length > 0 ? `IMPORTANT: NE PAS inclure ces éléments car l'utilisateur ne les a pas fournis: ${missingElements.join(", ")}. ` : "") +
            (styleDescription ? `Description du template: ${styleDescription}` : "");
          
          // Add user's style preferences if provided
          if (preferences) {
            styleDescription = `${styleDescription}. PRÉFÉRENCES ADDITIONNELLES: ${preferences}`;
          }
          
          setConversationState((prev) => ({
            ...prev,
            step: "colors",
            referenceImage: imageUrl,
            referenceDescription: styleDescription,
            stylePreferences: preferences,
            usingAutoTemplate: true,
          }));
          
          const domainMessage = currentDomain 
            ? `J'ai sélectionné un style adapté à votre demande.`
            : "J'ai sélectionné un style à partir de notre collection.";
          
          addMessage(
            "assistant",
            `${domainMessage} Je vais créer un design original en utilisant uniquement VOS informations. Choisissez une palette de couleurs :`
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

  // Handler pour la sélection du mode de création
  const handleModeSelect = useCallback((mode: CreationMode) => {
    addMessage("user", mode === "quick" ? "⚡ Mode Rapide" : "🎨 Mode Personnalisé");
    
    if (mode === "quick") {
      setConversationState(prev => ({
        ...prev,
        step: "quick_description",
        creationMode: "quick",
      }));
      setTimeout(() => {
        addMessage("assistant", "Décrivez votre affiche en quelques mots (type, textes, dates, prix, contact...) et je la génère immédiatement !");
      }, 250);
    } else {
      setConversationState(prev => ({
        ...prev,
        step: "greeting",
        creationMode: "custom",
      }));
      setTimeout(() => {
        addMessage("assistant", "Décrivez-moi l'affiche que vous souhaitez créer (type, textes, dates, prix, contact, etc.)");
      }, 250);
    }
  }, [addMessage]);

  // Handler pour les options post-génération en mode rapide
  const handlePostGenerationOption = useCallback((option: "logo" | "colors" | "format" | "keep") => {
    if (option === "keep") {
      addMessage("user", "C'est parfait !");
      addMessage("assistant", "Super ! Votre affiche est finalisée. 🎉 Vous pouvez la télécharger ou demander d'autres modifications en les décrivant ci-dessous.");
      setConversationState(prev => ({ ...prev, step: "complete" }));
      return;
    }
    
    if (option === "logo") {
      addMessage("user", "Ajouter un logo");
      setConversationState(prev => ({ ...prev, step: "logo" }));
      setTimeout(() => {
        addMessage("assistant", "Envoyez votre logo ou cliquez sur 'Passer' :");
      }, 250);
    } else if (option === "colors") {
      addMessage("user", "Changer les couleurs");
      setConversationState(prev => ({ ...prev, step: "colors" }));
      setTimeout(() => {
        addMessage("assistant", "Choisissez une nouvelle palette de couleurs :");
      }, 250);
    } else if (option === "format") {
      addMessage("user", "Changer le format");
      setConversationState(prev => ({ ...prev, step: "format" }));
      setTimeout(() => {
        addMessage("assistant", "Choisissez le format souhaité :");
      }, 250);
    }
  }, [addMessage]);

  const handleUserMessage = useCallback(
    async (content: string) => {
      addMessage("user", content);
      const { step } = conversationStateRef.current;

      // Handle modification requests when in complete state
      if (step === "complete") {
        handleModificationRequest(content);
        return;
      }

      // Handle template questions in clone mode
      if (step === "template_questions") {
        // Sauvegarder la réponse
        const currentQuestion = templateQuestions[currentQuestionIndex];
        if (currentQuestion) {
          const newAnswers = { ...templateAnswers, [currentQuestion.id]: content };
          setTemplateAnswers(newAnswers);
          
          // Passer à la question suivante ou finaliser
          if (currentQuestionIndex < templateQuestions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            const nextQuestion = templateQuestions[nextIndex];
            addMessage("assistant", nextQuestion.question);
          } else {
            // Toutes les questions ont été répondues
            // En mode CLONE: passer DIRECTEMENT à la génération (pas de couleurs, logo, etc.)
            // La référence est déjà le template cloné
            const extractedInfo: ExtractedInfo = {};
            
            // Mapper les réponses aux champs extractedInfo
            if (newAnswers.title) extractedInfo.title = newAnswers.title;
            if (newAnswers.subtitle) extractedInfo.additionalDetails = (extractedInfo.additionalDetails || '') + ' ' + newAnswers.subtitle;
            if (newAnswers.date || newAnswers.dates) extractedInfo.dates = newAnswers.date || newAnswers.dates;
            if (newAnswers.time) {
              extractedInfo.dates = `${extractedInfo.dates || ''} à ${newAnswers.time}`.trim();
            }
            if (newAnswers.location || newAnswers.lieu) extractedInfo.location = newAnswers.location || newAnswers.lieu;
            if (newAnswers.contact) extractedInfo.contact = newAnswers.contact;
            if (newAnswers.price || newAnswers.prix || newAnswers.tarif) {
              extractedInfo.prices = newAnswers.price || newAnswers.prix || newAnswers.tarif;
            }
            if (newAnswers.speaker || newAnswers.orateur || newAnswers.artiste) {
              extractedInfo.speakers = newAnswers.speaker || newAnswers.orateur || newAnswers.artiste;
            }
            if (newAnswers.guests || newAnswers.invites) {
              extractedInfo.speakers = `${extractedInfo.speakers || ''}, ${newAnswers.guests || newAnswers.invites}`.trim();
            }
            if (newAnswers.details) extractedInfo.additionalDetails = newAnswers.details;
            if (newAnswers.organizer || newAnswers.organisateur) {
              extractedInfo.organizer = newAnswers.organizer || newAnswers.organisateur;
            }
            if (newAnswers.social || newAnswers.reseaux) {
              extractedInfo.contact = `${extractedInfo.contact || ''} | ${newAnswers.social || newAnswers.reseaux}`.trim();
            }
            
            // Construire une description complète à partir des réponses
            const fullDescription = Object.entries(newAnswers)
              .filter(([_, value]) => value && value.trim())
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ");
            
            // MODE CLONE: Ajouter l'étape couleurs avant de générer
            // L'utilisateur doit pouvoir personnaliser ses couleurs
            setConversationState(prev => ({
              ...prev,
              step: "colors",
              extractedInfo: { ...conversationStateRef.current.extractedInfo, ...extractedInfo },
              description: fullDescription,
              // referenceImage est déjà défini avec le template cloné
            }));
            
            addMessage("assistant", "Parfait ! Choisissez maintenant une palette de couleurs pour personnaliser votre affiche :");
          }
        }
        return;
      }

      // Handle clone gathering - user provides ALL information in one message
      if (step === "clone_gathering") {
        addLoadingMessage();
        setIsProcessing(true);
        
        try {
          // Analyser le message de l'utilisateur pour extraire les informations
          const { data, error } = await supabase.functions.invoke("analyze-request", {
            body: { userText: content },
          });
          
          removeLoadingMessage();
          setIsProcessing(false);
          
          let extractedInfo: ExtractedInfo = {};
          
          if (!error && data?.success && data.analysis) {
            extractedInfo = data.analysis.extractedInfo || {};
          } else {
            // Fallback: extraction simple à partir du texte
            extractedInfo = simpleExtractInfo(content);
          }
          
          // ========== VÉRIFICATION DES INCOHÉRENCES CONTEXTUELLES ==========
          // Détecter si des zones du template ne correspondent pas au domaine de l'utilisateur
          const templateAnalysis = conversationStateRef.current.templateAnalysis;
          const templateTextZones = templateAnalysis?.textZones || [];
          const userDomain = conversationStateRef.current.domain;
          
          if (templateTextZones.length > 0 && userDomain) {
            // D'abord vérifier les incohérences contextuelles
            const { mismatchedZones, message: mismatchMessage } = detectContextMismatch(
              templateTextZones as TemplateTextZone[],
              userDomain,
              content
            );
            
            if (mismatchedZones.length > 0) {
              // Stocker les zones incohérentes et demander confirmation
              setConversationState(prev => ({
                ...prev,
                step: "confirm_context_mismatch",
                contextMismatchZones: mismatchedZones,
                extractedInfo: extractedInfo,
                description: content,
              }));
              
              addMessage("assistant", mismatchMessage);
              return;
            }
            
            // Ensuite vérifier les zones manquantes (sans incohérence contextuelle)
            const missingZones = checkMissingTextZones(templateTextZones, extractedInfo, content);
            
            if (missingZones.length > 0) {
              // Stocker les infos déjà collectées et les zones manquantes
              setConversationState(prev => ({
                ...prev,
                step: "confirm_missing_zones",
                extractedInfo: extractedInfo,
                description: content,
                missingTextZones: missingZones,
              }));
              
              // Construire le message listant les zones manquantes
              const missingMessage = buildMissingZonesQuestion(missingZones);
              addMessage("assistant", missingMessage);
              return;
            }
          }
          
          // Pas de zones manquantes ni incohérences, passer directement aux couleurs
          setConversationState(prev => ({
            ...prev,
            step: "colors",
            extractedInfo: extractedInfo,
            description: content,
          }));
          
          addMessage("assistant", "Parfait ! 🎨 Choisissez maintenant une palette de couleurs pour personnaliser votre affiche :");
        } catch (err) {
          console.error("Error analyzing clone content:", err);
          removeLoadingMessage();
          setIsProcessing(false);
          
          // Fallback: utiliser une extraction simple
          const extractedInfo = simpleExtractInfo(content);
          
          setConversationState(prev => ({
            ...prev,
            step: "colors",
            extractedInfo: extractedInfo,
            description: content,
          }));
          
          addMessage("assistant", "Parfait ! 🎨 Choisissez une palette de couleurs pour votre affiche :");
        }
        return;
      }
      
      // Handle confirmation of context mismatch - zones that don't match the user's domain
      if (step === "confirm_context_mismatch") {
        const lowerContent = content.toLowerCase().trim();
        const isDelete = ["supprimer", "supprime", "effacer", "efface", "enlever", "enlève", "retirer", "retire", "oui", "yes", "ok", "d'accord"].some(w => lowerContent.includes(w));
        
        if (isDelete) {
          // L'utilisateur veut supprimer les zones hors contexte
          const contextMismatchZones = conversationStateRef.current.contextMismatchZones || [];
          const existingZonesToDelete = conversationStateRef.current.zonesToDelete || [];
          
          setConversationState(prev => ({
            ...prev,
            step: "colors",
            // Ajouter les zones hors contexte à la liste des zones à effacer
            zonesToDelete: [...existingZonesToDelete, ...contextMismatchZones],
          }));
          addMessage("assistant", "Compris ! Ces zones hors contexte seront supprimées de l'affiche et le layout sera adapté. 🎨 Choisissez maintenant une palette de couleurs :");
        } else {
          // L'utilisateur fournit des remplacements pour les zones hors contexte
          addLoadingMessage();
          setIsProcessing(true);
          
          try {
            const { data } = await supabase.functions.invoke("analyze-request", {
              body: { userText: content },
            });
            
            removeLoadingMessage();
            setIsProcessing(false);
            
            let additionalInfo: ExtractedInfo = {};
            if (data?.success && data.analysis?.extractedInfo) {
              additionalInfo = data.analysis.extractedInfo;
            } else {
              additionalInfo = simpleExtractInfo(content);
            }
            
            // Fusionner avec les infos existantes
            const mergedInfo = {
              ...conversationStateRef.current.extractedInfo,
              ...additionalInfo,
              additionalDetails: [
                conversationStateRef.current.extractedInfo?.additionalDetails,
                content
              ].filter(Boolean).join(". "),
            };
            
            setConversationState(prev => ({
              ...prev,
              step: "colors",
              extractedInfo: mergedInfo,
              description: [prev.description, content].filter(Boolean).join("\n"),
              // Effacer les zones hors contexte car l'utilisateur a fourni des remplacements
              contextMismatchZones: [],
            }));
            
            addMessage("assistant", "Merci pour ces remplacements ! 🎨 Choisissez maintenant une palette de couleurs :");
          } catch (err) {
            removeLoadingMessage();
            setIsProcessing(false);
            
            // Fusionner manuellement
            setConversationState(prev => ({
              ...prev,
              step: "colors",
              extractedInfo: {
                ...prev.extractedInfo,
                additionalDetails: [prev.extractedInfo?.additionalDetails, content].filter(Boolean).join(". "),
              },
              description: [prev.description, content].filter(Boolean).join("\n"),
            }));
            
            addMessage("assistant", "Informations ajoutées ! 🎨 Choisissez une palette de couleurs :");
          }
        }
        return;
      }
      
      // Handle confirmation of missing zones - user provides additional info or confirms deletion
      if (step === "confirm_missing_zones") {
        const lowerContent = content.toLowerCase().trim();
        const isDelete = ["supprimer", "supprime", "effacer", "efface", "enlever", "enlève", "retirer", "retire", "sans", "pas besoin", "non", "continuer sans", "passer"].some(w => lowerContent.includes(w));
        
        if (isDelete) {
          // L'utilisateur veut supprimer les zones manquantes
          setConversationState(prev => ({
            ...prev,
            step: "colors",
            // Marquer que les zones manquantes doivent être effacées
            zonesToDelete: prev.missingTextZones || [],
          }));
          addMessage("assistant", "Compris ! Les zones sans remplacement seront supprimées de l'affiche. 🎨 Choisissez maintenant une palette de couleurs :");
        } else {
          // L'utilisateur fournit des informations supplémentaires
          // Analyser le nouveau contenu et fusionner avec les infos existantes
          addLoadingMessage();
          setIsProcessing(true);
          
          try {
            const { data } = await supabase.functions.invoke("analyze-request", {
              body: { userText: content },
            });
            
            removeLoadingMessage();
            setIsProcessing(false);
            
            let additionalInfo: ExtractedInfo = {};
            if (data?.success && data.analysis?.extractedInfo) {
              additionalInfo = data.analysis.extractedInfo;
            } else {
              additionalInfo = simpleExtractInfo(content);
            }
            
            // Fusionner avec les infos existantes
            const mergedInfo = {
              ...conversationStateRef.current.extractedInfo,
              ...additionalInfo,
              additionalDetails: [
                conversationStateRef.current.extractedInfo?.additionalDetails,
                content
              ].filter(Boolean).join(". "),
            };
            
            setConversationState(prev => ({
              ...prev,
              step: "colors",
              extractedInfo: mergedInfo,
              description: [prev.description, content].filter(Boolean).join("\n"),
            }));
            
            addMessage("assistant", "Merci pour ces informations ! 🎨 Choisissez maintenant une palette de couleurs :");
          } catch (err) {
            removeLoadingMessage();
            setIsProcessing(false);
            
            // Fusionner manuellement
            setConversationState(prev => ({
              ...prev,
              step: "colors",
              extractedInfo: {
                ...prev.extractedInfo,
                additionalDetails: [prev.extractedInfo?.additionalDetails, content].filter(Boolean).join(". "),
              },
              description: [prev.description, content].filter(Boolean).join("\n"),
            }));
            
            addMessage("assistant", "Informations ajoutées ! 🎨 Choisissez une palette de couleurs :");
          }
        }
        return;
      }

      // =========== MODE RAPIDE: Description ===========
      if (step === "quick_description") {
        setConversationState((prev) => ({ ...prev, step: "analyzing", description: content }));
        addLoadingMessage();
        setIsProcessing(true);

        try {
          const { data, error } = await supabase.functions.invoke("analyze-request", {
            body: { userText: content },
          });

          removeLoadingMessage();
          setIsProcessing(false);

          let extractedInfo: ExtractedInfo = {};
          let detectedDomain: Domain | null = null;

          if (!error && data?.success && data.analysis) {
            extractedInfo = data.analysis.extractedInfo || {};
            detectedDomain = data.analysis.suggestedDomain as Domain | null;
            setSuggestedDomain(detectedDomain);
          } else {
            extractedInfo = simpleExtractInfo(content);
          }

          // En mode rapide, demander juste si une référence est disponible
          setConversationState((prev) => ({
            ...prev,
            step: "quick_reference",
            domain: detectedDomain || prev.domain,
            extractedInfo,
            description: content,
            creationMode: "quick",
          }));

          const domainLabel = detectedDomain ? ` (${detectedDomain})` : "";
          addMessage("assistant", `Compris${domainLabel} ! Avez-vous une **image de référence** (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer' pour générer directement.`);
        } catch (err) {
          removeLoadingMessage();
          setIsProcessing(false);
          
          setConversationState((prev) => ({
            ...prev,
            step: "quick_reference",
            extractedInfo: simpleExtractInfo(content),
            description: content,
            creationMode: "quick",
          }));
          addMessage("assistant", "Avez-vous une **image de référence** ? Envoyez-la ou cliquez sur 'Passer' pour générer directement.");
        }
        return;
      }

      // Initial greeting - analyze the request (mode personnalisé)
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
          const validDomains: Domain[] = ["church", "event", "education", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "formation", "youtube", "other"];
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
            // YouTube: même flux simplifié que les autres domaines (référence → photo personnage → génération)
            if (detectedDomain === "youtube") {
              setConversationState((prev) => ({
                ...prev,
                step: "reference",
                domain: detectedDomain,
                extractedInfo: analysis.extractedInfo,
                missingInfo: [],
              }));
              response += "🎬 J'ai compris, vous voulez créer une miniature YouTube ! Avez-vous une **miniature de référence** dont vous aimez le style ? Envoyez-la ou cliquez sur 'Passer'.";
            } else {
              // SIMPLIFICATION: Aller TOUJOURS directement à reference
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
        const lowerContent = content.toLowerCase().trim();
        const isContinue = ["continuer", "continue", "passer", "skip", "non", "no", "rien", "je n'ai pas", "pas d'info", "pas maintenant"].some(w => lowerContent.includes(w));
        
        if (!isContinue) {
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
        }

        // SIMPLIFICATION: Aller directement à l'étape référence
        // On ne pose plus les questions spécifiques au domaine pour réduire les interactions
        setConversationState((prev) => ({ ...prev, step: "reference" }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Avez-vous une image de référence (une affiche dont vous aimez le style) ? Envoyez-la ou cliquez sur 'Passer'."
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
              const isYouTube = domain === "youtube";
              const refMessage = isYouTube
                ? "Parfait ! 🎬 Avez-vous une **miniature de référence** dont vous aimez le style ? Envoyez-la ou cliquez sur 'Passer' pour que je crée un design original."
                : "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.";
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
                addMessage("assistant", refMessage);
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
            const isYouTube = domain === "youtube";
            const refMessage = isYouTube
              ? "Parfait ! 🎬 Avez-vous une **miniature de référence** dont vous aimez le style ? Envoyez-la ou cliquez sur 'Passer' pour que je crée un design original."
              : "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.";
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
              addMessage("assistant", refMessage);
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
        } else if (domain === "youtube") {
          // YouTube: aller directement à reference (flux simplifié)
          setConversationState((prev) => ({ ...prev, step: "reference" }));
          setTimeout(() => {
            addMessage(
              "assistant",
              "🎬 Parfait ! Avez-vous une **miniature de référence** dont vous aimez le style ? Envoyez-la ou cliquez sur 'Passer'."
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

  // =========== DOMAIN QUESTIONS HANDLERS ===========

  // Handler pour les images de questions de domaine (ajout d'une image)
  const handleDomainQuestionImage = useCallback(
    (imageDataUrl: string) => {
      const state = conversationStateRef.current.domainQuestionState;
      const domain = conversationStateRef.current.domain;
      
      if (!state || !domain || !state.pendingImageUpload) return;
      
      const existingImages = state.collectedImages[state.pendingImageUpload.type] || [];
      const newImages = [...existingImages, imageDataUrl];
      
      addMessage("user", "Photo envoyée", imageDataUrl);
      
      setConversationState((prev) => ({
        ...prev,
        domainQuestionState: {
          ...state,
          collectedImages: {
            ...state.collectedImages,
            [state.pendingImageUpload!.type]: newImages,
          },
        },
      }));
      
      setTimeout(() => {
        const label = state.pendingImageUpload!.multiple 
          ? `${newImages.length} photo(s) ajoutée(s) ! Envoyez-en d'autres ou cliquez sur 'Continuer'.`
          : "Photo ajoutée ! Cliquez sur 'Continuer' pour passer à la suite.";
        addMessage("assistant", `📸 ${label}`);
      }, 250);
    },
    [addMessage]
  );

  // Handler pour passer/continuer les images de questions de domaine
  const handleSkipDomainQuestionImages = useCallback(() => {
    const state = conversationStateRef.current.domainQuestionState;
    const domain = conversationStateRef.current.domain;
    
    if (!state || !domain) return;
    
    const imagesCount = state.pendingImageUpload 
      ? (state.collectedImages[state.pendingImageUpload.type]?.length || 0)
      : 0;
    
    addMessage("user", imagesCount > 0 ? "Continuer" : "Passer cette étape");
    
    // Passer à la question suivante
    const nextQuestion = getNextQuestion(domain, state.answeredQuestions);
    
    if (nextQuestion) {
      setConversationState((prev) => ({
        ...prev,
        step: "domain_questions",
        domainQuestionState: {
          ...state,
          currentQuestionId: nextQuestion.id,
          pendingImageUpload: undefined,
        },
      }));
      setTimeout(() => {
        addMessage("assistant", nextQuestion.question);
      }, 250);
    } else {
      // Toutes les questions terminées, aller à l'étape référence
      const isYouTube = domain === "youtube";
      const refMessage = isYouTube
        ? "Parfait ! 🎬 Avez-vous une **miniature de référence** dont vous aimez le style ? Envoyez-la ou cliquez sur 'Passer' pour que je crée un design original."
        : "Parfait ! Avez-vous une image de référence (style à reproduire) ? Envoyez-la ou cliquez sur 'Passer'.";
      setConversationState((prev) => ({
        ...prev,
        step: "reference",
        domainQuestionState: {
          ...state,
          currentQuestionId: null,
          pendingImageUpload: undefined,
        },
      }));
      setTimeout(() => {
        addMessage("assistant", refMessage);
      }, 250);
    }
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
          const currentDomainForErr = conversationStateRef.current.domain;
          if (currentDomainForErr === "youtube") {
            addMessage(
              "assistant",
              "📸 Image reçue ! Avez-vous une **photo de la personne** qui sera sur la miniature ? Envoyez-la ou cliquez sur 'Passer' pour que l'IA génère un personnage expressif."
            );
            setConversationState((prev) => ({
              ...prev,
              step: "content_image",
              referenceImage: imageDataUrl,
            }));
          } else {
            addMessage(
              "assistant",
              "Je n'ai pas pu analyser l'image, mais je l'ai bien reçue. Choisissez maintenant une palette de couleurs :"
            );
            setConversationState((prev) => ({
              ...prev,
              step: "colors",
              referenceImage: imageDataUrl,
            }));
          }
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

        const currentDomainForNext = conversationStateRef.current.domain;
        if (currentDomainForNext === "youtube") {
          // YouTube: skip colors/logo, go directly to content_image
          addMessage(
            "assistant",
            "📸 Image analysée ! Avez-vous une **photo de la personne** qui sera sur la miniature ? Envoyez-la ou cliquez sur 'Passer' pour que l'IA génère un personnage expressif adapté à votre vidéo."
          );
          setConversationState((prev) => ({
            ...prev,
            step: "content_image",
            referenceImage: imageDataUrl,
            referenceDescription: data.description,
          }));
        } else {
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
        }
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
    
    const currentDomain = conversationStateRef.current.domain;
    if (currentDomain === "youtube") {
      // YouTube: skip style/colors/logo, go directly to content_image
      setConversationState((prev) => ({ ...prev, step: "content_image" }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "📸 Avez-vous une **photo de la personne** qui sera sur la miniature ? Envoyez-la ou cliquez sur 'Passer' pour que l'IA génère un personnage expressif adapté à votre vidéo."
        );
      }, 250);
    } else {
      // Demander des instructions de style optionnelles avant de sélectionner un template
      setConversationState((prev) => ({ ...prev, step: "style_preferences" }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "Avez-vous des préférences de style particulières ? (Par exemple : style moderne, coloré, sobre, élégant, festif...) Décrivez brièvement ou cliquez sur 'Continuer' pour que je choisisse automatiquement."
        );
      }, 250);
    }
  }, [addMessage]);

  // Handler pour passer les préférences de style
  const handleSkipStylePreferences = useCallback(() => {
    handleStylePreferencesAndSelectTemplate(undefined);
  }, [handleStylePreferencesAndSelectTemplate]);

  const handleColorsConfirm = useCallback(
    (colors: string[]) => {
      const domain = conversationStateRef.current.domain;
      addMessage("user", `Couleurs : ${colors.join(", ")}`);
      
      if (domain === "youtube") {
        // YouTube: skip logo, go directly to content_image (photo principale)
        setConversationState((prev) => ({ ...prev, step: "content_image", colorPalette: colors }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "📸 **Photo principale de la miniature**\n\nEnvoyez la **photo de la personne** qui sera sur la miniature, ou cliquez sur 'Générer automatiquement' pour que l'IA crée un visage expressif adapté à votre vidéo."
          );
        }, 250);
      } else {
        setConversationState((prev) => ({ ...prev, step: "logo", colorPalette: colors }));
        setTimeout(() => {
          addMessage(
            "assistant",
            "Souhaitez-vous ajouter le logo de votre entreprise sur l'affiche ? Envoyez-le ou cliquez sur 'Passer'."
          );
        }, 250);
      }
    },
    [addMessage]
  );

  // Handler pour passer l'étape des couleurs
  const handleColorsSkip = useCallback(() => {
    const domain = conversationStateRef.current.domain;
    addMessage("user", "Sans palette de couleurs");
    
    if (domain === "youtube") {
      setConversationState((prev) => ({ ...prev, step: "content_image", colorPalette: undefined }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "📸 **Photo principale de la miniature**\n\nEnvoyez la **photo de la personne** qui sera sur la miniature, ou cliquez sur 'Générer automatiquement' pour que l'IA crée un visage expressif adapté à votre vidéo."
        );
      }, 250);
    } else {
      setConversationState((prev) => ({ ...prev, step: "logo", colorPalette: undefined }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "D'accord, je conserverai les couleurs du style original. 🎨\n\nSouhaitez-vous ajouter le logo de votre entreprise sur l'affiche ? Envoyez-le ou cliquez sur 'Passer'."
        );
      }, 250);
    }
  }, [addMessage]);

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
    const domain = conversationStateRef.current.domain;
    const hasSpeakers = !!(conversationStateRef.current.mainSpeaker?.name || (conversationStateRef.current.guests && conversationStateRef.current.guests.length > 0));
    const isSpeakerDomain = domain && SPEAKER_DOMAINS.includes(domain);
    
    addMessage("user", logosCount > 0 ? "Continuer sans autre logo" : "Passer le logo");
    setConversationState((prev) => ({ ...prev, step: "content_image" }));
    setTimeout(() => {
      if (isSpeakerDomain && hasSpeakers) {
        addMessage(
          "assistant",
          "Vous avez déjà fourni les photos des orateurs/intervenants. 📸\n\nSouhaitez-vous ajouter une **image supplémentaire** (produit, lieu, décoration) ? Sinon, cliquez sur 'Générer automatiquement' pour passer."
        );
      } else {
        addMessage(
          "assistant",
          "Avez-vous une image à intégrer dans l'affiche (produit, photo) ? Envoyez-la, ou cliquez sur 'Générer automatiquement'."
        );
      }
    }, 250);
  }, [addMessage]);

  const handleContentImage = useCallback(
    (imageDataUrl: string) => {
      const domain = conversationStateRef.current.domain;
      addMessage("user", domain === "youtube" ? "Photo principale envoyée" : "Image de contenu envoyée", imageDataUrl);

      if (domain === "youtube") {
        // YouTube: go directly to format then generate (skip secondary images)
        setConversationState((prev) => ({
          ...prev,
          step: "format",
          contentImage: imageDataUrl,
          needsContentImage: false,
        }));
        setTimeout(() => {
          addMessage("assistant", "Photo reçue ! ✨ Choisissez le format de sortie pour votre miniature :");
        }, 250);
      } else {
        setConversationState((prev) => ({
          ...prev,
          step: "secondary_images",
          contentImage: imageDataUrl,
          needsContentImage: false,
          secondaryImages: [],
        }));
        setTimeout(() => {
          addMessage("assistant", "Image principale ajoutée ! ✨\n\nSouhaitez-vous ajouter des images secondaires (autres personnes, produits, formateurs, invités...) avec des instructions personnalisées pour chacune ? Vous pouvez en ajouter autant que vous voulez.");
        }, 250);
      }
    },
    [addMessage]
  );

  const handleSkipContentImage = useCallback(() => {
    const domain = conversationStateRef.current.domain;
    addMessage("user", "Générer l'image automatiquement");

    if (domain === "youtube") {
      // YouTube: go directly to format then generate (AI generates character)
      setConversationState((prev) => ({
        ...prev,
        step: "format",
        needsContentImage: true,
      }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "L'IA va générer un personnage expressif adapté à votre vidéo. 🎭 Choisissez le format de sortie :"
        );
      }, 250);
    } else {
      setConversationState((prev) => ({
        ...prev,
        step: "secondary_images",
        needsContentImage: true,
        secondaryImages: [],
      }));
      setTimeout(() => {
        addMessage(
          "assistant",
          "D'accord, l'image principale sera générée automatiquement.\n\nSouhaitez-vous ajouter des images secondaires (autres personnes, produits, formateurs, invités...) avec des instructions personnalisées pour chacune ?"
        );
      }, 250);
    }
  }, [addMessage]);

  // Handlers pour les images secondaires
  const handleAddSecondaryImage = useCallback(
    (image: SecondaryImage) => {
      addMessage("user", `Image secondaire ajoutée${image.instructions ? ` : "${image.instructions}"` : ''}`, image.imageUrl);
      
      setConversationState((prev) => ({
        ...prev,
        secondaryImages: [...(prev.secondaryImages || []), image],
      }));

      setTimeout(() => {
        const count = (conversationStateRef.current.secondaryImages?.length || 0) + 1;
        addMessage(
          "assistant",
          `📸 ${count} image(s) secondaire(s) ajoutée(s) ! Ajoutez-en d'autres ou cliquez sur 'Continuer' pour passer au format.`
        );
      }, 250);
    },
    [addMessage]
  );

  const handleRemoveSecondaryImage = useCallback(
    (id: string) => {
      setConversationState((prev) => ({
        ...prev,
        secondaryImages: (prev.secondaryImages || []).filter((img) => img.id !== id),
      }));
    },
    []
  );

  const handleUpdateSecondaryImageInstructions = useCallback(
    (id: string, instructions: string) => {
      setConversationState((prev) => ({
        ...prev,
        secondaryImages: (prev.secondaryImages || []).map((img) =>
          img.id === id ? { ...img, instructions } : img
        ),
      }));
    },
    []
  );

  const handleConfirmSecondaryImages = useCallback(() => {
    const count = conversationStateRef.current.secondaryImages?.length || 0;
    addMessage("user", count > 0 ? `Continuer avec ${count} image(s) secondaire(s)` : "Continuer sans image secondaire");

    setConversationState((prev) => ({
      ...prev,
      step: "format",
    }));

    setTimeout(() => {
      addMessage("assistant", "Choisissez le format de votre affiche. Sélectionnez un format pour réseaux sociaux (résolution web) ou pour impression (haute résolution).");
    }, 250);
  }, [addMessage]);

  // Handle format selection
  const handleFormatSelect = useCallback(
    (format: FormatPreset) => {
      addMessage("user", `Format : ${format.name} (${format.width}×${format.height})`);
      
      const nextState: ConversationState = {
        ...conversationStateRef.current,
        step: "generating",
        formatPreset: format,
        usageType: format.usage,
      };

      setConversationState(nextState);

      const resolutionLabel = format.usage === "print" ? "haute résolution (4K)" : "résolution web (1K-2K)";
      setTimeout(() => {
        addMessage(
          "assistant",
          `Génération de votre affiche en ${resolutionLabel}...`
        );
        generatePoster(nextState);
      }, 250);
    },
    [addMessage, generatePoster]
  );

  const handleSkipFormat = useCallback(() => {
    addMessage("user", "Utiliser le format par défaut");
    
    // Default to social format (3:4 aspect ratio, 2K)
    const defaultFormat: FormatPreset = {
      id: "default",
      name: "Format par défaut",
      aspectRatio: "3:4",
      width: 1080,
      height: 1440,
      platform: "Standard",
      icon: "image",
      usage: "social",
    };

    const nextState: ConversationState = {
      ...conversationStateRef.current,
      step: "generating",
      formatPreset: defaultFormat,
      usageType: "social",
    };

    setConversationState(nextState);

    setTimeout(() => {
      addMessage(
        "assistant",
        "Génération de votre affiche en format standard (3:4)..."
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

  const clearCreditError = useCallback(() => {
    setCreditError(null);
  }, []);

  return {
    messages,
    conversationState,
    isProcessing,
    generatedImage,
    suggestedDomain,
    visitedSteps,
    creditError,
    clearCreditError,
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
    // Domain questions handlers
    handleDomainQuestionImage,
    handleSkipDomainQuestionImages,
    // Other handlers
    handleReferenceImage,
    handleSkipReference,
    handleStylePreferencesAndSelectTemplate,
    handleSkipStylePreferences,
    handleColorsConfirm,
    handleColorsSkip,
    handleLogoImage,
    handleLogoPosition,
    handleSkipLogo,
    handleContentImage,
    handleSkipContentImage,
    // Secondary images handlers
    handleAddSecondaryImage,
    handleRemoveSecondaryImage,
    handleUpdateSecondaryImageInstructions,
    handleConfirmSecondaryImages,
    // Format handlers
    handleFormatSelect,
    handleSkipFormat,
    resetConversation,
    goBackToStep,
    goForwardToStep,
    isCloneMode: !!cloneTemplate,
  };
}
