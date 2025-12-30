import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";

interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  referenceImage?: string; // Base64 ou URL de l'image de référence (style)
  contentImage?: string;   // Base64 ou URL de l'image de contenu à intégrer
}

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

// Convertir une image base64 en URL publique via Supabase Storage
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

// Vérifier si c'est une URL ou du base64
function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

function buildProfessionalPrompt({
  userPrompt,
  hasReferenceImage,
  hasContentImage,
  aspectRatio,
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  aspectRatio: string;
}): string {
  const instructions: string[] = [];

  // Instructions de base pour une affiche professionnelle
  instructions.push("Create a professional advertising poster with the following specifications:");
  instructions.push(`- Format: ${aspectRatio} aspect ratio`);
  instructions.push("- High-quality graphic design suitable for print");
  instructions.push("- Clean, legible typography with clear visual hierarchy");
  instructions.push("- Modern, polished aesthetic");
  instructions.push("- African characters with authentic features when people are shown");
  
  // Instructions spécifiques si image de référence
  if (hasReferenceImage) {
    instructions.push("");
    instructions.push("CRITICAL - STYLE REFERENCE (First image provided):");
    instructions.push("- Reproduce EXACTLY the visual style, composition, and layout from the reference image");
    instructions.push("- Match the typography style, color scheme, and design elements");
    instructions.push("- Keep the same professional aesthetic and visual hierarchy");
    instructions.push("- Adapt the style to the new content while maintaining visual consistency");
  }
  
  // Instructions spécifiques si image de contenu
  if (hasContentImage) {
    instructions.push("");
    instructions.push("CRITICAL - CONTENT IMAGE (Second image provided):");
    instructions.push("- INTEGRATE the provided content image prominently in the poster");
    instructions.push("- The content image should be the main visual element");
    instructions.push("- Position it professionally within the layout");
    instructions.push("- Do NOT replace or generate a different image - USE the one provided");
  }
  
  // Instructions générales
  instructions.push("");
  instructions.push("IMPORTANT RULES:");
  instructions.push("- Do NOT display any color codes, hex values, or technical text");
  instructions.push("- All text on the poster must be from the user's specifications");
  instructions.push("- Apply colors harmoniously throughout the design");
  instructions.push("- Ensure professional print quality");
  
  // Ajouter le prompt utilisateur
  instructions.push("");
  instructions.push("USER SPECIFICATIONS:");
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
  console.log(`Polling for task ${taskId} result...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Poll attempt ${attempt}/${maxAttempts}`);

    const response = await fetch(`${KIE_API_BASE}/recordInfo?taskId=${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Poll error:", response.status, errorText);
      throw new Error(`Erreur polling: ${response.status}`);
    }

    const data = (await response.json()) as KieRecordInfoResponse;
    console.log(`Task state: ${data.data?.state}`);

    if (data.data?.state === "success") {
      // Extraire l'URL de l'image depuis resultJson
      if (data.data.resultJson) {
        try {
          const resultData = JSON.parse(data.data.resultJson);
          const imageUrl = resultData.resultUrls?.[0];
          if (imageUrl) {
            console.log("Image URL extracted:", imageUrl.substring(0, 100) + "...");
            return imageUrl;
          }
        } catch (e) {
          console.error("Error parsing resultJson:", e);
        }
      }
      throw new Error("Pas d'URL d'image dans la réponse");
    }

    if (data.data?.state === "fail") {
      console.error("Task failed:", data.data.failMsg);
      throw new Error(`Génération échouée: ${data.data.failMsg || data.data.failCode || "Erreur inconnue"}`);
    }

    // Task is still waiting, continue polling
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timeout: la génération a pris trop de temps");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!KIE_AI_API_KEY) {
      console.error("KIE_AI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Clé API Kie AI non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase credentials not configured");
      return new Response(JSON.stringify({ error: "Configuration Supabase manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Créer le client Supabase avec le service role pour l'upload
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      prompt,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
      referenceImage,
      contentImage,
    } = (await req.json()) as GenerateImageRequest;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasReferenceImage = !!referenceImage;
    const hasContentImage = !!contentImage;
    
    console.log("=== Generating with Kie AI Nano Banana Pro ===");
    console.log("Has reference image:", hasReferenceImage);
    console.log("Has content image:", hasContentImage);
    console.log("Aspect ratio:", aspectRatio);
    console.log("Resolution:", resolution);
    console.log("Output format:", outputFormat);

    // Convertir les images base64 en URLs si nécessaire
    const imageInputs: string[] = [];
    
    if (referenceImage) {
      if (isUrl(referenceImage)) {
        console.log("Reference image is already a URL");
        imageInputs.push(referenceImage);
      } else {
        // C'est du base64, uploader vers Storage
        const referenceUrl = await uploadBase64ToStorage(supabase, referenceImage, "reference");
        imageInputs.push(referenceUrl);
      }
    }
    
    if (contentImage) {
      if (isUrl(contentImage)) {
        console.log("Content image is already a URL");
        imageInputs.push(contentImage);
      } else {
        // C'est du base64, uploader vers Storage
        const contentUrl = await uploadBase64ToStorage(supabase, contentImage, "content");
        imageInputs.push(contentUrl);
      }
    }

    console.log("Final image URLs count:", imageInputs.length);

    // Construire le prompt professionnel
    const finalPrompt = buildProfessionalPrompt({
      userPrompt: prompt,
      hasReferenceImage,
      hasContentImage,
      aspectRatio,
    });
    
    console.log("Final prompt length:", finalPrompt.length);
    console.log("Prompt preview:", finalPrompt.substring(0, 500) + "...");

    // Étape 1: Créer la tâche
    const taskId = await createTask(
      KIE_AI_API_KEY,
      finalPrompt,
      imageInputs,
      aspectRatio,
      resolution,
      outputFormat
    );
    
    console.log("Task created:", taskId);

    // Étape 2: Attendre le résultat
    const imageUrl = await pollForResult(KIE_AI_API_KEY, taskId);
    
    console.log("Image generated successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        provider: "nano-banana-pro",
        taskId: taskId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erreur inconnue" 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
