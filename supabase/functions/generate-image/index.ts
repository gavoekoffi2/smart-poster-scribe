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

// Fonction pour uploader une image base64 vers Supabase Storage
async function uploadBase64ToStorage(
  supabase: any,
  base64Data: string,
  prefix: string
): Promise<string> {
  console.log(`Uploading ${prefix} image to storage...`);
  
  // Extraire le type MIME et les données
  const matches = base64Data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!matches) {
    throw new Error(`Format d'image invalide pour ${prefix}. Formats acceptés: jpeg, png, webp`);
  }
  
  const mimeType = matches[1].toLowerCase();
  const base64Content = matches[2];
  
  // Convertir base64 en Uint8Array
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Générer un nom de fichier unique
  const extension = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg' : mimeType;
  const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  
  // Upload vers Supabase Storage
  const { data, error } = await supabase.storage
    .from('temp-images')
    .upload(fileName, bytes, {
      contentType: `image/${mimeType}`,
      upsert: false,
    });
  
  if (error) {
    console.error(`Storage upload error for ${prefix}:`, error);
    throw new Error(`Erreur upload ${prefix}: ${error.message}`);
  }
  
  // Obtenir l'URL publique
  const { data: urlData } = supabase.storage
    .from('temp-images')
    .getPublicUrl(fileName);
  
  console.log(`${prefix} uploaded successfully:`, urlData.publicUrl);
  return urlData.publicUrl;
}

