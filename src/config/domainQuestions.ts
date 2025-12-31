// Configuration des questions intelligentes par domaine
// Ce système permet de poser les bonnes questions en fonction du domaine détecté

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
  priority: number; // Plus le nombre est bas, plus la question est prioritaire
}

export interface DomainConfig {
  domain: string;
  label: string;
  questions: DomainQuestion[];
  templateRequirements: string[]; // Ce que les templates de ce domaine peuvent nécessiter
}

// Configuration des questions par domaine
export const DOMAIN_QUESTIONS: Record<string, DomainConfig> = {
  // Immobilier
  realestate: {
    domain: "realestate",
    label: "Immobilier",
    templateRequirements: ["multiple_property_images", "property_details", "agent_photo"],
    questions: [
      {
        id: "multiple_properties",
        question: "Avez-vous plusieurs images du bien immobilier à inclure sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "property_images",
          imageUpload: {
            multiple: true,
            label: "Images du bien",
            hint: "Vous pouvez envoyer jusqu'à 6 images (intérieur, extérieur, chambres, etc.)"
          }
        }
      },
      {
        id: "agent_photo",
        question: "Souhaitez-vous inclure la photo de l'agent immobilier sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "agent_image",
          imageUpload: {
            multiple: false,
            label: "Photo de l'agent",
            hint: "Une photo professionnelle de l'agent"
          }
        }
      },
      {
        id: "property_features",
        question: "Quelles sont les caractéristiques principales du bien à mettre en avant ?",
        type: "text",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "features_text",
          textInput: {
            label: "Caractéristiques",
            placeholder: "Ex: 3 chambres, 2 salles de bain, jardin, garage...",
            multiline: true
          }
        }
      }
    ]
  },

  // Restaurant (déjà partiellement implémenté, on complète)
  restaurant: {
    domain: "restaurant",
    label: "Restaurant",
    templateRequirements: ["menu", "dish_images", "beverage_images", "chef_photo"],
    questions: [
      {
        id: "include_menu",
        question: "Souhaitez-vous inclure un menu avec les plats et les prix sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "menu_content",
          textInput: {
            label: "Contenu du menu",
            placeholder: "Listez les plats avec leurs prix...",
            multiline: true
          }
        }
      },
      {
        id: "include_dishes",
        question: "Avez-vous des photos de plats/repas à inclure sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "dish_images",
          imageUpload: {
            multiple: true,
            label: "Photos des plats",
            hint: "Envoyez jusqu'à 4 photos de vos meilleurs plats"
          }
        }
      },
      {
        id: "include_beverages",
        question: "Avez-vous des photos de boissons à inclure ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "beverage_images",
          imageUpload: {
            multiple: true,
            label: "Photos des boissons",
            hint: "Envoyez jusqu'à 4 photos de boissons"
          }
        }
      },
      {
        id: "chef_photo",
        question: "Souhaitez-vous inclure une photo du chef sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 4,
        followUp: {
          condition: "yes",
          nextStep: "chef_image",
          imageUpload: {
            multiple: false,
            label: "Photo du chef",
            hint: "Une photo du chef cuisinier"
          }
        }
      }
    ]
  },

  // Événement
  event: {
    domain: "event",
    label: "Événement",
    templateRequirements: ["speaker_photos", "guest_photos", "venue_image"],
    questions: [
      {
        id: "has_speakers",
        question: "Y a-t-il des orateurs, artistes ou invités spéciaux pour cet événement ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "speaker_details"
        }
      },
      {
        id: "venue_image",
        question: "Avez-vous une image du lieu de l'événement à inclure ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "venue_image",
          imageUpload: {
            multiple: false,
            label: "Image du lieu",
            hint: "Une photo de la salle ou du lieu"
          }
        }
      },
      {
        id: "dress_code",
        question: "Y a-t-il un dress code ou thème vestimentaire à mentionner ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "dress_code_text",
          textInput: {
            label: "Dress code",
            placeholder: "Ex: Tenue de soirée, Tout en blanc, Décontracté...",
            multiline: false
          }
        }
      }
    ]
  },

  // Église
  church: {
    domain: "church",
    label: "Église",
    templateRequirements: ["pastor_photo", "guest_speakers", "church_logo"],
    questions: [
      {
        id: "has_pastor",
        question: "Souhaitez-vous inclure la photo du pasteur ou de l'orateur principal ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "pastor_photo",
          imageUpload: {
            multiple: false,
            label: "Photo du pasteur/orateur",
            hint: "Une photo du pasteur ou de l'orateur principal"
          }
        }
      },
      {
        id: "guest_speakers",
        question: "Y a-t-il des invités spéciaux ou orateurs invités ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "guest_speakers_photos"
        }
      },
      {
        id: "bible_verse",
        question: "Souhaitez-vous inclure un verset biblique sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "bible_verse_text",
          textInput: {
            label: "Verset biblique",
            placeholder: "Ex: Jean 3:16 - Car Dieu a tant aimé le monde...",
            multiline: true
          }
        }
      }
    ]
  },

  // Formation / Éducation
  formation: {
    domain: "formation",
    label: "Formation",
    templateRequirements: ["trainer_photo", "certification_logo", "program_details"],
    questions: [
      {
        id: "has_trainer",
        question: "Souhaitez-vous inclure la photo du formateur ou intervenant ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "trainer_photo",
          imageUpload: {
            multiple: false,
            label: "Photo du formateur",
            hint: "Une photo professionnelle du formateur"
          }
        }
      },
      {
        id: "certification",
        question: "Cette formation délivre-t-elle une certification à afficher ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "certification_details",
          textInput: {
            label: "Détails de la certification",
            placeholder: "Ex: Certification reconnue par..., Diplôme accrédité...",
            multiline: false
          }
        }
      },
      {
        id: "program_outline",
        question: "Souhaitez-vous inclure le programme ou les modules de la formation ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "program_text",
          textInput: {
            label: "Programme de formation",
            placeholder: "Listez les modules ou points clés du programme...",
            multiline: true
          }
        }
      }
    ]
  },

  // Fashion / Mode
  fashion: {
    domain: "fashion",
    label: "Mode",
    templateRequirements: ["product_images", "model_photos", "collection_theme"],
    questions: [
      {
        id: "multiple_products",
        question: "Avez-vous plusieurs produits ou vêtements à mettre en avant ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "product_images",
          imageUpload: {
            multiple: true,
            label: "Photos des produits",
            hint: "Envoyez jusqu'à 6 photos de vos produits"
          }
        }
      },
      {
        id: "has_model",
        question: "Souhaitez-vous inclure un mannequin ou modèle portant les vêtements ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "model_photo",
          imageUpload: {
            multiple: false,
            label: "Photo du modèle",
            hint: "Une photo du mannequin avec les vêtements"
          }
        }
      },
      {
        id: "collection_name",
        question: "S'agit-il d'une collection spécifique avec un nom ou thème ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "collection_text",
          textInput: {
            label: "Nom de la collection",
            placeholder: "Ex: Collection Printemps 2024, Urban Style...",
            multiline: false
          }
        }
      }
    ]
  },

  // Technologie
  technology: {
    domain: "technology",
    label: "Technologie",
    templateRequirements: ["product_image", "features_list", "demo_screenshot"],
    questions: [
      {
        id: "product_images",
        question: "Avez-vous des images du produit ou de l'application à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "tech_product_images",
          imageUpload: {
            multiple: true,
            label: "Images du produit",
            hint: "Screenshots, photos du produit, mockups..."
          }
        }
      },
      {
        id: "key_features",
        question: "Quelles sont les fonctionnalités clés à mettre en avant ?",
        type: "text",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "features_text",
          textInput: {
            label: "Fonctionnalités clés",
            placeholder: "Listez les principales fonctionnalités...",
            multiline: true
          }
        }
      }
    ]
  },

  // Santé
  health: {
    domain: "health",
    label: "Santé",
    templateRequirements: ["doctor_photo", "facility_image", "services_list"],
    questions: [
      {
        id: "doctor_photo",
        question: "Souhaitez-vous inclure la photo d'un médecin ou professionnel de santé ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "doctor_image",
          imageUpload: {
            multiple: false,
            label: "Photo du professionnel",
            hint: "Une photo professionnelle"
          }
        }
      },
      {
        id: "facility_images",
        question: "Avez-vous des images des locaux ou équipements à montrer ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "facility_images",
          imageUpload: {
            multiple: true,
            label: "Photos des locaux",
            hint: "Photos de la clinique, cabinet, équipements..."
          }
        }
      },
      {
        id: "services_list",
        question: "Souhaitez-vous lister les services ou spécialités proposés ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "services_text",
          textInput: {
            label: "Services proposés",
            placeholder: "Listez les services ou spécialités...",
            multiline: true
          }
        }
      }
    ]
  },

  // Musique
  music: {
    domain: "music",
    label: "Musique",
    templateRequirements: ["artist_photos", "album_cover", "venue_image"],
    questions: [
      {
        id: "artist_photos",
        question: "Avez-vous des photos des artistes à inclure sur l'affiche ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "artist_images",
          imageUpload: {
            multiple: true,
            label: "Photos des artistes",
            hint: "Photos des artistes ou du groupe"
          }
        }
      },
      {
        id: "album_promo",
        question: "S'agit-il de la promotion d'un album ou single ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "album_cover",
          imageUpload: {
            multiple: false,
            label: "Pochette de l'album",
            hint: "Image de la pochette de l'album ou single"
          }
        }
      },
      {
        id: "streaming_links",
        question: "Souhaitez-vous inclure des liens vers les plateformes de streaming ?",
        type: "boolean",
        required: false,
        priority: 3
      }
    ]
  },

  // Sport
  sport: {
    domain: "sport",
    label: "Sport",
    templateRequirements: ["athlete_photos", "team_logo", "venue_image"],
    questions: [
      {
        id: "athlete_photos",
        question: "Avez-vous des photos d'athlètes ou de l'équipe à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "athlete_images",
          imageUpload: {
            multiple: true,
            label: "Photos des athlètes",
            hint: "Photos des joueurs, athlètes ou de l'équipe"
          }
        }
      },
      {
        id: "team_logos",
        question: "Y a-t-il des logos d'équipes ou sponsors à inclure ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "team_logos",
          imageUpload: {
            multiple: true,
            label: "Logos des équipes/sponsors",
            hint: "Logos des équipes participantes ou sponsors"
          }
        }
      },
      {
        id: "match_details",
        question: "S'agit-il d'un match ou compétition avec des détails spécifiques ?",
        type: "boolean",
        required: false,
        priority: 3,
        followUp: {
          condition: "yes",
          nextStep: "match_text",
          textInput: {
            label: "Détails du match",
            placeholder: "Ex: Équipe A vs Équipe B, Quart de finale...",
            multiline: false
          }
        }
      }
    ]
  },

  // Éducation
  education: {
    domain: "education",
    label: "Éducation",
    templateRequirements: ["school_logo", "campus_images", "program_details"],
    questions: [
      {
        id: "campus_images",
        question: "Avez-vous des images du campus ou des installations à inclure ?",
        type: "boolean",
        required: false,
        priority: 1,
        followUp: {
          condition: "yes",
          nextStep: "campus_images",
          imageUpload: {
            multiple: true,
            label: "Photos du campus",
            hint: "Photos des bâtiments, salles de classe, équipements..."
          }
        }
      },
      {
        id: "programs_offered",
        question: "Souhaitez-vous mettre en avant des programmes ou filières spécifiques ?",
        type: "boolean",
        required: false,
        priority: 2,
        followUp: {
          condition: "yes",
          nextStep: "programs_text",
          textInput: {
            label: "Programmes proposés",
            placeholder: "Listez les programmes, filières ou formations...",
            multiline: true
          }
        }
      },
      {
        id: "registration_deadline",
        question: "Y a-t-il une date limite d'inscription à mettre en évidence ?",
        type: "boolean",
        required: false,
        priority: 3
      }
    ]
  }
};

