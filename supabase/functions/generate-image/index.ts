import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectDomainFromPrompt, buildExpertSkillsPrompt, getRandomTypographyStyle } from "./expertSkills.ts";
// professionalStandards no longer injected into prompt to stay within API limits

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
  };
}

interface KieRecordInfoResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    model: string;
    state: "waiting" | "success" | "fail";
    param: string;
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
    costTime?: number;
    completeTime?: number;
    createTime: number;
  };
}

interface KieResultJson {
  resultUrls?: string[];
  resultObject?: Record<string, unknown>;
}

function isHttpUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}

function isUrlLike(str: string): boolean {
  return isHttpUrl(str) || str.startsWith("/");
}

function resolveUrlLike(input: string, origin?: string): string {
  if (isHttpUrl(input)) return input;
  if (input.startsWith("/")) {
    if (!origin) {
      throw new Error("URL relative reçue mais origin introuvable");
    }
    return `${origin}${input}`;
  }
  throw new Error("Entrée URL invalide");
}

async function downloadAndUploadImage(
  supabase: any,
  imageUrl: string,
  prefix: string
): Promise<string> {
  console.log(`Downloading image from URL for ${prefix}:`, imageUrl);
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`URL ne retourne pas une image (content-type=${contentType || "unknown"})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  else if (contentType.includes('webp')) extension = 'webp';
  
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  
  const { error } = await supabase.storage
    .from('temp-images')
    .upload(fileName, bytes, {
      contentType: contentType,
      upsert: false,
    });
  
  if (error) {
    console.error(`Storage upload error for ${prefix}:`, error);
    throw new Error(`Erreur upload ${prefix}: ${error.message}`);
  }
  
  const { data: urlData } = supabase.storage
    .from('temp-images')
    .getPublicUrl(fileName);
  
  console.log(`${prefix} uploaded successfully from URL:`, urlData.publicUrl);
  return urlData.publicUrl;
}

async function uploadBase64ToStorage(
  supabase: any,
  base64Data: string,
  prefix: string
): Promise<string> {
  console.log(`Uploading ${prefix} image to storage...`);
  
  const matches = base64Data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!matches) {
    throw new Error(`Format d'image invalide pour ${prefix}. Formats acceptés: jpeg, png, webp`);
  }
  
  const mimeType = matches[1].toLowerCase();
  const base64Content = matches[2];
  
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const extension = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg' : mimeType;
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  
  const { error } = await supabase.storage
    .from('temp-images')
    .upload(fileName, bytes, {
      contentType: `image/${mimeType}`,
      upsert: false,
    });
  
  if (error) {
    console.error(`Storage upload error for ${prefix}:`, error);
    throw new Error(`Erreur upload ${prefix}: ${error.message}`);
  }
  
  const { data: urlData } = supabase.storage
    .from('temp-images')
    .getPublicUrl(fileName);
  
  console.log(`${prefix} uploaded successfully:`, urlData.publicUrl);
  return urlData.publicUrl;
}

async function processImage(
  supabase: any,
  imageData: string,
  prefix: string,
  origin?: string
): Promise<string> {
  if (isUrlLike(imageData)) {
    const resolved = resolveUrlLike(imageData, origin);
    return await downloadAndUploadImage(supabase, resolved, prefix);
  }
  return await uploadBase64ToStorage(supabase, imageData, prefix);
}

async function cleanupTempImages(supabase: any, filePaths: string[]) {
  for (const path of filePaths) {
    try {
      const fileName = path.split('/').pop();
      if (fileName) {
        await supabase.storage.from('temp-images').remove([fileName]);
        console.log(`Cleaned up temp image: ${fileName}`);
      }
    } catch (e) {
      console.warn(`Failed to cleanup temp image: ${path}`, e);
    }
  }
}

