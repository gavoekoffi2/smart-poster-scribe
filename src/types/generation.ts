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
  | "other";

export interface DomainInfo {
  id: Domain;
  label: string;
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

export interface ConversationState {
  step: "greeting" | "domain" | "details" | "reference" | "colors" | "content_image" | "generating" | "complete";
  domain?: Domain;
  description?: string;
  referenceImage?: string;
  referenceDescription?: string;
  colorPalette?: string[];
  contentImage?: string;
  needsContentImage?: boolean;
}
