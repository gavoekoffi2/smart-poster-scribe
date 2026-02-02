import { Domain } from "@/types/generation";

// Interface pour les zones de texte du template
export interface TemplateTextZone {
  type: string;
  content: string;
  position?: string;
}

// Interface pour les éléments décoratifs du template
export interface TemplateDecorativeElement {
  type: "icon" | "symbol" | "object";
  name: string;
  position?: string;
}

// Types de zones et leurs domaines pertinents
// Note: "service" n'existe pas comme Domain, on utilise "other" pour les services généraux
const ZONE_DOMAIN_RELEVANCE: Record<string, Domain[]> = {
  // Zones universelles (pertinentes pour tous)
  "title": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "subtitle": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "contact": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "education", "other"],
  "social": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  
  // Zones liées aux événements temporels
  "date": ["church", "event", "formation", "restaurant", "music", "sport", "education", "other"],
  "time": ["church", "event", "formation", "restaurant", "music", "sport", "education", "other"],
  "location": ["church", "event", "formation", "restaurant", "music", "sport", "realestate", "education", "other"],
  
  // Zones spécifiques à certains domaines
  "registration_fee": ["formation", "education"],
  "program_outline": ["formation", "education", "event", "church"],
  "certification": ["formation", "education"],
  "duration": ["formation", "education", "event"],
  "capacity": ["formation", "event", "education"],
  "training_details": ["formation", "education"],
  "course_content": ["formation", "education"],
  "prerequisites": ["formation", "education"],
  "instructor": ["formation", "education"],
  
  // Zones restaurant
  "menu": ["restaurant"],
  "dishes": ["restaurant"],
  "food_price": ["restaurant"],
  "beverage": ["restaurant"],
  
  // Zones église/spirituel
  "bible_verse": ["church"],
  "pastor": ["church"],
  "ministry": ["church"],
  "worship": ["church"],
  
  // Zones événement/concert
  "speaker": ["church", "event", "formation", "education"],
  "artist": ["music", "event"],
  "performer": ["music", "event"],
  "ticket_price": ["music", "event", "sport"],
  "dress_code": ["event", "fashion"],
  
  // Zones commerciales
  "price": ["fashion", "technology", "restaurant", "formation", "realestate", "other"],
  "price_promo": ["fashion", "technology", "restaurant", "other"],
  "discount": ["fashion", "technology", "restaurant", "other"],
  "promo_code": ["fashion", "technology", "other"],
  "offer": ["fashion", "technology", "restaurant", "other"],
  
  // Zones service général (utilise "other" car pas de Domain "service")
  "service": ["technology", "health", "other"],
  "service_list": ["health", "other"],
  
  // Zones immobilier
  "property": ["realestate"],
  "surface": ["realestate"],
  "rooms": ["realestate"],
  "agent": ["realestate"],
  
  // Zones santé
  "doctor": ["health"],
  "treatment": ["health"],
  "consultation": ["health"],
  
  // Zones sport
  "team": ["sport"],
  "match": ["sport"],
  "score": ["sport"],
  "venue": ["sport", "event"],
};

