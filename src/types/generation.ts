export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
export type Resolution = "1K" | "2K" | "4K";
export type OutputFormat = "png" | "jpg";

export type Domain = "professional" | "creative" | "personal" | "event" | "commercial";

export interface DomainInfo {
  id: Domain;
  label: string;
  description: string;
  icon: string;
  questions: DomainQuestion[];
}

export interface DomainQuestion {
  id: string;
  question: string;
  placeholder: string;
  required?: boolean;
}

export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  outputFormat: OutputFormat;
  domain?: Domain;
  referenceImageUrl?: string;
  referenceDescription?: string;
  domainAnswers?: Record<string, string>;
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
