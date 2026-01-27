export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9" | "4:1" | "3:1" | "1:3";
export type Resolution = "1K" | "2K" | "4K";
export type OutputFormat = "png" | "jpg";

// Usage type - determines resolution tier
export type UsageType = "social" | "print" | "custom";

// Format preset for social media and print
export interface FormatPreset {
  id: string;
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  platform: string;
  icon: string;
  usage: UsageType;
  resolution?: Resolution;
}

export type Domain = 
  | "church" 
  | "event" 
  | "education" 
  | "restaurant" 
  | "fashion" 
  | "music" 
  | "sport" 
  | "technology" 
  | "health" 
  | "realestate"
  | "formation"
  | "youtube"
  | "other";

export interface DomainInfo {
  id: Domain;
  label: string;
}

export interface ExtractedInfo {
  title?: string;
  dates?: string;
  prices?: string;
  contact?: string;
  location?: string;
  organizer?: string;
  speakers?: string;
  menu?: string;
  products?: string;
  targetAudience?: string;
  additionalDetails?: string;
}

export interface AnalysisResult {
  suggestedDomain: string | null;
  extractedInfo: ExtractedInfo;
  missingInfo: string[];
  summary: string;
}

export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  domain?: Domain;
  referenceImageUrl?: string;
  referenceDescription?: string;
  colorPalette?: string[];
  contentImageUrl?: string;
  formatPreset?: FormatPreset;
  usageType?: UsageType;
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  domain?: Domain;
  createdAt: Date;
  formatPreset?: FormatPreset;
  usageType?: UsageType;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  taskId?: string;
  costTime?: number;
  error?: string;
}

export interface ImageAnalysisResult {
  success: boolean;
  description?: string;
  error?: string;
}

// Chat types
export type MessageRole = "assistant" | "user";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  image?: string;
  isLoading?: boolean;
}

export type LogoPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export interface LogoWithPosition {
  imageUrl: string;
  position: LogoPosition;
}

// Type pour les orateurs/artistes/invités
export interface Speaker {
  id: string;
  name: string;
  imageUrl: string;
  role: "main" | "guest";
}

// Type pour la mise en valeur du produit
export interface ProductDisplay {
  hasCharacter: boolean;
  characterInteraction?: string;
}

// Type pour les informations restaurant
export interface RestaurantInfo {
  hasMenu: boolean;
  menuContent?: string;
  hasBeverages: boolean;
  beverageImages?: string[];
  hasDishes: boolean;
  dishImages?: string[];
}

// Type pour les informations immobilier
export interface RealEstateInfo {
  hasMultipleImages: boolean;
  propertyImages?: string[];
  hasAgentPhoto: boolean;
  agentPhoto?: string;
  propertyFeatures?: string;
}

// Type pour les informations formation
export interface FormationInfo {
  hasTrainerPhoto: boolean;
  trainerPhoto?: string;
  hasCertification: boolean;
  certificationDetails?: string;
  programOutline?: string;
}

// Type pour les informations mode/fashion
export interface FashionInfo {
  hasMultipleProducts: boolean;
  productImages?: string[];
  hasModel: boolean;
  modelPhoto?: string;
  collectionName?: string;
}

// Type pour les informations santé
export interface HealthInfo {
  hasDoctorPhoto: boolean;
  doctorPhoto?: string;
  hasFacilityImages: boolean;
  facilityImages?: string[];
  servicesList?: string;
}

// Type pour les informations musique
export interface MusicInfo {
  hasArtistPhotos: boolean;
  artistPhotos?: string[];
  hasAlbumCover: boolean;
  albumCover?: string;
  hasStreamingLinks: boolean;
}

// Type pour les informations sport
export interface SportInfo {
  hasAthletePhotos: boolean;
  athletePhotos?: string[];
  hasTeamLogos: boolean;
  teamLogos?: string[];
  matchDetails?: string;
}

// Type pour les informations éducation
export interface EducationInfo {
  hasCampusImages: boolean;
  campusImages?: string[];
  programsOffered?: string;
  hasRegistrationDeadline: boolean;
}

// Type pour les informations église
export interface ChurchInfo {
  hasPastorPhoto: boolean;
  pastorPhoto?: string;
  hasGuestSpeakers: boolean;
  guestSpeakerPhotos?: string[];
  bibleVerse?: string;
}