// Mots-clés pour détecter le type de zone à partir du contenu
const ZONE_CONTENT_PATTERNS: Record<string, RegExp[]> = {
  "registration_fee": [
    /frais\s*(d[''])?inscription/i,
    /inscription\s*[:=\-]?\s*\d+/i,
    /tarif\s*(de\s*)?formation/i,
    /participation\s*[:=]?\s*\d+/i,
    /coût\s*(de\s*)?formation/i,
    /droits?\s*(d[''])inscription/i,
    /prix\s*formation/i,
  ],
  "program_outline": [
    /programme/i,
    /module\s*\d/i,
    /cursus/i,
    /objectif.*pédagogique/i,
    /contenu\s*(de\s*la\s*)?formation/i,
    /au\s*programme/i,
    /thème\s*abordé/i,
  ],
  "certification": [
    /certificat/i,
    /diplôme/i,
    /attestation/i,
    /accréditation/i,
    /certifié/i,
    /délivré\s*à\s*la\s*fin/i,
  ],
  "duration": [
    /durée\s*[:=]?\s*\d+/i,
    /\d+\s*(jours?|heures?|semaines?|mois)/i,
    /formation\s*(de\s*)?\d+\s*(jours?|heures?)/i,
  ],
  "capacity": [
    /places?\s*limité/i,
    /capacité/i,
    /\d+\s*places?/i,
    /nombre\s*de\s*places/i,
    /effectif\s*limité/i,
  ],
  "menu": [
    /menu/i,
    /carte\s*du\s*jour/i,
    /nos\s*plats/i,
    /nos\s*spécialités/i,
  ],
  "dishes": [
    /plat\s*(du\s*jour)?/i,
    /entrée/i,
    /dessert/i,
    /poulet|poisson|riz|viande/i,
  ],
  "bible_verse": [
    /verset/i,
    /psaume\s*\d/i,
    /matthieu|jean|luc|marc/i,
    /genèse|exode|lévitique/i,
    /proverbes?\s*\d/i,
    /esaïe|jérémie/i,
    /romains?\s*\d/i,
    /corinthiens?\s*\d/i,
  ],
  "instructor": [
    /formateur/i,
    /animé\s*par/i,
    /intervenant/i,
    /enseignant/i,
    /coach/i,
  ],
  "speaker": [
    /orateur/i,
    /prédicateur/i,
    /serviteur/i,
    /évêque|bishop/i,
    /pasteur|pastor/i,
    /apôtre/i,
    /prophète/i,
  ],
  "promo_code": [
    /code\s*promo/i,
    /réduction/i,
    /remise/i,
    /-\s*\d+\s*%/i,
    /solde/i,
  ],
};

