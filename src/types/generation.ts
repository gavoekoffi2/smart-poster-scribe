export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
export type Resolution = "1K" | "2K" | "4K";
export type OutputFormat = "png" | "jpg";

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
}

export interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  domain?: Domain;
  createdAt: Date;
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
  characterInteraction?: string; // Description de comment le personnage interagit avec le produit
}

// Type pour les informations restaurant
export interface RestaurantInfo {
  hasMenu: boolean;
  menuContent?: string; // Le contenu du menu avec les plats et prix
  hasBeverages: boolean;
  beverageImages?: string[]; // Images des boissons
  hasDishes: boolean;
  dishImages?: string[]; // Images des plats/repas
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
    | "product_character_check" // Demander si personnage sur l'affiche produit
    | "product_character_interaction" // Comment le personnage interagit avec le produit
    | "restaurant_menu_check" // Demander si l'affiche doit inclure un menu
    | "restaurant_menu_content" // Capturer le contenu du menu
    | "restaurant_beverages_check" // Demander si des boissons à inclure
    | "restaurant_beverages_photos" // Photos des boissons
    | "restaurant_dishes_check" // Demander si des plats à inclure
    | "restaurant_dishes_photos" // Photos des plats
    | "style_preferences" // Demander des préférences de style optionnelles
    | "reference" 
    | "colors" 
    | "logo" 
    | "logo_position" 
    | "content_image" 
    | "generating" 
    | "complete" 
    | "modifying";
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
}