function buildProfessionalPrompt({
  userPrompt,
  hasReferenceImage,
  hasContentImage,
  hasLogoImage,
  aspectRatio,
  isCloneMode = false,
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  hasLogoImage: boolean;
  aspectRatio: string;
  isCloneMode?: boolean;
}): string {
  const detectedDomain = detectDomainFromPrompt(userPrompt);
  console.log(`Expert skills: Detected domain "${detectedDomain}" for prompt`);

  // ====== MODE CLONE (Cas A & B) : Expert Design Graphique ======
  if (isCloneMode || hasReferenceImage) {
    const lines: string[] = [];
    lines.push("MISSION: Tu recois une affiche de reference. Tu dois produire une COPIE QUASI-IDENTIQUE de cette affiche. NE CHANGE RIEN au design.");
    lines.push("REGLE ABSOLUE: Le fond, les formes, les courbes, les couleurs, la mise en page, la composition, les effets, les textures, les ombres = IDENTIQUES a la reference.");
    lines.push("TEXTE: Remplace UNIQUEMENT le texte par les infos du client. Garde le MEME style typographique (police, taille, effets 3D, ombres, glow, couleur, position).");
    lines.push("PHOTOS: Si le client fournit une photo, remplace la photo de la reference par celle du client a la MEME position et MEME taille.");
    lines.push("LOGOS: Si le client fournit un logo, remplace le logo de la reference. Sinon SUPPRIME le logo.");
    lines.push("SUPPRESSION: Tout element de la reference dont le client n'a PAS fourni l'equivalent (date, telephone, adresse, logo, photo) doit etre SUPPRIME proprement sans laisser de vide.");
    lines.push("INTERDIT: Ne change PAS le fond. Ne change PAS les formes decoratives. Ne change PAS la structure. Ne REINVENTE PAS le design. COPIE le design exact.");
    if (hasContentImage) lines.push("PHOTO CLIENT: Integre-la exactement a la position de la photo dans la reference.");
    if (hasLogoImage) lines.push("LOGO CLIENT: Reproduire EXACTEMENT le logo fourni.");
    lines.push("Personnes africaines par defaut. Zero info inventee. Zero placeholder.");
    lines.push(`Format:${aspectRatio}|HD|Francais`);
    lines.push("=== INFOS CLIENT A APPLIQUER ===");
    lines.push(userPrompt);
    return lines.join("\n");
  }

  // ====== MODE LIBRE (Cas C) ======
  const instructions: string[] = [];
  instructions.push("Expert Design Graphique: Affiche publicitaire professionnelle unique.");
  const expertSkillsPrompt = buildExpertSkillsPrompt(detectedDomain);
  instructions.push(expertSkillsPrompt);
  instructions.push(`TYPO DESIGNEE: ${getRandomTypographyStyle()}. Zero texte plat.`);
  instructions.push("LAYOUT PRO: Courbes, vagues, bandeaux obliques, rubans 3D, superposition couches.");
  instructions.push("Infos client uniquement. Africains par defaut. Texte lisible, zero faute. Couleurs 60-30-10.");
  if (hasLogoImage) instructions.push("LOGO: Reproduire EXACTEMENT.");
  if (hasContentImage) instructions.push("PHOTO: Utiliser telle quelle.");
  instructions.push(`Format:${aspectRatio}|HD|Francais`);
  instructions.push("=== DONNEES CLIENT ===");
  instructions.push(userPrompt);
  return instructions.join("\n");
}

async function createTask(
  apiKey: string,
  prompt: string,
  imageInputs: string[],
  aspectRatio: string,
  resolution: string,
  outputFormat: string
): Promise<string> {
  console.log("Creating task with Kie AI...");
  console.log("Resolution requested:", resolution);
  console.log("Aspect ratio:", aspectRatio);
  console.log("Image inputs count:", imageInputs.length);
  console.log("Output format:", outputFormat);

  // The Kie AI API expects resolution as "1K", "2K", or "4K"
  // Ensure we're passing the correct format
  const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "2K";
  
  const requestBody = {
    model: "nano-banana-pro",
    input: {
      prompt: prompt,
      image_input: imageInputs,
      aspect_ratio: aspectRatio,
      resolution: validResolution,
      output_format: outputFormat,
    },
  };
  
  console.log("Request body (without prompt):", JSON.stringify({
    ...requestBody,
    input: { ...requestBody.input, prompt: `[${prompt.length} chars]` }
  }));

  const response = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create task error:", response.status, errorText);
    
    if (response.status === 401) {
      throw new Error("Clé API Kie AI invalide ou expirée");
    }
    if (response.status === 402) {
      throw new Error("Solde insuffisant sur le compte Kie AI");
    }
    if (response.status === 429) {
      throw new Error("Limite de requêtes atteinte. Réessayez plus tard.");
    }
    if (response.status === 400) {
      throw new Error(`Paramètres invalides: ${errorText}`);
    }
    
    throw new Error(`Erreur création tâche: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as KieCreateTaskResponse;
  console.log("Create task response:", JSON.stringify(data));

  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Erreur API Kie: ${data.msg || "Pas de taskId retourné"}`);
  }

  console.log("Task created successfully:", data.data.taskId);
  return data.data.taskId;
}