// ============= MATRICE DE PERTINENCE OBJET/ICÔNE ↔ DOMAINE =============
const OBJECT_DOMAIN_RELEVANCE: Record<string, Domain[]> = {
  // Objets universels (peuvent apparaître partout)
  "étoile": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "star": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "flèche": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  "arrow": ["church", "event", "formation", "restaurant", "fashion", "music", "sport", "technology", "health", "realestate", "youtube", "education", "other"],
  
  // Objets église/spirituel
  "croix": ["church"],
  "cross": ["church"],
  "bible": ["church"],
  "colombe": ["church"],
  "dove": ["church"],
  "bougie": ["church", "event"],
  "candle": ["church", "event"],
  "prière": ["church"],
  "prayer": ["church"],
  "autel": ["church"],
  "altar": ["church"],
  "chaire": ["church"],
  "ange": ["church"],
  "angel": ["church"],
  "chapelet": ["church"],
  "rosary": ["church"],
  "calice": ["church"],
  "chalice": ["church"],
  
  // Objets formation/éducation
  "diplôme": ["formation", "education"],
  "diploma": ["formation", "education"],
  "livre": ["formation", "education", "church"],
  "book": ["formation", "education", "church"],
  "tableau": ["formation", "education"],
  "blackboard": ["formation", "education"],
  "crayon": ["formation", "education"],
  "pencil": ["formation", "education"],
  "stylo": ["formation", "education"],
  "pen": ["formation", "education"],
  "chapeau universitaire": ["formation", "education"],
  "graduation cap": ["formation", "education"],
  "mortarboard": ["formation", "education"],
  "certificat": ["formation", "education"],
  "certificate": ["formation", "education"],
  "calculatrice": ["formation", "education"],
  "calculator": ["formation", "education"],
  "règle": ["formation", "education"],
  "ruler": ["formation", "education"],
  "cahier": ["formation", "education"],
  "notebook": ["formation", "education"],
  
  // Objets restaurant
  "fourchette": ["restaurant"],
  "fork": ["restaurant"],
  "couteau": ["restaurant"],
  "knife": ["restaurant"],
  "cuillère": ["restaurant"],
  "spoon": ["restaurant"],
  "assiette": ["restaurant"],
  "plate": ["restaurant"],
  "verre": ["restaurant", "event"],
  "glass": ["restaurant", "event"],
  "chef": ["restaurant"],
  "toque": ["restaurant"],
  "chef hat": ["restaurant"],
  "casserole": ["restaurant"],
  "pot": ["restaurant"],
  "poêle": ["restaurant"],
  "pan": ["restaurant"],
  "tablier": ["restaurant"],
  "apron": ["restaurant"],
  
  // Objets musique/événement
  "micro": ["music", "event", "church"],
  "microphone": ["music", "event", "church"],
  "note de musique": ["music"],
  "musical note": ["music"],
  "guitare": ["music"],
  "guitar": ["music"],
  "platine": ["music"],
  "turntable": ["music"],
  "dj": ["music"],
  "casque": ["music", "technology"],
  "headphones": ["music", "technology"],
  "piano": ["music"],
  "batterie": ["music"],
  "drums": ["music"],
  "saxophone": ["music"],
  "trompette": ["music"],
  "trumpet": ["music"],
  "enceinte": ["music", "event"],
  "speaker": ["music", "event"],
  
  // Objets YouTube/Tech
  "play button": ["youtube"],
  "bouton play": ["youtube"],
  "subscribe": ["youtube"],
  "abonner": ["youtube"],
  "youtube": ["youtube"],
  "téléphone": ["youtube", "technology", "other"],
  "phone": ["youtube", "technology", "other"],
  "smartphone": ["youtube", "technology", "other"],
  "billets": ["youtube", "fashion", "other"],
  "money": ["youtube", "fashion", "realestate", "other"],
  "argent": ["youtube", "fashion", "realestate", "other"],
  "dollar": ["youtube", "fashion", "realestate", "other"],
  "euro": ["youtube", "fashion", "realestate", "other"],
  "ordinateur": ["youtube", "technology", "formation", "education"],
  "computer": ["youtube", "technology", "formation", "education"],
  "laptop": ["youtube", "technology", "formation", "education"],
  "écran": ["youtube", "technology"],
  "screen": ["youtube", "technology"],
  "clavier": ["technology"],
  "keyboard": ["technology"],
  "souris": ["technology"],
  "mouse": ["technology"],
  
  // Objets mode/commerce
  "vêtement": ["fashion"],
  "clothing": ["fashion"],
  "sac": ["fashion"],
  "bag": ["fashion"],
  "chaussure": ["fashion"],
  "shoe": ["fashion"],
  "étiquette prix": ["fashion", "restaurant", "other"],
  "price tag": ["fashion", "restaurant", "other"],
  "cintre": ["fashion"],
  "hanger": ["fashion"],
  "mannequin": ["fashion"],
  "robe": ["fashion"],
  "dress": ["fashion"],
  "costume": ["fashion"],
  "suit": ["fashion"],
  "lunettes": ["fashion", "other"],
  "glasses": ["fashion", "other"],
  "montre": ["fashion", "other"],
  "watch": ["fashion", "other"],
  "bijou": ["fashion"],
  "jewelry": ["fashion"],
  "collier": ["fashion"],
  "necklace": ["fashion"],
  "bracelet": ["fashion"],
  
  // Objets santé
  "stéthoscope": ["health"],
  "stethoscope": ["health"],
  "coeur": ["health", "church", "event"],
  "heart": ["health", "church", "event"],
  "médicament": ["health"],
  "medicine": ["health"],
  "pilule": ["health"],
  "pill": ["health"],
  "croix médicale": ["health"],
  "medical cross": ["health"],
  "seringue": ["health"],
  "syringe": ["health"],
  "thermomètre": ["health"],
  "thermometer": ["health"],
  "blouse": ["health"],
  "hôpital": ["health"],
  "hospital": ["health"],
  
  // Objets immobilier
  "maison": ["realestate"],
  "house": ["realestate"],
  "clé": ["realestate"],
  "key": ["realestate"],
  "plan": ["realestate"],
  "blueprint": ["realestate"],
  "immeuble": ["realestate"],
  "building": ["realestate"],
  "appartement": ["realestate"],
  "apartment": ["realestate"],
  "villa": ["realestate"],
  "terrain": ["realestate"],
  "land": ["realestate"],
  
  // Objets sport
  "ballon": ["sport"],
  "ball": ["sport"],
  "trophée": ["sport", "event"],
  "trophy": ["sport", "event"],
  "médaille": ["sport", "formation"],
  "medal": ["sport", "formation"],
  "stade": ["sport"],
  "stadium": ["sport"],
  "maillot": ["sport"],
  "jersey": ["sport"],
  "raquette": ["sport"],
  "racket": ["sport"],
  "haltère": ["sport", "health"],
  "dumbbell": ["sport", "health"],
  "vélo": ["sport"],
  "bicycle": ["sport"],
  "chaussure de sport": ["sport"],
  "sneaker": ["sport"],
};