// Fonction pour obtenir les questions d'un domaine
export function getDomainQuestions(domain: string): DomainQuestion[] {
  const config = DOMAIN_QUESTIONS[domain];
  if (!config) return [];
  return [...config.questions].sort((a, b) => a.priority - b.priority);
}

// Fonction pour obtenir la configuration complète d'un domaine
export function getDomainConfig(domain: string): DomainConfig | null {
  return DOMAIN_QUESTIONS[domain] || null;
}

// Fonction pour vérifier si un domaine a des questions configurées
export function domainHasQuestions(domain: string): boolean {
  return domain in DOMAIN_QUESTIONS && DOMAIN_QUESTIONS[domain].questions.length > 0;
}

// Fonction pour obtenir le prochain question en fonction de l'état actuel
export function getNextQuestion(
  domain: string, 
  answeredQuestions: Record<string, boolean | string>
): DomainQuestion | null {
  const questions = getDomainQuestions(domain);
  
  for (const question of questions) {
    if (!(question.id in answeredQuestions)) {
      return question;
    }
  }
  
  return null;
}

// Domaines qui nécessitent des questions sur les personnages/modèles
export const PRODUCT_DOMAINS = ["restaurant", "fashion", "technology", "health", "realestate"];

// Domaines qui nécessitent des questions sur les orateurs/artistes
export const SPEAKER_DOMAINS = ["event", "church", "formation", "music"];
