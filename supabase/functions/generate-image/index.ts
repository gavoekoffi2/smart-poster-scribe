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
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  hasLogoImage: boolean;
  aspectRatio: string;
}): string {
  const instructions: string[] = [];

  // ====== RÔLE ET OBJECTIF PRINCIPAL ======
  instructions.push("=== RÔLE ===");
  instructions.push("Tu es un graphiste d'élite spécialisé dans la création d'affiches publicitaires professionnelles pour l'Afrique francophone.");
  instructions.push("");

  // ====== RÈGLE ABSOLUE SUR LE CONTENU ======
  instructions.push("=== RÈGLE CRITIQUE: RESPECT INTÉGRAL DU CONTENU UTILISATEUR ===");
  instructions.push("⚠️ OBLIGATION ABSOLUE: CHAQUE information fournie par l'utilisateur DOIT apparaître sur l'affiche finale.");
  instructions.push("- Titre/Thème: DOIT être affiché en grand et lisible");
  instructions.push("- Dates/Horaires: DOIVENT être clairement visibles");
  instructions.push("- Lieu/Adresse: DOIT apparaître intégralement");
  instructions.push("- Contact (téléphone, WhatsApp, email): DOIT être présent et lisible");
  instructions.push("- Prix/Tarifs: DOIVENT être affichés si fournis");
  instructions.push("- Noms d'orateurs/artistes: DOIVENT apparaître avec leurs titres");
  instructions.push("- Menu/Produits: DOIT être complet si fourni");
  instructions.push("");
  instructions.push("❌ INTERDIT: Omettre, tronquer ou résumer le contenu utilisateur");
  instructions.push("❌ INTERDIT: Inventer des informations non fournies (numéros, prix, dates)");
  instructions.push("❌ INTERDIT: Copier le texte/données du template de référence");
  instructions.push("");

  // ====== RÈGLE SUR LE DESIGN DU TEMPLATE ======
  if (hasReferenceImage) {
    instructions.push("=== RÈGLE CRITIQUE: RÉPLICATION EXACTE DU DESIGN DE RÉFÉRENCE ===");
    instructions.push("⚠️ L'image de RÉFÉRENCE (première image) est le MODÈLE MAÎTRE à reproduire FIDÈLEMENT.");
    instructions.push("");
    instructions.push("COPIER EXACTEMENT ET RIGOUREUSEMENT:");
    instructions.push("1. MISE EN PAGE IDENTIQUE: Respecter la grille, les zones, les marges, les espacements exacts");
    instructions.push("2. TYPOGRAPHIE IDENTIQUE: Mêmes styles de police, tailles, graisses, positionnement du texte");
    instructions.push("3. PALETTE COULEURS IDENTIQUE: Même schéma colorimétrique, dégradés, tons, superpositions");
    instructions.push("4. ÉLÉMENTS GRAPHIQUES IDENTIQUES: Mêmes formes décoratives, lignes, cadres, motifs, effets visuels");
    instructions.push("5. AMBIANCE IDENTIQUE: Même mood, éclairage, énergie visuelle, atmosphère générale");
    instructions.push("6. STRUCTURE IDENTIQUE: Même organisation des éléments, même hiérarchie visuelle");
    instructions.push("");
    instructions.push("L'AFFICHE FINALE DOIT RESSEMBLER AU TEMPLATE comme si c'était la même famille de design.");
    instructions.push("Le spectateur doit reconnaître immédiatement le style du template dans l'affiche finale.");
    instructions.push("");
    instructions.push("NE JAMAIS COPIER DU TEMPLATE:");
    instructions.push("- Les textes, prix, numéros de téléphone, dates (utiliser UNIQUEMENT les données utilisateur)");
    instructions.push("- Les visages/personnages existants (générer de NOUVEAUX personnages africains)");
    instructions.push("- Les logos d'autres entreprises");
    instructions.push("");
  }

  // ====== SPÉCIFICATIONS TECHNIQUES ======
  instructions.push("=== SPÉCIFICATIONS TECHNIQUES ===");
  instructions.push(`- Format: ${aspectRatio}`);
  instructions.push("- Résolution: Haute qualité, détails nets, sans artefacts");
  instructions.push("- Typographie: Alignement parfait, kerning cohérent, hiérarchie claire");
  instructions.push("- Pas de filigrane, pas de mockup, pas de cadre");
  instructions.push("");

  // ====== HIÉRARCHIE VISUELLE ======
  instructions.push("=== HIÉRARCHIE VISUELLE OBLIGATOIRE ===");
  instructions.push("1. TITRE: Le plus grand et visible (zone supérieure ou centrale)");
  instructions.push("2. DATE/HEURE: Visible immédiatement après le titre");
  instructions.push("3. LIEU: Clairement positionné");
  instructions.push("4. VISUELS: Photo/personnage intégré harmonieusement");
  instructions.push("5. INFORMATIONS: Contact, prix, détails en zone dédiée (souvent bas de l'affiche)");
  instructions.push("6. LOGO: Positionné selon les instructions (par défaut: coin inférieur)");
  instructions.push("");

  if (hasLogoImage) {
    instructions.push("=== RÈGLE CRITIQUE: LOGO CLIENT ===");
    instructions.push("⚠️ OBLIGATION ABSOLUE: Le logo fourni par le client DOIT être reproduit À L'IDENTIQUE.");
    instructions.push("- UTILISER l'image exacte du logo fourni, sans aucune modification");
    instructions.push("- NE JAMAIS créer, dessiner ou inventer un nouveau logo");
    instructions.push("- NE JAMAIS modifier les couleurs, formes ou texte du logo original");
    instructions.push("- Positionner le logo de manière visible et professionnelle");
    instructions.push("- Conserver les proportions exactes du logo (pas d'étirement/compression)");
    instructions.push("- Le logo doit être net, lisible et bien intégré au design");
    instructions.push("");
  }

  if (hasContentImage) {
    instructions.push("PHOTO/VISUEL PRINCIPAL: Utiliser l'image de contenu comme élément visuel central.");
    instructions.push("");
  }

  // ====== QUALITÉ AFRICAINE ======
  instructions.push("=== STYLE AFRICAIN ===");
  instructions.push("- Personnages: Personnes africaines authentiques avec traits réalistes");
  instructions.push("- Couleurs: Vibrantes et chaleureuses, adaptées au contexte africain");
  instructions.push("- Texte: Français ou langue locale selon le contexte");
  instructions.push("");

  // ====== RÈGLES DE DESIGN PROFESSIONNEL (TOUJOURS APPLIQUÉES) ======
  instructions.push("=== DESIGN PROFESSIONNEL OBLIGATOIRE ===");
  instructions.push("⚠️ L'affiche DOIT avoir un design professionnel de haute qualité, JAMAIS basique ou amateur.");
  instructions.push("");
  instructions.push("ÉLÉMENTS DESIGN OBLIGATOIRES:");
  instructions.push("1. COMPOSITION: Utiliser la règle des tiers, créer une hiérarchie visuelle claire");
  instructions.push("2. TYPOGRAPHIE: Combiner 2-3 polices maximum avec contraste (titre display, texte lisible)");
  instructions.push("3. COULEURS: Palette harmonieuse avec couleur dominante, secondaire et accent");
  instructions.push("4. ÉLÉMENTS GRAPHIQUES: Ajouter formes décoratives, lignes, cadres, effets (dégradés, ombres, reflets)");
  instructions.push("5. TEXTURES & EFFETS: Dégradés subtils, superpositions, jeux de lumière");
  instructions.push("6. ESPACEMENT: Marges cohérentes, respiration visuelle, pas de surcharge");
  instructions.push("7. FINITION: Qualité imprimerie, haute résolution, alignements parfaits");
  instructions.push("");
  instructions.push("STYLES INSPIRANTS:");
  instructions.push("- Affiches de concert/festivals modernes avec effets lumineux");
  instructions.push("- Designs église africains avec éléments dorés et atmosphère majestueuse");
  instructions.push("- Publicités professionnelles avec mise en page dynamique");
  instructions.push("- Flyers événementiels avec photos intégrées et typographie impactante");
  instructions.push("");
  instructions.push("❌ INTERDIT: Designs plats/basiques, texte sur fond uni, absence de décoration graphique");
  instructions.push("");

  // ====== CONTENU UTILISATEUR ======
  instructions.push("=== CONTENU UTILISATEUR À AFFICHER INTÉGRALEMENT ===");
  instructions.push(userPrompt);
  instructions.push("=== FIN CONTENU UTILISATEUR ===");
  instructions.push("");
  instructions.push("RAPPEL FINAL: Chaque élément ci-dessus DOIT apparaître sur l'affiche. Vérifie avant de finaliser.");

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
    // Les templates sont stockés dans le dossier public/ de l'app, donc on utilise l'origin du client
    const resolveTemplateUrl = (imageUrl: string): string => {
      if (isHttpUrl(imageUrl)) {
        return imageUrl;
      }
      // Les templates sont dans public/reference-templates/
      // On doit utiliser l'origin de l'app cliente pour y accéder
      if (imageUrl.startsWith('/reference-templates/') || imageUrl.startsWith('/')) {
        if (requestOrigin) {
          const fullUrl = `${requestOrigin}${imageUrl}`;
          console.log(`Resolved template path "${imageUrl}" to: ${fullUrl}`);
          return fullUrl;
        }
        // Fallback: essayer le storage Supabase (au cas où les images y sont migrées)
        const storagePath = imageUrl.replace('/reference-templates/', '').replace(/^\//, '');
        const storageUrl = `${supabaseUrl}/storage/v1/object/public/reference-templates/${storagePath}`;
        console.log(`No origin available, trying storage URL: ${storageUrl}`);
        return storageUrl;
      }
      return imageUrl;
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

    if (referenceImage) {
      const refUrl = await processImage(supabase, referenceImage, "reference", requestOrigin);
      imageInputs.push(refUrl);
      tempFilePaths.push(refUrl);
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
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt + (logoPositionText ? ` ${logoPositionText}` : ""),
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: logoImages && logoImages.length > 0,
      aspectRatio,
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