/**
 * Détecte les incohérences contextuelles entre le template et le domaine utilisateur
 * Par exemple: zones de "frais d'inscription" sur une affiche de service
 */
export function detectContextMismatch(
  templateZones: TemplateTextZone[],
  userDomain: Domain | undefined,
  userContent: string
): { mismatchedZones: TemplateTextZone[]; message: string } {
  if (!userDomain) return { mismatchedZones: [], message: "" };
  
  const mismatchedZones: TemplateTextZone[] = [];
  
  for (const zone of templateZones) {
    // Ignorer les zones vides ou illisibles
    if (!zone.content || zone.content === "[illisible]" || zone.content.trim() === "") {
      continue;
    }
    
    // D'abord, détecter le vrai type de la zone à partir de son contenu
    let detectedType = zone.type;
    
    for (const [type, patterns] of Object.entries(ZONE_CONTENT_PATTERNS)) {
      if (patterns.some(p => p.test(zone.content))) {
        detectedType = type;
        break;
      }
    }
    
    // Vérifier si ce type de zone est pertinent pour le domaine de l'utilisateur
    const relevantDomains = ZONE_DOMAIN_RELEVANCE[detectedType] || 
                            ZONE_DOMAIN_RELEVANCE[zone.type] || 
                            [];
    
    // Si le domaine utilisateur n'est pas dans la liste des domaines pertinents
    // ET que c'est une zone spécifique (pas universelle)
    if (relevantDomains.length > 0 && !relevantDomains.includes(userDomain)) {
      mismatchedZones.push({
        ...zone,
        type: detectedType, // Utiliser le type détecté
      });
    }
  }
  
  if (mismatchedZones.length === 0) {
    return { mismatchedZones: [], message: "" };
  }
  
  // Construire le message d'alerte
  let message = `⚠️ **Attention : Éléments hors contexte détectés !**\n\n`;
  message += `L'affiche de référence semble être pour un autre domaine et contient des éléments qui ne correspondent pas à votre ${getDomainLabel(userDomain)} :\n\n`;
  
  for (const zone of mismatchedZones) {
    const content = zone.content.length > 50 ? zone.content.slice(0, 50) + "..." : zone.content;
    message += `• "${content}"\n`;
  }
  
  message += `\n📌 **Que souhaitez-vous faire ?**\n`;
  message += `- **Supprimer** ces zones (tapez "supprimer" ou "oui")\n`;
  message += `- **Fournir un remplacement** (écrivez le texte à mettre à la place de chaque zone)\n`;
  
  return { mismatchedZones, message };
}

/**
 * Détecte les objets/icônes hors contexte dans un template
 */
export function detectObjectMismatch(
  decorativeElements: TemplateDecorativeElement[] | undefined,
  userDomain: Domain | undefined
): { mismatchedObjects: TemplateDecorativeElement[]; message: string } {
  if (!userDomain || !decorativeElements?.length) {
    return { mismatchedObjects: [], message: "" };
  }
  
  const mismatchedObjects: TemplateDecorativeElement[] = [];
  
  for (const element of decorativeElements) {
    const elementName = element.name.toLowerCase().trim();
    const relevantDomains = OBJECT_DOMAIN_RELEVANCE[elementName] || [];
    
    // Si l'objet a des domaines spécifiques ET que le domaine utilisateur n'en fait pas partie
    if (relevantDomains.length > 0 && !relevantDomains.includes(userDomain)) {
      mismatchedObjects.push(element);
    }
  }
  
  if (mismatchedObjects.length === 0) {
    return { mismatchedObjects: [], message: "" };
  }
  
  let message = `⚠️ **Objets/Icônes hors contexte détectés !**\n\n`;
  message += `Ces éléments visuels ne correspondent pas à votre ${getDomainLabel(userDomain)} :\n\n`;
  
  for (const obj of mismatchedObjects) {
    const typeLabel = obj.type === "icon" ? "Icône" : obj.type === "symbol" ? "Symbole" : "Objet";
    message += `• ${typeLabel}: "${obj.name}"\n`;
  }
  
  message += `\n📌 **Ces éléments seront automatiquement supprimés** et remplacés par des éléments appropriés ou l'espace sera adapté.\n`;
  message += `Tapez "ok" pour continuer ou fournissez des précisions si besoin.`;
  
  return { mismatchedObjects, message };
}