// Fonction pour supprimer les images temporaires après utilisation
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

  // Base instructions
  instructions.push(
    "You are an elite graphic designer. Produce a PRINT-READY advertising poster with agency-level polish."
  );
  instructions.push(
    "The poster must look professionally art-directed: clean grid, deliberate spacing, strong hierarchy, premium finishing."
  );
  instructions.push("");

  instructions.push("OUTPUT SPECS:");
  instructions.push(`- Aspect ratio: ${aspectRatio}`);
  instructions.push("- High resolution, crisp details, no artifacts");
  instructions.push("- Perfect typography: consistent alignment, kerning, and hierarchy");
  instructions.push("- No watermarks, no mockups, no frames");

  // Make sure model doesn't invent text beyond user specs
  instructions.push("");
  instructions.push("TEXT RULES:");
  instructions.push(
    "- The user specifications may be in French. Keep ALL required poster text EXACTLY as provided (do not translate names/titles unless explicitly asked)."
  );
  instructions.push(
    "- Do NOT invent extra phone numbers, addresses, prices, dates, or claims."
  );

  // Reference image guidance - ULTRA STRICT DESIGN MATCHING
  if (hasReferenceImage) {
    instructions.push("");
    instructions.push("=== CRITICAL: REFERENCE IMAGE DESIGN REPLICATION ===");
    instructions.push(
      "The FIRST image provided is the DESIGN REFERENCE. You MUST replicate its design with MAXIMUM FIDELITY."
    );
    instructions.push("");
    instructions.push("MANDATORY DESIGN ELEMENTS TO COPY EXACTLY:");
    instructions.push("1. LAYOUT STRUCTURE: Copy the exact grid system, margins, content placement, and spacing proportions.");
    instructions.push("2. TYPOGRAPHY STYLE: Match font categories (serif/sans-serif/display), weight hierarchy, text sizes ratios, and alignment patterns.");
    instructions.push("3. COLOR TREATMENT: Replicate the color scheme, gradients, overlays, and color distribution pattern.");
    instructions.push("4. GRAPHIC ELEMENTS: Copy decorative shapes, lines, frames, icons style, and ornamental patterns.");
    instructions.push("5. BACKGROUND TREATMENT: Match solid/gradient/texture/photo treatment exactly.");
    instructions.push("6. VISUAL ATMOSPHERE: Reproduce the mood, era/decade aesthetic, lighting style, and overall vibe.");
    instructions.push("7. COMPOSITION BALANCE: Match the visual weight distribution, white space usage, and focal points.");
    instructions.push("8. FINISHING DETAILS: Copy shadows, glows, textures, grain, and post-processing effects.");
    instructions.push("");
    instructions.push("The result should look like it was designed by the SAME DESIGNER using the SAME DESIGN TEMPLATE.");
    instructions.push("Someone seeing both posters should immediately recognize they share the same design language.");
    instructions.push("");
    instructions.push("ORIGINALITY RULES:");
    instructions.push("- Do NOT copy any text, brand names, logos, or faces from the reference.");
    instructions.push("- Create NEW content following the EXACT SAME visual style.");
    instructions.push("- The design system must match, the content must be original.");
  }

  // Logo image guidance
  if (hasLogoImage) {
    instructions.push("");
    instructions.push("LOGO INTEGRATION (Logo image provided):");
    instructions.push(
      "- A logo image is provided. Integrate it prominently and professionally into the poster design."
    );
    instructions.push(
      "- Place the logo in a strategic position (header, corner, or center based on design)."
    );
    instructions.push(
      "- Preserve the logo's original appearance - do not distort, recolor, or modify it."
    );
    instructions.push(
      "- Ensure the logo has proper contrast against its background for visibility."
    );
  }

  // Content image guidance
  if (hasContentImage) {
    instructions.push("");
    instructions.push("MAIN VISUAL (Content image provided):");
    instructions.push(
      "- Integrate the provided content image as the PRIMARY visual element and design the layout around it."
    );
    instructions.push(
      "- Keep the content image recognizable and prominent; do not replace it with a different generated subject."
    );
  }

  // General quality constraints
  instructions.push("");
  instructions.push("QUALITY CHECKLIST:");
  instructions.push("- Strong visual hierarchy (headline > subhead > details)");
  instructions.push("- Balanced margins and whitespace");
  instructions.push("- Cohesive color harmony and contrast");
  instructions.push("- Professional finishing: subtle shadows/overlays only when needed");
  instructions.push("");

  // User specs
  instructions.push("=== USER SPECIFICATIONS (ONLY source of facts & text) ===");
  instructions.push(userPrompt);
  instructions.push("=== END USER SPECIFICATIONS ===");

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
  console.log("Creating task with Kie AI Nano Banana Pro...");
  console.log("Image inputs count:", imageInputs.length);
  console.log("Aspect ratio:", aspectRatio);
  console.log("Resolution:", resolution);
  console.log("Output format:", outputFormat);

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
      throw new Error("Clé API invalide");
    }
    if (response.status === 402) {
      throw new Error("Solde insuffisant sur le compte Kie AI");
    }
    if (response.status === 429) {
      throw new Error("Limite de requêtes atteinte. Réessayez plus tard.");
    }
    
    throw new Error(`Erreur création tâche: ${response.status} - ${errorText}`);
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
  maxAttempts: number = 60,
  intervalMs: number = 2000
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

    // Attendre avant le prochain polling
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Délai d'attente dépassé pour la génération");
}

