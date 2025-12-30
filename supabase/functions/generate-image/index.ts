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
  aspectRatio,
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  aspectRatio: string;
}): string {
  const instructions: string[] = [];

  // Instructions de base pour une affiche professionnelle
  instructions.push("You are an expert graphic designer. Create a UNIQUE, ORIGINAL and PROFESSIONAL advertising poster.");
  instructions.push("");
  instructions.push("SPECIFICATIONS:");
  instructions.push(`- Format: ${aspectRatio} aspect ratio`);
  instructions.push("- Ultra high-quality print-ready design");
  instructions.push("- Modern, sophisticated and premium aesthetic");
  instructions.push("- Professional typography with perfect visual hierarchy");
  instructions.push("- When depicting people: use authentic African characters with natural features");
  
  // Instructions spécifiques si image de référence - S'INSPIRER SEULEMENT DU STYLE
  if (hasReferenceImage) {
    instructions.push("");
    instructions.push("STYLE INSPIRATION (First image provided):");
    instructions.push("- ANALYZE the reference image to understand its design principles, visual style, and aesthetic approach");
    instructions.push("- GET INSPIRED by the layout structure, typography choices, and color harmony");
    instructions.push("- DO NOT COPY the reference image content, text, or specific elements");
    instructions.push("- DO NOT USE any information, text, or details FROM the reference image");
    instructions.push("- CREATE something COMPLETELY NEW and MORE ORIGINAL based on the user's specifications");
    instructions.push("- ELEVATE the design to be MORE PROFESSIONAL and MORE POLISHED than the reference");
    instructions.push("- Use the reference ONLY as stylistic inspiration, not as a template to copy");
  }
  
  // Instructions spécifiques si image de contenu
  if (hasContentImage) {
    instructions.push("");
    instructions.push("MAIN VISUAL ELEMENT (Second image provided):");
    instructions.push("- INTEGRATE the provided content image as the PRIMARY visual element of the poster");
    instructions.push("- Position it prominently and professionally within the composition");
    instructions.push("- The content image MUST be the central focus of the design");
    instructions.push("- DO NOT replace, modify, or generate a different main image - USE the one provided exactly");
    instructions.push("- Build the entire poster design around this central image");
  }
  
  // Instructions générales renforcées
  instructions.push("");
  instructions.push("CRITICAL RULES:");
  instructions.push("- USE ONLY the user's specifications below for ALL text and content");
  instructions.push("- DO NOT display any color codes, hex values, or technical information");
  instructions.push("- DO NOT copy any text or information from the reference image");
  instructions.push("- Apply the specified colors harmoniously and professionally");
  instructions.push("- Create a design that is MORE original and MORE professional than any reference");
  instructions.push("- Ensure the final result is unique, memorable, and print-ready");
  instructions.push("- The poster must look like it was created by a top-tier design agency");
  
  // Ajouter le prompt utilisateur avec emphase
  instructions.push("");
  instructions.push("=== USER SPECIFICATIONS (Use ONLY this information) ===");
  instructions.push(userPrompt);
  instructions.push("=== END OF USER SPECIFICATIONS ===");
  
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      throw new Error("KIE_API_KEY non configurée");
    }

    // Initialiser le client Supabase pour le storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      prompt,
      referenceImage,
      contentImage,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
    } = await req.json();

    console.log("Request received:");
    console.log("- Prompt length:", prompt?.length || 0);
    console.log("- Has reference image:", !!referenceImage);
    console.log("- Has content image:", !!contentImage);
    console.log("- Aspect ratio:", aspectRatio);
    console.log("- Resolution:", resolution);

    if (!prompt) {
      throw new Error("Le prompt est requis");
    }

    // Préparer les URLs des images
    const imageInputs: string[] = [];
    const tempFilePaths: string[] = [];

    // Upload de l'image de référence si présente
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

    // Construire le prompt professionnel
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt,
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
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