/**
 * Convertit les éléments décoratifs de l'analyse en format standardisé
 */
export function parseDecorativeElements(
  analysisDecorativeElements?: {
    icons?: string[];
    symbols?: string[];
    domainSpecificItems?: string[];
  }
): TemplateDecorativeElement[] {
  if (!analysisDecorativeElements) return [];
  
  const elements: TemplateDecorativeElement[] = [];
  
  if (analysisDecorativeElements.icons) {
    for (const icon of analysisDecorativeElements.icons) {
      elements.push({ type: "icon", name: icon });
    }
  }
  
  if (analysisDecorativeElements.symbols) {
    for (const symbol of analysisDecorativeElements.symbols) {
      elements.push({ type: "symbol", name: symbol });
    }
  }
  
  if (analysisDecorativeElements.domainSpecificItems) {
    for (const item of analysisDecorativeElements.domainSpecificItems) {
      elements.push({ type: "object", name: item });
    }
  }
  
  return elements;
}

/**
 * Retourne le label français pour un domaine donné
 */
export function getDomainLabel(domain: Domain): string {
  const labels: Record<Domain, string> = {
    church: "affiche d'église/spirituelle",
    event: "affiche d'événement",
    formation: "affiche de formation",
    education: "affiche d'éducation",
    restaurant: "affiche de restaurant",
    fashion: "affiche mode/vêtements",
    music: "affiche musicale/concert",
    sport: "affiche sportive",
    technology: "affiche technologie",
    health: "affiche santé",
    realestate: "affiche immobilière",
    youtube: "miniature YouTube",
    other: "affiche",
  };
  return labels[domain] || "affiche";
}

/**
 * Détecte le domaine probable d'un template à partir de ses zones de texte
 */
export function detectTemplateDomain(templateZones: TemplateTextZone[]): Domain | null {
  const domainScores: Record<Domain, number> = {
    church: 0,
    event: 0,
    formation: 0,
    education: 0,
    restaurant: 0,
    fashion: 0,
    music: 0,
    sport: 0,
    technology: 0,
    health: 0,
    realestate: 0,
    youtube: 0,
    other: 0,
  };
  
  for (const zone of templateZones) {
    const content = zone.content.toLowerCase();
    
    // Patterns de détection par domaine
    if (/formation|inscription|module|certificat|formateur|cursus/i.test(content)) {
      domainScores.formation += 2;
    }
    if (/église|prière|louange|verset|psaume|pasteur|évêque|apôtre/i.test(content)) {
      domainScores.church += 2;
    }
    if (/restaurant|menu|plat|cuisine|chef|réservation/i.test(content)) {
      domainScores.restaurant += 2;
    }
    if (/concert|artiste|musique|album|dj/i.test(content)) {
      domainScores.music += 2;
    }
    if (/salon|coiffure|beauté|esthétique|manucure|massage|spa/i.test(content)) {
      domainScores.other += 2; // Services généraux = "other"
    }
    if (/vente|promo|réduction|solde|boutique|collection/i.test(content)) {
      domainScores.fashion += 2;
    }
    if (/match|équipe|sport|football|basket|athlète/i.test(content)) {
      domainScores.sport += 2;
    }
    if (/appartement|maison|villa|immobilier|vendre|louer|surface/i.test(content)) {
      domainScores.realestate += 2;
    }
    if (/docteur|médecin|clinique|hôpital|santé|consultation/i.test(content)) {
      domainScores.health += 2;
    }
    if (/abonne|like|vidéo|chaîne|youtube|subscribe/i.test(content)) {
      domainScores.youtube += 2;
    }
  }
  
  // Trouver le domaine avec le score le plus élevé
  let maxScore = 0;
  let detectedDomain: Domain | null = null;
  
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedDomain = domain as Domain;
    }
  }
  
  // Retourner null si aucun domaine n'a de score significatif
  return maxScore >= 2 ? detectedDomain : null;
}
