// Configuration des questions intelligentes par domaine
// SIMPLIFIÉ: On ne pose que les questions sur les IMAGES si l'utilisateur veut en inclure
// Toutes les autres infos sont déduites automatiquement par l'IA

export interface DomainQuestion {
  id: string;
  question: string;
  type: "boolean" | "text" | "images" | "choice";
  choices?: string[];
  followUp?: {
    condition: "yes" | "no" | string;
    nextStep: string;
    imageUpload?: {
      multiple: boolean;
      label: string;
      hint: string;
    };
    textInput?: {
      label: string;
      placeholder: string;
      multiline?: boolean;
    };
  };
  required: boolean;
  priority: number;
}

export interface DomainConfig {
  domain: string;
  label: string;
  questions: DomainQuestion[];
  templateRequirements: string[];
}

// Configuration SIMPLIFIÉE des questions par domaine
// On ne pose qu'UNE SEULE question sur les images personnalisées si pertinent
export const DOMAIN_QUESTIONS: Record<string, DomainConfig> = {
  // Immobilier - on demande juste si l'utilisateur a des photos du bien
  realestate: {
    domain: "realestate",
    label: "Immobilier",
    templateRequirements: ["property_images"],
    questions: [
      {
        id: "has_property_images",
        question: "Avez-vous des photos du bien immobilier à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "property_images",
          imageUpload: {
            multiple: true,
            label: "Photos du bien",
            hint: "Envoyez les photos (intérieur, extérieur...)"
          }
        }
      }
    ]
  },

  // Restaurant - pas de questions, l'IA déduit du contexte
  restaurant: {
    domain: "restaurant",
    label: "Restaurant",
    templateRequirements: [],
    questions: []
  },

  // Événement - pas de questions obligatoires
  event: {
    domain: "event",
    label: "Événement",
    templateRequirements: [],
    questions: []
  },

  // Église - une seule question sur la photo du pasteur
  church: {
    domain: "church",
    label: "Église",
    templateRequirements: [],
    questions: []
  },

  // Formation - pas de questions
  formation: {
    domain: "formation",
    label: "Formation",
    templateRequirements: [],
    questions: []
  },

  // Fashion - une seule question sur les produits
  fashion: {
    domain: "fashion",
    label: "Mode",
    templateRequirements: ["product_images"],
    questions: [
      {
        id: "has_product_images",
        question: "Avez-vous des photos de vos produits/vêtements à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "product_images",
          imageUpload: {
            multiple: true,
            label: "Photos des produits",
            hint: "Envoyez les photos de vos produits"
          }
        }
      }
    ]
  },

  // Technologie - pas de questions
  technology: {
    domain: "technology",
    label: "Technologie",
    templateRequirements: [],
    questions: []
  },

  // Santé - pas de questions
  health: {
    domain: "health",
    label: "Santé",
    templateRequirements: [],
    questions: []
  },

  // Musique - pas de questions
  music: {
    domain: "music",
    label: "Musique",
    templateRequirements: [],
    questions: []
  },

  // Sport - pas de questions
  sport: {
    domain: "sport",
    label: "Sport",
    templateRequirements: [],
    questions: []
  },

  // Education - pas de questions
  education: {
    domain: "education",
    label: "Éducation",
    templateRequirements: [],
    questions: []
  },

  // Service - pas de questions
  service: {
    domain: "service",
    label: "Service",
    templateRequirements: [],
    questions: []
  },

  // Services entreprises - nouveau domaine
  business_services: {
    domain: "business_services",
    label: "Services Entreprises",
    templateRequirements: [],
    questions: []
  },

  // Ecommerce - une seule question sur les produits
  ecommerce: {
    domain: "ecommerce",
    label: "E-commerce",
    templateRequirements: ["product_images"],
    questions: [
      {
        id: "has_product_images",
        question: "Avez-vous des photos de vos produits à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "product_images",
          imageUpload: {
            multiple: true,
            label: "Photos des produits",
            hint: "Envoyez les photos de vos produits"
          }
        }
      }
    ]
  },

  // YouTube - flux simplifié pour miniatures virales
  youtube: {
    domain: "youtube",
    label: "Miniature YouTube",
    templateRequirements: ["face_image", "video_title"],
    questions: [
      // Q1: Titre de la vidéo (OBLIGATOIRE)
      {
        id: "video_title",
        question: "🎬 **Quel est le titre de votre vidéo YouTube ?**\n\nCela m'aidera à créer une miniature qui correspond parfaitement à votre contenu.",
        type: "text",
        required: true,
        priority: 1,
        followUp: {
          condition: "any",
          nextStep: "title_collected",
          textInput: {
            label: "Titre de la vidéo",
            placeholder: "Ex: Comment j'ai gagné 10 000€ en 30 jours",
            multiline: false
          }
        }
      },
      // Q2: Photo propre ou générée par IA ?
      {
        id: "has_own_image",
        question: "📸 **Voulez-vous utiliser votre propre photo pour la miniature ?**\n\nLe visage est l'élément CLÉ d'une miniature virale.\n\n• **Oui** : Envoyez votre photo (gros plan avec expression marquée)\n• **Non** : L'IA générera automatiquement un visage expressif adapté au thème de votre vidéo",
        type: "boolean",
        required: true,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "own_image",
          imageUpload: {
            multiple: false,
            label: "Votre photo",
            hint: "Envoyez une photo de vous (idéalement en gros plan avec une expression marquée)"
          }
        }
      },
      // Q3: Éléments spécifiques à ajouter (optionnel)
      {
        id: "specific_elements",
        question: "🎨 **Voulez-vous ajouter des éléments spécifiques sur la miniature ?** (optionnel)\n\nExemples :\n• \"Des billets d'argent qui volent\"\n• \"Mon logo à côté de ma tête\"\n• \"Un téléphone avec l'écran visible\"\n• \"Des flammes en arrière-plan\"\n\n💡 Tapez \"passer\" si vous n'avez pas de préférence.",
        type: "text",
        required: false,
        priority: 3,
        followUp: {
          condition: "any",
          nextStep: "elements_collected",
          textInput: {
            label: "Éléments spécifiques",
            placeholder: "Ex: Des billets d'argent, mon logo flottant, des emojis de feu",
            multiline: true
          }
        }
      },
      // Q4: Texte sur la miniature ?
      {
        id: "wants_text",
        question: "✍️ **Voulez-vous du texte sur la miniature ?**\n\n💡 **Conseil pro** : Les meilleures miniatures YouTube ont **très peu ou pas de texte**. Le visage et les éléments visuels suffisent souvent.\n\n• **Oui** : Indiquez le texte souhaité (3-5 mots max recommandé)\n• **Non** : Pas de texte, miniature 100% visuelle (recommandé)",
        type: "boolean",
        required: false,
        priority: 4,
        followUp: {
          condition: "yes",
          nextStep: "text_collected",
          textInput: {
            label: "Texte de la miniature",
            placeholder: "Ex: INCROYABLE ! ou 10 000€ (3-5 mots max)",
            multiline: false
          }
        }
      },
    ]
  },
};

// Fonction pour obtenir les questions d'un domaine (triées par priorité)
export function getDomainQuestions(domain: string): DomainQuestion[] {
  const config = DOMAIN_QUESTIONS[domain];
  if (!config) return [];
  return [...config.questions].sort((a, b) => a.priority - b.priority);
}

// Fonction pour obtenir la config complète d'un domaine
export function getDomainConfig(domain: string): DomainConfig | null {
  return DOMAIN_QUESTIONS[domain] || null;
}

// Vérifie si un domaine a des questions à poser
export function domainHasQuestions(domain: string): boolean {
  const questions = getDomainQuestions(domain);
  return questions.length > 0;
}

// Obtient la prochaine question non répondue
export function getNextQuestion(
  domain: string,
  answeredQuestions: Record<string, boolean | string>
): DomainQuestion | null {
  const questions = getDomainQuestions(domain);
  for (const q of questions) {
    if (!(q.id in answeredQuestions)) {
      return q;
    }
  }
  return null;
}

// Domaines qui peuvent avoir des produits
export const PRODUCT_DOMAINS = ["fashion", "ecommerce", "technology"];

// Domaines qui peuvent avoir des orateurs/artistes
export const SPEAKER_DOMAINS = ["church", "event", "music", "formation"];