async function pollForResult(
  apiKey: string,
  taskId: string,
  resolution: string = "2K",
  maxAttempts: number = 150, // Increased for 4K which takes much longer
  baseIntervalMs: number = 2000  // Base polling interval
): Promise<string> {
  // Adjust timeouts based on resolution - 4K takes significantly longer
  const resolutionConfig: Record<string, { maxAttempts: number; baseInterval: number }> = {
    "1K": { maxAttempts: 80, baseInterval: 2000 },
    "2K": { maxAttempts: 120, baseInterval: 2000 },
    "4K": { maxAttempts: 200, baseInterval: 2500 }, // 4K needs more time (~8+ min timeout)
  };
  
  const config = resolutionConfig[resolution] || resolutionConfig["2K"];
  maxAttempts = config.maxAttempts;
  baseIntervalMs = config.baseInterval;
  
  console.log(`Polling for result, taskId: ${taskId}, resolution: ${resolution}, maxAttempts: ${maxAttempts}`);
  const startTime = Date.now();
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    
    // Use exponential backoff for early attempts, then steady polling
    const intervalMs = attempt < 10 
      ? Math.min(baseIntervalMs * (1 + attempt * 0.2), 5000) 
      : baseIntervalMs;
    
    console.log(`Poll attempt ${attempt + 1}/${maxAttempts} (elapsed: ${elapsedSec}s, interval: ${Math.round(intervalMs)}ms)`);

    try {
      const response = await fetch(
        `${KIE_API_BASE}/recordInfo?taskId=${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        consecutiveErrors++;
        console.error(`Poll error: ${response.status} (consecutive: ${consecutiveErrors})`);
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`Trop d'erreurs consécutives lors du polling: ${response.status}`);
        }
        
        // Wait longer after errors
        await new Promise((resolve) => setTimeout(resolve, intervalMs * 2));
        continue;
      }
      
      // Reset error counter on success
      consecutiveErrors = 0;

      const data = (await response.json()) as KieRecordInfoResponse;
      console.log(`Poll response state: ${data.data?.state}, costTime: ${data.data?.costTime}ms`);

      if (data.data?.state === "success" && data.data.resultJson) {
        const result = JSON.parse(data.data.resultJson) as KieResultJson;
        if (result.resultUrls && result.resultUrls.length > 0) {
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          console.log(`Generation successful in ${totalTime}s, URL: ${result.resultUrls[0]}`);
          return result.resultUrls[0];
        }
        throw new Error("Pas d'URL dans le résultat");
      }

      if (data.data?.state === "fail") {
        const errorMsg = data.data.failMsg || data.data.failCode || "Erreur inconnue";
        console.error(`Generation failed: ${errorMsg}`);
        
        // Some failures are retryable
        if (errorMsg.includes("timeout") || errorMsg.includes("rate limit") || errorMsg.includes("busy")) {
          console.log("Retryable error detected, continuing polling...");
          await new Promise((resolve) => setTimeout(resolve, intervalMs * 3));
          continue;
        }
        
        throw new Error(`Génération échouée: ${errorMsg}`);
      }

      // Still waiting or processing
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (fetchError) {
      // Network errors should be retried
      if (fetchError instanceof TypeError || (fetchError as any)?.name === "TypeError") {
        consecutiveErrors++;
        console.error(`Network error during poll (consecutive: ${consecutiveErrors}):`, fetchError);
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error("Erreur réseau persistante lors du polling");
        }
        
        await new Promise((resolve) => setTimeout(resolve, intervalMs * 2));
        continue;
      }
      throw fetchError;
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  throw new Error(`Délai d'attente dépassé après ${totalTime} secondes. Réessayez avec une résolution inférieure si le problème persiste.`);
}

const MAX_PROMPT_LENGTH = 5000;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_LOGO_COUNT = 5;
// Extended list of allowed aspect ratios to support all social media and print formats
const ALLOWED_ASPECT_RATIOS = [
  '1:1',    // Square (Instagram, Facebook)
  '3:4',    // Portrait standard
  '4:3',    // Landscape standard
  '4:5',    // Instagram portrait
  '5:4',    // Alternative landscape
  '16:9',   // Wide (YouTube, Facebook cover)
  '9:16',   // Vertical (Stories, TikTok, Reels)
  '2:3',    // Poster
  '3:2',    // Landscape poster
  '4:1',    // Banner (LinkedIn cover)
  '1:4',    // Tall banner
  '3:1',    // Header (Twitter)
  '1:3',    // Roll-up banner
  '21:9',   // Ultra-wide
  '9:21',   // Ultra-tall
];
const ALLOWED_RESOLUTIONS = ['1K', '2K', '4K'];
const ALLOWED_OUTPUT_FORMATS = ['png', 'jpg', 'webp'];