// ============ INPUT VALIDATION CONSTANTS ============
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
  // Remove data URL prefix if present
  const base64Content = base64.includes(',') ? base64.split(',')[1] : base64;
  const sizeInBytes = (base64Content.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  if (sizeInMB > maxMB) {
    throw new Error(`${fieldName}: taille maximale dépassée (${maxMB}MB)`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_AI_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_AI_API_KEY non configurée");
    }

    // Initialiser le client Supabase pour le storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      prompt,
      referenceImage,
      logoImages,
      logoPositions,
      contentImage,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
    } = body;

    // ============ INPUT VALIDATION ============
    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      throw new Error("Le prompt est requis et doit être une chaîne de caractères");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Le prompt dépasse la limite de ${MAX_PROMPT_LENGTH} caractères`);
    }

    // Validate aspect ratio
    if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
      throw new Error(`Format invalide. Formats acceptés: ${ALLOWED_ASPECT_RATIOS.join(', ')}`);
    }

    // Validate resolution
    if (!ALLOWED_RESOLUTIONS.includes(resolution)) {
      throw new Error(`Résolution invalide. Résolutions acceptées: ${ALLOWED_RESOLUTIONS.join(', ')}`);
    }

    // Validate output format
    if (!ALLOWED_OUTPUT_FORMATS.includes(outputFormat)) {
      throw new Error(`Format de sortie invalide. Formats acceptés: ${ALLOWED_OUTPUT_FORMATS.join(', ')}`);
    }

    // Validate reference image size
    if (referenceImage) {
      validateBase64Size(referenceImage, MAX_IMAGE_SIZE_MB, "Image de référence");
    }

    // Validate content image size
    if (contentImage) {
      validateBase64Size(contentImage, MAX_IMAGE_SIZE_MB, "Image de contenu");
    }

    // Validate logo images
    if (logoImages) {
      if (!Array.isArray(logoImages)) {
        throw new Error("logoImages doit être un tableau");
      }
      if (logoImages.length > MAX_LOGO_COUNT) {
        throw new Error(`Maximum ${MAX_LOGO_COUNT} logos autorisés`);
      }
      for (let i = 0; i < logoImages.length; i++) {
        validateBase64Size(logoImages[i], MAX_IMAGE_SIZE_MB, `Logo ${i + 1}`);
      }
    }

    // Validate logo positions
    if (logoPositions && !Array.isArray(logoPositions)) {
      throw new Error("logoPositions doit être un tableau");
    }

    console.log("Request validated:");
    console.log("- Prompt length:", prompt.length);
    console.log("- Has reference image:", !!referenceImage);
    console.log("- Logo images count:", logoImages?.length || 0);
    console.log("- Logo positions:", logoPositions);
    console.log("- Has content image:", !!contentImage);
    console.log("- Aspect ratio:", aspectRatio);
    console.log("- Resolution:", resolution);

    // Préparer les URLs des images
    const imageInputs: string[] = [];
    const tempFilePaths: string[] = [];

    // Upload de l'image de référence si présente (en premier pour le style)
    if (referenceImage) {
      try {
        const refUrl = await uploadBase64ToStorage(supabase, referenceImage, 'reference');
        imageInputs.push(refUrl);
        tempFilePaths.push(refUrl);
      } catch (e) {
        console.error("Error uploading reference image:", e);
        throw new Error(`Erreur avec l'image de référence: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Upload des logos si présents
    const uploadedLogoUrls: string[] = [];
    if (logoImages && Array.isArray(logoImages)) {
      for (let i = 0; i < logoImages.length; i++) {
        try {
          const logoUrl = await uploadBase64ToStorage(supabase, logoImages[i], `logo_${i}`);
          imageInputs.push(logoUrl);
          tempFilePaths.push(logoUrl);
          uploadedLogoUrls.push(logoUrl);
        } catch (e) {
          console.error(`Error uploading logo ${i}:`, e);
        }
      }
    }

    // Upload de l'image de contenu si présente
    if (contentImage) {
      try {
        const contentUrl = await uploadBase64ToStorage(supabase, contentImage, 'content');
        imageInputs.push(contentUrl);
        tempFilePaths.push(contentUrl);
      } catch (e) {
        console.error("Error uploading content image:", e);
        throw new Error(`Erreur avec l'image de contenu: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Construire le prompt professionnel avec positions des logos
    const logoPositionText = logoPositions?.length > 0 
      ? `LOGOS PLACEMENT: ${logoPositions.map((pos: string, i: number) => `Logo ${i+1} at ${pos}`).join(", ")}.`
      : "";
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt + (logoPositionText ? ` ${logoPositionText}` : ""),
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: uploadedLogoUrls.length > 0,
      aspectRatio,
    });

    console.log("Professional prompt built, length:", professionalPrompt.length);

    // Créer la tâche
    const taskId = await createTask(
      KIE_API_KEY,
      professionalPrompt,
      imageInputs,
      aspectRatio,
      resolution,
      outputFormat
    );

    // Attendre le résultat
    const resultUrl = await pollForResult(KIE_API_KEY, taskId);

    // Nettoyer les images temporaires
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
