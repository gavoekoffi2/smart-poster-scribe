import { useCallback } from "react";
import { Domain, DomainQuestionState, DomainSpecificInfo, ConversationState } from "@/types/generation";
import { getDomainQuestions, getNextQuestion, domainHasQuestions, DomainQuestion } from "@/config/domainQuestions";

interface UseDomainQuestionsProps {
  conversationState: ConversationState;
  setConversationState: React.Dispatch<React.SetStateAction<ConversationState>>;
  addAssistantMessage: (content: string) => void;
}

export function useDomainQuestions({
  conversationState,
  setConversationState,
  addAssistantMessage,
}: UseDomainQuestionsProps) {
  
  // Initialiser l'état des questions pour un domaine
  const initializeDomainQuestions = useCallback((domain: Domain) => {
    if (!domainHasQuestions(domain)) {
      return false;
    }

    const questions = getDomainQuestions(domain);
    if (questions.length === 0) {
      return false;
    }

    const firstQuestion = questions[0];
    
    setConversationState(prev => ({
      ...prev,
      step: "domain_questions",
      domainQuestionState: {
        currentQuestionId: firstQuestion.id,
        answeredQuestions: {},
        collectedImages: {},
        collectedTexts: {},
      },
      domainSpecificInfo: {},
    }));

    // Poser la première question
    addAssistantMessage(firstQuestion.question);
    
    return true;
  }, [setConversationState, addAssistantMessage]);

  // Traiter la réponse à une question booléenne (oui/non)
  const handleBooleanAnswer = useCallback((answer: boolean) => {
    const state = conversationState.domainQuestionState;
    const domain = conversationState.domain;
    
    if (!state || !domain || !state.currentQuestionId) return;

    const questions = getDomainQuestions(domain);
    const currentQuestion = questions.find(q => q.id === state.currentQuestionId);
    
    if (!currentQuestion) return;

    // Mettre à jour les réponses
    const newAnsweredQuestions = {
      ...state.answeredQuestions,
      [state.currentQuestionId]: answer,
    };

    // Si la réponse est oui et qu'il y a un follow-up
    if (answer && currentQuestion.followUp) {
      const followUp = currentQuestion.followUp;
      
      if (followUp.imageUpload) {
        // Passer à la collecte d'images
        setConversationState(prev => ({
          ...prev,
          step: "domain_question_images",
          domainQuestionState: {
            ...state,
            answeredQuestions: newAnsweredQuestions,
            pendingImageUpload: {
              type: state.currentQuestionId!,
              multiple: followUp.imageUpload!.multiple,
              label: followUp.imageUpload!.label,
              hint: followUp.imageUpload!.hint,
            },
          },
        }));
        addAssistantMessage(`📸 ${followUp.imageUpload.label}\n\n${followUp.imageUpload.hint}`);
        return;
      }
      
      if (followUp.textInput) {
        // Passer à la collecte de texte
        setConversationState(prev => ({
          ...prev,
          step: "domain_question_text",
          domainQuestionState: {
            ...state,
            answeredQuestions: newAnsweredQuestions,
            pendingTextInput: {
              type: state.currentQuestionId!,
              label: followUp.textInput!.label,
              placeholder: followUp.textInput!.placeholder,
              multiline: followUp.textInput!.multiline || false,
            },
          },
        }));
        addAssistantMessage(`📝 ${followUp.textInput.label}\n\n${followUp.textInput.placeholder}`);
        return;
      }
    }

    // Passer à la question suivante
    moveToNextQuestion(domain, newAnsweredQuestions, state.collectedImages, state.collectedTexts);
  }, [conversationState, setConversationState, addAssistantMessage]);

  // Traiter l'upload d'images
  const handleImagesUploaded = useCallback((images: string[]) => {
    const state = conversationState.domainQuestionState;
    const domain = conversationState.domain;
    
    if (!state || !domain || !state.pendingImageUpload) return;

    const newCollectedImages = {
      ...state.collectedImages,
      [state.pendingImageUpload.type]: images,
    };

    // Passer à la question suivante
    moveToNextQuestion(domain, state.answeredQuestions, newCollectedImages, state.collectedTexts);
  }, [conversationState]);

  // Traiter la saisie de texte
  const handleTextInput = useCallback((text: string) => {
    const state = conversationState.domainQuestionState;
    const domain = conversationState.domain;
    
    if (!state || !domain || !state.pendingTextInput) return;

    const newCollectedTexts = {
      ...state.collectedTexts,
      [state.pendingTextInput.type]: text,
    };

    // Passer à la question suivante
    moveToNextQuestion(domain, state.answeredQuestions, state.collectedImages, newCollectedTexts);
  }, [conversationState]);

  // Passer à la question suivante ou terminer
  const moveToNextQuestion = useCallback((
    domain: Domain,
    answeredQuestions: Record<string, boolean | string>,
    collectedImages: Record<string, string[]>,
    collectedTexts: Record<string, string>
  ) => {
    const nextQuestion = getNextQuestion(domain, answeredQuestions);
    
    if (nextQuestion) {
      // Poser la question suivante
      setConversationState(prev => ({
        ...prev,
        step: "domain_questions",
        domainQuestionState: {
          currentQuestionId: nextQuestion.id,
          answeredQuestions,
          collectedImages,
          collectedTexts,
          pendingImageUpload: undefined,
          pendingTextInput: undefined,
        },
      }));
      addAssistantMessage(nextQuestion.question);
    } else {
      // Toutes les questions ont été posées, compiler les informations
      const domainSpecificInfo = compileDomainInfo(domain, answeredQuestions, collectedImages, collectedTexts);
      
      setConversationState(prev => ({
        ...prev,
        domainQuestionState: {
          currentQuestionId: null,
          answeredQuestions,
          collectedImages,
          collectedTexts,
        },
        domainSpecificInfo,
      }));

      // Retourner true pour indiquer que les questions sont terminées
      return true;
    }
    return false;
  }, [setConversationState, addAssistantMessage]);

  // Compiler les informations collectées en structure utilisable
  const compileDomainInfo = (
    domain: Domain,
    answeredQuestions: Record<string, boolean | string>,
    collectedImages: Record<string, string[]>,
    collectedTexts: Record<string, string>
  ): DomainSpecificInfo => {
    const info: DomainSpecificInfo = {};

    switch (domain) {
      case "realestate":
        info.realEstate = {
          hasMultipleImages: answeredQuestions["multiple_properties"] as boolean || false,
          propertyImages: collectedImages["multiple_properties"],
          hasAgentPhoto: answeredQuestions["agent_photo"] as boolean || false,
          agentPhoto: collectedImages["agent_photo"]?.[0],
          propertyFeatures: collectedTexts["property_features"],
        };
        break;
      
      case "formation":
        info.formation = {
          hasTrainerPhoto: answeredQuestions["has_trainer"] as boolean || false,
          trainerPhoto: collectedImages["has_trainer"]?.[0],
          hasCertification: answeredQuestions["certification"] as boolean || false,
          certificationDetails: collectedTexts["certification"],
          programOutline: collectedTexts["program_outline"],
        };
        break;
      
      case "fashion":
        info.fashion = {
          hasMultipleProducts: answeredQuestions["multiple_products"] as boolean || false,
          productImages: collectedImages["multiple_products"],
          hasModel: answeredQuestions["has_model"] as boolean || false,
          modelPhoto: collectedImages["has_model"]?.[0],
          collectionName: collectedTexts["collection_name"],
        };
        break;
      
      case "health":
        info.health = {
          hasDoctorPhoto: answeredQuestions["doctor_photo"] as boolean || false,
          doctorPhoto: collectedImages["doctor_photo"]?.[0],
          hasFacilityImages: answeredQuestions["facility_images"] as boolean || false,
          facilityImages: collectedImages["facility_images"],
          servicesList: collectedTexts["services_list"],
        };
        break;
      
      case "music":
        info.music = {
          hasArtistPhotos: answeredQuestions["artist_photos"] as boolean || false,
          artistPhotos: collectedImages["artist_photos"],
          hasAlbumCover: answeredQuestions["album_promo"] as boolean || false,
          albumCover: collectedImages["album_promo"]?.[0],
          hasStreamingLinks: answeredQuestions["streaming_links"] as boolean || false,
        };
        break;
      
      case "sport":
        info.sport = {
          hasAthletePhotos: answeredQuestions["athlete_photos"] as boolean || false,
          athletePhotos: collectedImages["athlete_photos"],
          hasTeamLogos: answeredQuestions["team_logos"] as boolean || false,
          teamLogos: collectedImages["team_logos"],
          matchDetails: collectedTexts["match_details"],
        };
        break;
      
      case "education":
        info.education = {
          hasCampusImages: answeredQuestions["campus_images"] as boolean || false,
          campusImages: collectedImages["campus_images"],
          programsOffered: collectedTexts["programs_offered"],
          hasRegistrationDeadline: answeredQuestions["registration_deadline"] as boolean || false,
        };
        break;
      
      case "church":
        info.church = {
          hasPastorPhoto: answeredQuestions["has_pastor"] as boolean || false,
          pastorPhoto: collectedImages["has_pastor"]?.[0],
          hasGuestSpeakers: answeredQuestions["guest_speakers"] as boolean || false,
          guestSpeakerPhotos: collectedImages["guest_speakers"],
          bibleVerse: collectedTexts["bible_verse"],
        };
        break;
      
      case "event":
        info.event = {
          hasVenueImage: answeredQuestions["venue_image"] as boolean || false,
          venueImage: collectedImages["venue_image"]?.[0],
          dressCode: collectedTexts["dress_code"],
        };
        break;
    }

    return info;
  };

  // Vérifier si le domaine a des questions à poser
  const shouldAskDomainQuestions = useCallback((domain: Domain): boolean => {
    return domainHasQuestions(domain);
  }, []);

  // Générer la description enrichie pour la génération d'image
  const generateEnrichedPrompt = useCallback((baseDescription: string): string => {
    const state = conversationState.domainQuestionState;
    const info = conversationState.domainSpecificInfo;
    const domain = conversationState.domain;
    
    if (!domain) return baseDescription;

    let enrichedPrompt = baseDescription;
    const additions: string[] = [];

    // Ajouter les informations spécifiques au domaine
    switch (domain) {
      case "realestate":
        if (info?.realEstate) {
          if (info.realEstate.propertyFeatures) {
            additions.push(`Caractéristiques du bien: ${info.realEstate.propertyFeatures}`);
          }
          if (info.realEstate.hasAgentPhoto) {
            additions.push("Inclure un espace pour la photo de l'agent immobilier");
          }
          if (info.realEstate.hasMultipleImages) {
            additions.push(`Prévoir un layout pour ${info.realEstate.propertyImages?.length || "plusieurs"} images du bien`);
          }
        }
        break;

      case "formation":
        if (info?.formation) {
          if (info.formation.certificationDetails) {
            additions.push(`Certification: ${info.formation.certificationDetails}`);
          }
          if (info.formation.programOutline) {
            additions.push(`Programme: ${info.formation.programOutline}`);
          }
          if (info.formation.hasTrainerPhoto) {
            additions.push("Inclure un espace pour la photo du formateur");
          }
        }
        break;

      case "fashion":
        if (info?.fashion) {
          if (info.fashion.collectionName) {
            additions.push(`Collection: ${info.fashion.collectionName}`);
          }
          if (info.fashion.hasMultipleProducts) {
            additions.push(`Layout pour ${info.fashion.productImages?.length || "plusieurs"} produits`);
          }
          if (info.fashion.hasModel) {
            additions.push("Inclure un mannequin/modèle");
          }
        }
        break;

      case "health":
        if (info?.health) {
          if (info.health.servicesList) {
            additions.push(`Services: ${info.health.servicesList}`);
          }
          if (info.health.hasDoctorPhoto) {
            additions.push("Inclure la photo du professionnel de santé");
          }
        }
        break;

      case "music":
        if (info?.music) {
          if (info.music.hasArtistPhotos) {
            additions.push("Mettre en avant les photos des artistes");
          }
          if (info.music.hasAlbumCover) {
            additions.push("Inclure la pochette de l'album");
          }
          if (info.music.hasStreamingLinks) {
            additions.push("Ajouter des icônes de plateformes de streaming");
          }
        }
        break;

      case "sport":
        if (info?.sport) {
          if (info.sport.matchDetails) {
            additions.push(`Match: ${info.sport.matchDetails}`);
          }
          if (info.sport.hasAthletePhotos) {
            additions.push("Mettre en avant les photos des athlètes");
          }
          if (info.sport.hasTeamLogos) {
            additions.push("Inclure les logos des équipes");
          }
        }
        break;

      case "education":
        if (info?.education) {
          if (info.education.programsOffered) {
            additions.push(`Programmes: ${info.education.programsOffered}`);
          }
          if (info.education.hasRegistrationDeadline) {
            additions.push("Mettre en évidence la date limite d'inscription");
          }
        }
        break;

      case "church":
        if (info?.church) {
          if (info.church.bibleVerse) {
            additions.push(`Verset biblique: ${info.church.bibleVerse}`);
          }
          if (info.church.hasPastorPhoto) {
            additions.push("Inclure la photo du pasteur");
          }
          if (info.church.hasGuestSpeakers) {
            additions.push("Prévoir un espace pour les invités spéciaux");
          }
        }
        break;

      case "event":
        if (info?.event) {
          if (info.event.dressCode) {
            additions.push(`Dress code: ${info.event.dressCode}`);
          }
          if (info.event.hasVenueImage) {
            additions.push("Inclure une image du lieu");
          }
        }
        break;
    }

    // Ajouter les textes collectés
    if (state?.collectedTexts) {
      Object.entries(state.collectedTexts).forEach(([key, value]) => {
        if (value && !additions.some(a => a.includes(value))) {
          additions.push(value);
        }
      });
    }

    if (additions.length > 0) {
      enrichedPrompt += "\n\nÉléments spécifiques à inclure:\n" + additions.map(a => `- ${a}`).join("\n");
    }

    return enrichedPrompt;
  }, [conversationState]);

  // Obtenir toutes les images collectées pour les inclure dans la génération
  const getCollectedImages = useCallback((): Record<string, string[]> => {
    return conversationState.domainQuestionState?.collectedImages || {};
  }, [conversationState]);

  return {
    initializeDomainQuestions,
    handleBooleanAnswer,
    handleImagesUploaded,
    handleTextInput,
    shouldAskDomainQuestions,
    generateEnrichedPrompt,
    getCollectedImages,
    moveToNextQuestion,
  };
}
