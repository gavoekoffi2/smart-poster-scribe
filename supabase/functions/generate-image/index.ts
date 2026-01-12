import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const instructions: string[] = [];

  // ====== RÔLE ET OBJECTIF PRINCIPAL ======
  instructions.push("=== RÔLE ===");
  if (isCloneMode) {
    instructions.push("Tu es un graphiste d'élite spécialisé dans le CLONAGE EXACT d'affiches publicitaires. Ton travail: reproduire FIDÈLEMENT le design du template en remplaçant UNIQUEMENT le contenu textuel.");
  } else {
    instructions.push("Tu es un graphiste d'élite spécialisé dans la création d'affiches publicitaires professionnelles pour l'Afrique francophone.");
  }
  instructions.push("");

  // ====== RÈGLE ABSOLUE: MODE CLONE ======
  if (isCloneMode && hasReferenceImage) {
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  🎯 MODE CLONAGE ACTIF - RÉPLICATION PIXEL-PERFECT DU DESIGN          ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    instructions.push("⚠️ RÈGLE ABSOLUE: Cette affiche est un CLONE. Tu dois reproduire EXACTEMENT le design du template.");
    instructions.push("");
    instructions.push("CE QUE TU DOIS REPRODUIRE À L'IDENTIQUE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("1. MISE EN PAGE IDENTIQUE PIXEL PAR PIXEL:");
    instructions.push("   - Même disposition exacte des éléments");
    instructions.push("   - Mêmes marges, espacements, alignements");
    instructions.push("   - Même grille de composition");
    instructions.push("");
    instructions.push("2. TYPOGRAPHIE IDENTIQUE:");
    instructions.push("   - Même style de police (ou très similaire)");
    instructions.push("   - Mêmes tailles relatives (titre grand, détails petits)");
    instructions.push("   - Mêmes positions du texte");
    instructions.push("   - Mêmes effets (ombres, contours, dégradés sur texte)");
    instructions.push("");
    instructions.push("3. PALETTE COULEURS IDENTIQUE:");
    instructions.push("   - Exactement les mêmes couleurs");
    instructions.push("   - Mêmes dégradés");
    instructions.push("   - Mêmes zones colorées");
    instructions.push("");
    instructions.push("4. ÉLÉMENTS GRAPHIQUES IDENTIQUES:");
    instructions.push("   - Mêmes formes décoratives (cercles, lignes, cadres)");
    instructions.push("   - Mêmes motifs et textures");
    instructions.push("   - Mêmes effets lumineux (flares, halos, reflets)");
    instructions.push("   - Même fond (dégradé, image, couleur unie)");
    instructions.push("");
    instructions.push("5. STRUCTURE IDENTIQUE:");
    instructions.push("   - Si le template a un personnage à gauche → personnage à gauche");
    instructions.push("   - Si le template a un bandeau en bas → bandeau en bas");
    instructions.push("   - Si le template a un cadre doré → cadre doré");
    instructions.push("");
    instructions.push("CE QUE TU REMPLACES:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━");
    instructions.push("- UNIQUEMENT les textes avec le contenu utilisateur fourni ci-dessous");
    instructions.push("- Les visages/personnages: générer de NOUVEAUX personnages africains");
    instructions.push("- Le logo si l'utilisateur en fournit un");
    instructions.push("");
    instructions.push("CE QUE TU NE FAIS JAMAIS:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("❌ INVENTER du contenu non fourni (pas de numéros, dates, prix inventés)");
    instructions.push("❌ MODIFIER le design (pas de nouvelles couleurs, nouvelles formes)");
    instructions.push("❌ SIMPLIFIER le design (garder TOUS les éléments décoratifs)");
    instructions.push("❌ GARDER les textes du template original");
    instructions.push("❌ LAISSER des zones vides si l'utilisateur n'a pas fourni l'info");
    instructions.push("");
    instructions.push("L'AFFICHE FINALE DOIT ÊTRE INDISCERNABLE DU TEMPLATE");
    instructions.push("(seul le contenu textuel change, le design reste IDENTIQUE)");
    instructions.push("");
  } else if (hasReferenceImage) {
    // Mode normal avec référence (pas un clone strict)
    instructions.push("=== RÈGLE: INSPIRATION DU DESIGN DE RÉFÉRENCE ===");
    instructions.push("⚠️ L'image de RÉFÉRENCE est le MODÈLE à reproduire fidèlement.");
    instructions.push("");
    instructions.push("REPRODUIRE:");
    instructions.push("1. MISE EN PAGE: Respecter la grille, zones, marges, espacements");
    instructions.push("2. TYPOGRAPHIE: Mêmes styles de police, tailles, positionnement");
    instructions.push("3. PALETTE COULEURS: Même schéma colorimétrique, dégradés, tons");
    instructions.push("4. ÉLÉMENTS GRAPHIQUES: Mêmes formes décoratives, lignes, cadres, effets");
    instructions.push("5. AMBIANCE: Même mood, éclairage, atmosphère générale");
    instructions.push("");
    instructions.push("NE JAMAIS COPIER DU TEMPLATE:");
    instructions.push("- Les textes, prix, numéros, dates (utiliser UNIQUEMENT données utilisateur)");
    instructions.push("- Les visages/personnages (générer de NOUVEAUX personnages africains)");
    instructions.push("");
  }

  // ====== RÈGLE SUR LE CONTENU UTILISATEUR ======
  instructions.push("=== CONTENU OBLIGATOIRE À AFFICHER ===");
  instructions.push("⚠️ CHAQUE information fournie par l'utilisateur DOIT apparaître:");
  instructions.push("- Titre → affiché en grand et lisible");
  instructions.push("- Dates/Horaires → clairement visibles");
  instructions.push("- Lieu/Adresse → intégralement présent");
  instructions.push("- Contact → présent et lisible");
  instructions.push("- Prix → affichés si fournis");
  instructions.push("- Orateurs/Artistes → avec leurs titres");
  instructions.push("");
  instructions.push("❌ INTERDIT: Omettre, tronquer, résumer le contenu utilisateur");
  instructions.push("❌ INTERDIT: Inventer des informations non fournies");
  instructions.push("");

  // ====== SPÉCIFICATIONS TECHNIQUES ======
  instructions.push("=== SPÉCIFICATIONS TECHNIQUES ===");
  instructions.push(`- Format: ${aspectRatio}`);
  instructions.push("- Résolution: Haute qualité, détails nets");
  instructions.push("- Typographie: Alignement parfait, hiérarchie claire");
  instructions.push("- Pas de filigrane, mockup, ou cadre");
  instructions.push("");

  if (hasLogoImage) {
    instructions.push("=== LOGO CLIENT ===");
    instructions.push("⚠️ Reproduire le logo À L'IDENTIQUE, sans modification.");
    instructions.push("");
  }

  if (hasContentImage) {
    instructions.push("PHOTO PRINCIPALE: Utiliser l'image de contenu fournie comme visuel central.");
    instructions.push("");
  }

  // ====== QUALITÉ AFRICAINE ======
  instructions.push("=== STYLE ===");
  instructions.push("- Personnages: Africains authentiques avec traits réalistes");
  instructions.push("- Couleurs: Vibrantes et chaleureuses");
  instructions.push("- Texte: Français");
  instructions.push("");

  // ====== CONTENU UTILISATEUR ======
  instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
  instructions.push("║  CONTENU UTILISATEUR À AFFICHER (REMPLACER LE TEXTE DU TEMPLATE)      ║");
  instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
  instructions.push("");
  instructions.push(userPrompt);
  instructions.push("");
  instructions.push("═══════════════════════════════════════════════════════════════════════");
  instructions.push("");
  if (isCloneMode) {
    instructions.push("🎯 RAPPEL CLONAGE: Design IDENTIQUE au template, seul le texte change avec le contenu ci-dessus.");
  } else {
    instructions.push("RAPPEL: Chaque élément ci-dessus DOIT apparaître sur l'affiche.");
  }

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
  console.log("Image inputs count:", imageInputs.length);

  const response = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: prompt,
        image_input: imageInputs,
        aspect_ratio: aspectRatio,
        resolution: resolution,
        output_format: outputFormat,
      },
    }),
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
    
    throw new Error(`Erreur création tâche: ${response.status}`);
  }

  const data = (await response.json()) as KieCreateTaskResponse;
  console.log("Create task response:", JSON.stringify(data));

  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Erreur API Kie: ${data.msg || "Pas de taskId retourné"}`);
  }

  return data.data.taskId;
}

async function pollForResult(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 90,
  intervalMs: number = 3000
): Promise<string> {
  console.log(`Polling for result, taskId: ${taskId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Poll attempt ${attempt + 1}/${maxAttempts}`);

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
      console.error("Poll error:", response.status);
      throw new Error(`Erreur récupération statut: ${response.status}`);
    }

    const data = (await response.json()) as KieRecordInfoResponse;
    console.log(`Poll response state: ${data.data?.state}`);

    if (data.data?.state === "success" && data.data.resultJson) {
      const result = JSON.parse(data.data.resultJson) as KieResultJson;
      if (result.resultUrls && result.resultUrls.length > 0) {
        console.log("Generation successful, URL:", result.resultUrls[0]);
        return result.resultUrls[0];
      }
      throw new Error("Pas d'URL dans le résultat");
    }

    if (data.data?.state === "fail") {
      throw new Error(
        `Génération échouée: ${data.data.failMsg || data.data.failCode || "Erreur inconnue"}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Délai d'attente dépassé pour la génération");
}