// Type pour les informations événement
export interface EventInfo {
  hasVenueImage: boolean;
  venueImage?: string;
  dressCode?: string;
}

// Type pour les informations miniature YouTube
export interface YouTubeInfo {
  videoTitle: string;
  hasOwnImage: boolean;
  ownImage?: string;
  subjectEthnicity?: "africain" | "caucasien" | "asiatique" | "autre";
  subjectAge?: "jeune" | "adulte" | "senior";
  subjectGender?: "homme" | "femme";
  desiredExpression?: "surprise" | "concentration" | "joie" | "confiance";
  hasLogo: boolean;
  logos?: Array<{
    imageUrl: string;
    position: LogoPosition;
  }>;
}

// Type générique pour stocker les infos spécifiques au domaine
export interface DomainSpecificInfo {
  realEstate?: RealEstateInfo;
  formation?: FormationInfo;
  fashion?: FashionInfo;
  health?: HealthInfo;
  music?: MusicInfo;
  sport?: SportInfo;
  education?: EducationInfo;
  church?: ChurchInfo;
  event?: EventInfo;
  youtube?: YouTubeInfo;
}

// Type pour suivre les questions posées et réponses
export interface DomainQuestionState {
  currentQuestionId: string | null;
  answeredQuestions: Record<string, boolean | string>;
  pendingImageUpload?: {
    type: string;
    multiple: boolean;
    label: string;
    hint: string;
  };
  pendingTextInput?: {
    type: string;
    label: string;
    placeholder: string;
    multiline: boolean;
  };
  collectedImages: Record<string, string[]>;
  collectedTexts: Record<string, string>;
}

export interface ConversationState {
  step: 
    | "greeting" 
    | "analyzing" 
    | "domain" 
    | "custom_domain" 
    | "details" 
    | "speakers_check"
    | "main_speaker_photo"
    | "main_speaker_name"
    | "guests_check"
    | "guest_photo"
    | "guest_name"
    | "product_character_check"
    | "product_character_interaction"
    | "restaurant_menu_check"
    | "restaurant_menu_content"
    | "restaurant_beverages_check"
    | "restaurant_beverages_photos"
    | "restaurant_dishes_check"
    | "restaurant_dishes_photos"
    | "style_preferences"
    | "domain_questions" // Nouvelle étape pour les questions intelligentes par domaine
    | "domain_question_images" // Collecte d'images suite à une question
    | "domain_question_text" // Collecte de texte suite à une question
    | "reference" 
    | "format"  // Nouvelle étape: sélection du format
    | "colors" 
    | "logo" 
    | "logo_position" 
    | "content_image" 
    | "generating" 
    | "complete" 
    | "modifying"
    | "analyzing_template" // Analyse d'un template à cloner
    | "template_questions" // Questions personnalisées basées sur le template
    | "clone_gathering"; // Collecte des informations en un seul message pour le clonage
  domain?: Domain;
  modificationRequest?: string;
  customDomain?: string;
  description?: string;
  extractedInfo?: ExtractedInfo;
  missingInfo?: string[];
  referenceImage?: string;
  referenceDescription?: string;
  colorPalette?: string[];
  logos?: LogoWithPosition[];
  currentLogoImage?: string;
  contentImage?: string;
  needsContentImage?: boolean;
  // Speakers/Artists
  hasSpeakers?: boolean;
  mainSpeaker?: Speaker;
  currentSpeakerImage?: string;
  guests?: Speaker[];
  // Product display
  productDisplay?: ProductDisplay;
  // Restaurant info
  restaurantInfo?: RestaurantInfo;
  currentBeverageImages?: string[];
  currentDishImages?: string[];
  // Language preference (default: French)
  language?: string;
  // Style preferences for template selection
  stylePreferences?: string;
  // Flag to indicate if we're using auto-selected template
  usingAutoTemplate?: boolean;
  // Nouveau: État des questions intelligentes par domaine
  domainQuestionState?: DomainQuestionState;
  // Nouveau: Informations spécifiques au domaine collectées
  domainSpecificInfo?: DomainSpecificInfo;
  // Format de sortie sélectionné
  formatPreset?: FormatPreset;
  usageType?: UsageType;
}
