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

  // YouTube - flux complet pour miniatures virales
  youtube: {
    domain: "youtube",
    label: "Miniature YouTube",
    templateRequirements: ["face_image", "video_title"],
    questions: [
      // Q1: Titre de la vidéo (OBLIGATOIRE)
      {
        id: "video_title",
        question: "🎬 **Quel est le titre de votre vidéo YouTube ?**\n\nCela m'aidera à choisir les meilleurs éléments visuels et le texte percutant.",
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
      // Q2: Photo propre ou générée ?
      {
        id: "has_own_image",
        question: "📸 **Voulez-vous utiliser votre propre photo pour la miniature ?**\n\nLe visage est l'élément CLÉ d'une miniature virale.\n\n• **Oui** : Envoyez une photo de vous (idéalement gros plan avec expression marquée)\n• **Non** : L'IA générera un visage adapté à votre contenu",
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
      // Q3: Préférences de mise en scène (NOUVEAU)
      {
        id: "scene_preference",
        question: "🎭 **Comment souhaitez-vous la mise en scène ?** (optionnel)\n\nExemples de ce que vous pouvez demander :\n• \"Je tiens un billet de 100€ dans la main\"\n• \"Mon logo flotte à côté de ma tête\"\n• \"Des pièces d'or tombent autour de moi\"\n• \"Je pointe vers le texte\"\n• \"Je montre mon téléphone avec l'écran visible\"\n\n💡 Tapez \"passer\" si vous n'avez pas de préférence.",
        type: "text",
        required: false,
        priority: 3,
        followUp: {
          condition: "any",
          nextStep: "scene_collected",
          textInput: {
            label: "Mise en scène souhaitée",
            placeholder: "Ex: Je tiens une liasse de billets, des symboles d'argent flottent autour de moi",
            multiline: true
          }
        }
      },
      // Q4: Origine (si génération IA)
      {
        id: "subject_ethnicity",
        question: "🌍 **Quelle origine pour la personne à générer ?**\n\n• Africain(e)\n• Caucasien(ne)\n• Asiatique\n• Autre",
        type: "choice",
        choices: ["Africain(e)", "Caucasien(ne)", "Asiatique", "Autre"],
        required: false,
        priority: 4
      },
      // Q5: Âge (si génération IA)
      {
        id: "subject_age",
        question: "👤 **Quel âge approximatif pour la personne ?**\n\n• Jeune (18-30 ans)\n• Adulte (30-50 ans)\n• Senior (50+ ans)",
        type: "choice",
        choices: ["Jeune (18-30 ans)", "Adulte (30-50 ans)", "Senior (50+ ans)"],
        required: false,
        priority: 5
      },
      // Q6: Expression faciale
      {
        id: "desired_expression",
        question: "😮 **Quelle expression faciale souhaitez-vous ?**\n\n• 😮 Surprise / Choc (le plus viral)\n• 🤔 Concentration\n• 😊 Joie / Excitation\n• 😎 Confiance",
        type: "choice",
        choices: ["Surprise / Choc", "Concentration", "Joie / Excitation", "Confiance"],
        required: false,
        priority: 6
      },
      // Q7: Logo
      {
        id: "has_logo",
        question: "🏷️ **Voulez-vous ajouter votre logo sur la miniature ?**\n\nBeaucoup de créateurs ajoutent leur logo pour renforcer leur marque personnelle.",
        type: "boolean",
        required: false,
        priority: 7,
        followUp: {
          condition: "yes",
          nextStep: "youtube_logo",
          imageUpload: {
            multiple: true,
            label: "Vos logos",
            hint: "Vous pouvez ajouter plusieurs logos"
          }
        }
      },
      // Q8: Position du logo
      {
        id: "logo_position",
        question: "📍 **Où souhaitez-vous placer le logo ?**\n\n↖ Haut gauche | ↗ Haut droite\n◉ Centre (dans les mains/flottant)\n↙ Bas gauche | ↘ Bas droite\n\n💡 Conseil : Le coin inférieur droit est le plus populaire car il n'interfère pas avec le visage.",
        type: "choice",
        choices: ["Haut gauche", "Haut droite", "Centre (dans les mains)", "Bas gauche", "Bas droite"],
        required: false,
        priority: 8
      }
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