const MAX_PROMPT_LENGTH = 5000;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_LOGO_COUNT = 5;
const ALLOWED_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16'];
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      prompt,
      referenceImage: rawReferenceImage,
      logoImages,
      logoPositions,
      contentImage,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
    } = body;

    let referenceImage = rawReferenceImage as string | undefined;

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      throw new Error("Le prompt est requis");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Le prompt dépasse la limite de ${MAX_PROMPT_LENGTH} caractères`);
    }

    if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
      throw new Error(`Format invalide. Formats acceptés: ${ALLOWED_ASPECT_RATIOS.join(', ')}`);
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

    console.log("Request validated:");
    console.log("- Prompt length:", prompt.length);
    console.log("- Has reference image (raw):", !!rawReferenceImage);
    console.log("- Logo images count:", logoImages?.length || 0);
    console.log("- Has content image:", !!contentImage);

    const originHeader = req.headers.get("origin") || undefined;
    const refererHeader = req.headers.get("referer") || undefined;
    const requestOrigin = originHeader
      ? originHeader
      : refererHeader
        ? new URL(refererHeader).origin
        : undefined;
    
    console.log("Request origin:", requestOrigin);

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
    if (!referenceImage) {
      console.log("No reference image provided. Selecting best matching template...");
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
          console.log(`Selected template from domain "${picked.domain}" with URL: ${referenceImage}`);
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

    if (contentImage) {
      const contentUrl = await processImage(supabase, contentImage, "content", requestOrigin);
      imageInputs.push(contentUrl);
      tempFilePaths.push(contentUrl);
    }

    const logoPositionText = logoPositions?.length > 0 
      ? `LOGOS PLACEMENT: ${logoPositions.map((pos: string, i: number) => `Logo ${i+1} at ${pos}`).join(", ")}.`
      : "";
    
    // Détecter si c'est un mode clone (passé dans le body de la requête)
    const isCloneMode = body.isCloneMode === true;
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt + (logoPositionText ? ` ${logoPositionText}` : ""),
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: logoImages && logoImages.length > 0,
      aspectRatio,
      isCloneMode,
    });

    console.log("Professional prompt built, length:", professionalPrompt.length);

    const taskId = await createTask(
      KIE_API_KEY,
      professionalPrompt,
      imageInputs,
      aspectRatio,
      resolution,
      outputFormat
    );

    const resultUrl = await pollForResult(KIE_API_KEY, taskId);

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