function validateBase64Size(base64: string, maxMB: number, fieldName: string): void {
  if (typeof base64 !== 'string') {
    throw new Error(`${fieldName}: format invalide`);
  }
  const base64Content = base64.includes(',') ? base64.split(',')[1] : base64;
  const sizeInBytes = (base64Content.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  if (sizeInMB > maxMB) {
    throw new Error(`${fieldName}: taille maximale dépassée (${maxMB}MB)`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_AI_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_AI_API_KEY non configurée");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== AUTHENTIFICATION UTILISATEUR =====
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      
      try {
        // Créer un client avec le token de l'utilisateur pour vérifier son identité
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });
        
        // Utiliser getUser pour valider le JWT
        const { data: { user }, error: authError } = await userSupabase.auth.getUser();
        
        if (!authError && user) {
          userId = user.id;
          console.log("Authenticated user:", userId);
        } else {
          console.log("Auth error or no user:", authError?.message);
        }
      } catch (authException) {
        console.error("Auth exception:", authException);
      }
    }

    const body = await req.json();
    const {
      prompt,
      referenceImage: rawReferenceImage,
      logoImages,
      logoPositions,
      contentImage,
      secondaryImages, // Images secondaires avec instructions
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
      scenePreference, // Nouvelle prop pour les préférences de mise en scène YouTube
      domain, // Domaine passé par le client
    } = body;

    let referenceImage = rawReferenceImage as string | undefined;

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      throw new Error("Le prompt est requis");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Le prompt dépasse la limite de ${MAX_PROMPT_LENGTH} caractères`);
    }

    // Validate aspect ratio - accept standard formats or custom X:Y format
    const isValidAspectRatio = ALLOWED_ASPECT_RATIOS.includes(aspectRatio) || 
      /^\d+:\d+$/.test(aspectRatio);
    if (!isValidAspectRatio) {
      console.warn(`Non-standard aspect ratio: ${aspectRatio}, using 3:4 as fallback`);
      // Don't throw error, just log warning - we'll handle it gracefully
    }

    if (!ALLOWED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Résolution invalide. Résolutions acceptées: ${ALLOWED_RESOLUTIONS.join(', ')}`);
    }

    if (!ALLOWED_OUTPUT_FORMATS.includes(outputFormat)) {
      throw new Error(`Format de sortie invalide. Formats acceptés: ${ALLOWED_OUTPUT_FORMATS.join(', ')}`);
    }

    if (referenceImage && !isUrlLike(referenceImage)) {
      validateBase64Size(referenceImage, MAX_IMAGE_SIZE_MB, "Image de référence");
    }

    if (contentImage && !isUrlLike(contentImage)) {
      validateBase64Size(contentImage, MAX_IMAGE_SIZE_MB, "Image de contenu");
    }

    if (logoImages) {
      if (!Array.isArray(logoImages)) {
        throw new Error("logoImages doit être un tableau");
      }
      if (logoImages.length > MAX_LOGO_COUNT) {
        throw new Error(`Maximum ${MAX_LOGO_COUNT} logos autorisés`);
      }
      for (let i = 0; i < logoImages.length; i++) {
        if (!isUrlLike(logoImages[i])) {
          validateBase64Size(logoImages[i], MAX_IMAGE_SIZE_MB, `Logo ${i + 1}`);
        }
      }
    }

    // Validate secondary images if provided
    if (secondaryImages && Array.isArray(secondaryImages)) {
      console.log("Secondary images count:", secondaryImages.length);
      for (let i = 0; i < secondaryImages.length; i++) {
        const secImg = secondaryImages[i];
        if (secImg.imageUrl && !isUrlLike(secImg.imageUrl)) {
          validateBase64Size(secImg.imageUrl, MAX_IMAGE_SIZE_MB, `Image secondaire ${i + 1}`);
        }
      }
    }

    console.log("Request validated:");
    console.log("- Prompt length:", prompt.length);
    console.log("- Has reference image (raw):", !!rawReferenceImage);
    console.log("- Logo images count:", logoImages?.length || 0);
    console.log("- Has content image:", !!contentImage);
    console.log("- Secondary images count:", secondaryImages?.length || 0);

    const originHeader = req.headers.get("origin") || undefined;
    const refererHeader = req.headers.get("referer") || undefined;
    const requestOrigin = originHeader
      ? originHeader
      : refererHeader
        ? new URL(refererHeader).origin
        : undefined;
    
    console.log("Request origin:", requestOrigin);

    // ===== VÉRIFICATION DES CRÉDITS =====
    let creditCheckResult: any = null;
    
    if (userId) {
      console.log("Checking credits for user:", userId, "resolution:", resolution);
      
      const { data: creditCheck, error: creditError } = await supabase.rpc(
        "check_and_debit_credits",
        {
          p_user_id: userId,
          p_resolution: resolution,
          p_image_id: null,
        }
      );
      
      if (creditError) {
        console.error("Credit check error:", creditError);
        throw new Error("Erreur lors de la vérification des crédits");
      }
      
      console.log("Credit check result:", JSON.stringify(creditCheck));
      creditCheckResult = creditCheck;
      
      if (!creditCheck.success) {
        // Retourner une erreur 402 (Payment Required) avec les détails
        return new Response(
          JSON.stringify({
            success: false,
            error: creditCheck.error,
            message: creditCheck.message,
            remaining: creditCheck.remaining,
            needed: creditCheck.needed,
            is_free: creditCheck.is_free,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log(`Credits debited successfully. Remaining: ${creditCheck.remaining}, Add watermark: ${creditCheck.add_watermark}`);
    } else {
      // Utilisateur non authentifié - bloquer la génération
      console.log("Unauthenticated request - blocking generation");
      return new Response(
        JSON.stringify({
          success: false,
          error: "AUTHENTICATION_REQUIRED",
          message: "Veuillez vous connecter pour générer des images",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    // ===== FIN VÉRIFICATION DES CRÉDITS =====

    // Convertir les chemins relatifs de templates en URLs absolues
    // Cette conversion doit se faire APRÈS avoir extrait requestOrigin
    if (referenceImage && referenceImage.startsWith('/reference-templates/')) {
      if (requestOrigin) {
        referenceImage = `${requestOrigin}${referenceImage}`;
      } else {
        // Fallback vers le storage Supabase
        const storagePath = referenceImage.replace('/reference-templates/', '');
        referenceImage = `${supabaseUrl}/storage/v1/object/public/reference-templates/${storagePath}`;
      }
      console.log("Converted user reference template path to URL:", referenceImage);
    }

    // Helper pour convertir les chemins relatifs en URLs absolues
    // PRIORITÉ: Storage Supabase d'abord (plus fiable), puis app origin en fallback
    const resolveTemplateUrl = (imageUrl: string): string => {
      if (isHttpUrl(imageUrl)) {
        return imageUrl;
      }
      // Les templates peuvent être dans le storage Supabase ou dans public/ de l'app
      if (imageUrl.startsWith('/reference-templates/') || imageUrl.startsWith('/')) {
        const storagePath = imageUrl.replace('/reference-templates/', '').replace(/^\//, '');
        // Toujours essayer le storage Supabase en priorité (plus fiable que preview URL)
        const storageUrl = `${supabaseUrl}/storage/v1/object/public/reference-templates/${storagePath}`;
        console.log(`Resolved template path "${imageUrl}" to storage URL: ${storageUrl}`);
        return storageUrl;
      }
      return imageUrl;
    };

    // Helper pour télécharger une image avec fallback sur l'app origin
    const downloadImageWithFallback = async (
      primaryUrl: string,
      templatePath: string,
      prefix: string
    ): Promise<string> => {
      // Essayer l'URL primaire (storage)
      try {
        console.log(`Trying primary URL: ${primaryUrl}`);
        const response = await fetch(primaryUrl);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.toLowerCase().startsWith("image/")) {
            return await uploadFetchedImage(response, contentType, prefix);
          }
        }
      } catch (e) {
        console.log(`Primary URL failed: ${e}`);
      }

      // Fallback sur l'app origin
      if (requestOrigin && templatePath) {
        const fallbackUrl = `${requestOrigin}/reference-templates/${templatePath}`;
        console.log(`Trying fallback URL: ${fallbackUrl}`);
        try {
          const response = await fetch(fallbackUrl);
          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.toLowerCase().startsWith("image/")) {
              return await uploadFetchedImage(response, contentType, prefix);
            }
          }
        } catch (e) {
          console.log(`Fallback URL also failed: ${e}`);
        }
      }

      throw new Error(`Impossible de télécharger l'image template. Vérifiez que les templates sont bien migrés vers le storage.`);
    };

    // Helper pour upload une image fetchée
    const uploadFetchedImage = async (
      response: Response,
      contentType: string,
      prefix: string
    ): Promise<string> => {
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      let extension = 'jpg';
      if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('webp')) extension = 'webp';
      
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      
      const { error } = await supabase.storage
        .from('temp-images')
        .upload(fileName, bytes, {
          contentType: contentType,
          upsert: false,
        });
      
      if (error) {
        throw new Error(`Erreur upload: ${error.message}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('temp-images')
        .getPublicUrl(fileName);
      
      console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    };

    // ====== SÉLECTION INTELLIGENTE DE TEMPLATE SI AUCUNE IMAGE FOURNIE ======
    // Cette logique garantit qu'on utilise TOUJOURS un template de référence pour le design
    // NOUVEAU: On suit si le template a été auto-sélectionné pour le traiter comme un CLONAGE
    let isAutoSelectedTemplate = false;
    
    if (!referenceImage) {
      console.log("No reference image provided. Selecting best matching template...");
      console.log("🎯 Mode: Template auto-sélectionné sera traité comme CLONAGE");
      try {
        // Analyser le prompt pour détecter le domaine et les mots-clés
        const promptLower = prompt.toLowerCase();
        
        // Mapping domaine -> mots-clés associés
        const domainKeywords: Record<string, string[]> = {
          church: ["église", "culte", "prière", "louange", "adoration", "pasteur", "évêque", "prophète", "jeûne", "veillée", "crusade", "convention", "revival", "worship", "gospel"],
          event: ["événement", "concert", "soirée", "fête", "célébration", "show", "spectacle", "gala", "festival", "cérémonie", "inauguration"],
          formation: ["formation", "séminaire", "atelier", "workshop", "cours", "coaching", "masterclass", "webinaire", "conférence", "certification"],
          restaurant: ["restaurant", "menu", "cuisine", "chef", "manger", "plat", "repas", "déjeuner", "dîner", "buffet", "traiteur", "food"],
          fashion: ["mode", "fashion", "collection", "vêtement", "style", "couture", "défilé", "boutique", "prêt-à-porter"],
          music: ["musique", "music", "album", "single", "artiste", "chanteur", "chanteuse", "rap", "afrobeat", "concert"],
          sport: ["sport", "football", "basket", "match", "tournoi", "compétition", "athlète", "équipe", "marathon"],
          technology: ["technologie", "tech", "digital", "numérique", "application", "startup", "innovation", "hackathon"],
          health: ["santé", "health", "médical", "hôpital", "clinique", "consultation", "bien-être", "fitness", "pharmacie"],
          realestate: ["immobilier", "appartement", "maison", "terrain", "location", "vente", "agence"],
          ecommerce: ["vente", "promo", "soldes", "offre", "produit", "boutique", "shop", "achat", "livraison"],
          service: ["service", "professionnel", "design", "graphique", "marketing", "agence", "entreprise"],
          education: ["école", "université", "étudiant", "inscription", "académie", "formation", "diplôme"],
        };
        
        // Calculer un score pour chaque domaine
        const domainScores: Record<string, number> = {};
        for (const [domain, keywords] of Object.entries(domainKeywords)) {
          let score = 0;
          for (const keyword of keywords) {
            if (promptLower.includes(keyword)) {
              score += keyword.length > 5 ? 3 : 2; // Mots plus longs = plus de poids
            }
          }
          if (score > 0) {
            domainScores[domain] = score;
          }
        }
        
        // Trouver le meilleur domaine correspondant
        let bestDomain: string | null = null;
        let bestScore = 0;
        for (const [domain, score] of Object.entries(domainScores)) {
          if (score > bestScore) {
            bestScore = score;
            bestDomain = domain;
          }
        }
        
        console.log("Domain scores:", domainScores);
        console.log("Best matching domain:", bestDomain, "with score:", bestScore);
        
        // Récupérer les templates du domaine correspondant
        let tplCandidates: any[] = [];
        
        if (bestDomain) {
          const { data: domainTemplates } = await supabase
            .from("reference_templates")
            .select("image_url, domain, description, tags")
            .eq("domain", bestDomain)
            .limit(20);
          
          if (domainTemplates && domainTemplates.length > 0) {
            tplCandidates = domainTemplates;
            console.log(`Found ${tplCandidates.length} templates for domain: ${bestDomain}`);
          }
        }
        
        // Si pas de templates pour le domaine exact, chercher des domaines similaires
        if (tplCandidates.length === 0) {
          // Domaines de fallback par ordre de polyvalence (event et church sont très polyvalents)
          const fallbackOrder = ["event", "church", "formation", "service", "ecommerce"];
          
          for (const fallbackDomain of fallbackOrder) {
            const { data: fallbackTemplates } = await supabase
              .from("reference_templates")
              .select("image_url, domain, description, tags")
              .eq("domain", fallbackDomain)
              .limit(15);
            
            if (fallbackTemplates && fallbackTemplates.length > 0) {
              tplCandidates = [...tplCandidates, ...fallbackTemplates];
            }
          }
          
          console.log(`Fallback: gathered ${tplCandidates.length} templates from similar domains`);
        }
        
        // Sélectionner le meilleur template basé sur les mots-clés du prompt
        if (tplCandidates.length > 0) {
          // Scorer chaque template selon sa pertinence
          const scoredTemplates = tplCandidates.map(t => {
            let score = 0;
            const desc = (t.description || "").toLowerCase();
            const tags = (t.tags || []).map((tag: string) => tag.toLowerCase()).join(" ");
            const allText = desc + " " + tags;
            
            // Bonus si le template est du meilleur domaine
            if (t.domain === bestDomain) score += 10;
            
            // Bonus pour match de mots-clés
            const promptWords = promptLower.split(/\s+/).filter(w => w.length > 4);
            for (const word of promptWords) {
              if (allText.includes(word)) score += 2;
            }
            
            // Bonus pour templates avec descriptions (mieux documentés = meilleure qualité)
            if (t.description && t.description.length > 20) score += 3;
            
            return { template: t, score };
          });
          
          // Trier par score et prendre un des meilleurs (avec légère randomisation)
          scoredTemplates.sort((a, b) => b.score - a.score);
          const topN = Math.min(5, scoredTemplates.length);
          const topTemplates = scoredTemplates.slice(0, topN);
          const picked = topTemplates[Math.floor(Math.random() * topTemplates.length)].template;
          
          // Convertir le chemin relatif en URL absolue
          referenceImage = resolveTemplateUrl(picked.image_url);
          
          // NOUVEAU: Marquer que ce template a été auto-sélectionné
          // Il sera traité comme un CLONAGE, pas une création libre
          isAutoSelectedTemplate = true;
          
          console.log(`✅ Selected template from domain "${picked.domain}" with URL: ${referenceImage}`);
          console.log(`🎯 isAutoSelectedTemplate = true → Mode CLONAGE activé`);
        }
      } catch (e) {
        console.warn("Error selecting intelligent fallback:", e);
      }
    }

    const imageInputs: string[] = [];
    const tempFilePaths: string[] = [];

    // Variable pour suivre le chemin original du template (pour fallback)
    let templateOriginalPath: string | null = null;

    if (referenceImage) {
      // Vérifier si c'est un template (chemin relatif transformé en URL storage)
      const isTemplateFromDb = referenceImage.includes('/storage/v1/object/public/reference-templates/');
      
      if (isTemplateFromDb) {
        // Extraire le chemin du template pour le fallback
        const match = referenceImage.match(/reference-templates\/(.+)$/);
        if (match) {
          templateOriginalPath = match[1];
        }
        
        try {
          // Utiliser le helper avec fallback
          const refUrl = await downloadImageWithFallback(
            referenceImage,
            templateOriginalPath || "",
            "reference"
          );
          imageInputs.push(refUrl);
          tempFilePaths.push(refUrl);
        } catch (e) {
          console.error("Failed to download template with fallback:", e);
          // Continuer sans image de référence si échec
        }
      } else {
        // Image non-template: traitement normal
        const refUrl = await processImage(supabase, referenceImage, "reference", requestOrigin);
        imageInputs.push(refUrl);
        tempFilePaths.push(refUrl);
      }
    }

    if (logoImages && Array.isArray(logoImages)) {
      for (let i = 0; i < logoImages.length; i++) {
        try {
          const logoUrl = await processImage(supabase, logoImages[i], `logo_${i}`, requestOrigin);
          imageInputs.push(logoUrl);
          tempFilePaths.push(logoUrl);
        } catch (e) {
          console.error(`Error processing logo ${i}:`, e);
        }
      }
    }

    // Process secondary images
    let secondaryImageInstructions = "";
    if (secondaryImages && Array.isArray(secondaryImages) && secondaryImages.length > 0) {
      console.log(`Processing ${secondaryImages.length} secondary images...`);
      for (let i = 0; i < secondaryImages.length; i++) {
        const secImg = secondaryImages[i];
        if (secImg.imageUrl) {
          try {
            const secUrl = await processImage(supabase, secImg.imageUrl, `secondary_${i}`, requestOrigin);
            imageInputs.push(secUrl);
            tempFilePaths.push(secUrl);
            
            // Build instructions text for the prompt
            const instructions = secImg.instructions?.trim() || `Image secondaire ${i + 1}`;
            secondaryImageInstructions += `\n- Image secondaire #${i + 1}: ${instructions}`;
          } catch (e) {
            console.error(`Error processing secondary image ${i}:`, e);
          }
        }
      }
    }

    if (contentImage) {
      const contentUrl = await processImage(supabase, contentImage, "content", requestOrigin);
      imageInputs.push(contentUrl);
      tempFilePaths.push(contentUrl);
    }

    const logoPositionText = logoPositions?.length > 0 
      ? `LOGOS PLACEMENT: ${logoPositions.map((pos: string, i: number) => `Logo ${i+1} at ${pos}`).join(", ")}.`
      : "";
    
    // Détecter si c'est un mode clone (passé dans le body de la requête OU auto-sélectionné)
    // NOUVEAU: Les templates auto-sélectionnés sont AUSSI traités comme du clonage
    const isCloneMode = body.isCloneMode === true || isAutoSelectedTemplate;
    
    console.log(`🎯 Mode final: isCloneMode=${isCloneMode} (body=${body.isCloneMode}, autoSelected=${isAutoSelectedTemplate})`);
    
    // Construire le texte pour les préférences de mise en scène YouTube
    let scenePreferenceText = "";
    if (scenePreference && typeof scenePreference === "string" && scenePreference.trim().length > 0) {
      const cleanedScene = scenePreference.toLowerCase().trim();
      // Ignorer si l'utilisateur a tapé "passer" ou similaire
      if (!["passer", "skip", "non", "aucun", "rien"].includes(cleanedScene)) {
        scenePreferenceText = `\n\n=== MISE EN SCÈNE DEMANDÉE (YOUTUBE) ===\n`;
        scenePreferenceText += `Le sujet doit être montré : ${scenePreference}\n`;
        scenePreferenceText += `Intégrer cette mise en scène de manière naturelle et professionnelle.\n`;
        scenePreferenceText += `Les objets/logos mentionnés doivent être photoréalistes et bien intégrés.\n`;
        scenePreferenceText += `Le visage reste central et expressif, la mise en scène l'enrichit sans le masquer.`;
      }
    }
    
    // Build secondary images section for the prompt
    let secondaryImagesPromptSection = "";
    if (secondaryImageInstructions) {
      secondaryImagesPromptSection = `\n\n=== IMAGES SECONDAIRES À INTÉGRER ===`;
      secondaryImagesPromptSection += `\nIntégrer harmonieusement ces images supplémentaires sur l'affiche:`;
      secondaryImagesPromptSection += secondaryImageInstructions;
      secondaryImagesPromptSection += `\n⚠️ Positionner ces images de manière cohérente avec le design global.`;
    }
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt + (logoPositionText ? ` ${logoPositionText}` : "") + scenePreferenceText + secondaryImagesPromptSection,
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: logoImages && logoImages.length > 0,
      aspectRatio,
      isCloneMode,
    });

    console.log("Professional prompt built, length:", professionalPrompt.length);
    
    // Safety: truncate prompt if it exceeds API limit (keep user data at the end)
    const MAX_SAFE_PROMPT = 4500;
    let finalPrompt = professionalPrompt;
    if (finalPrompt.length > MAX_SAFE_PROMPT) {
      console.warn(`Prompt too long (${finalPrompt.length}), truncating to ${MAX_SAFE_PROMPT}`);
      finalPrompt = finalPrompt.substring(0, MAX_SAFE_PROMPT);
    }
    
    console.log("Final prompt length:", finalPrompt.length);

    const taskId = await createTask(
      KIE_API_KEY,
      finalPrompt,
      imageInputs,
      aspectRatio,
      resolution,
      outputFormat
    );

    const resultUrl = await pollForResult(KIE_API_KEY, taskId, resolution);

    if (tempFilePaths.length > 0) {
      await cleanupTempImages(supabase, tempFilePaths);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: resultUrl,
        taskId: taskId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Generate image error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
