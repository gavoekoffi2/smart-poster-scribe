import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Détecte les formats d'entrée image supportés
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

// Convertit une URL en base64 data URL
async function urlToBase64(url: string): Promise<string> {
  console.log("Converting URL to base64:", url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:${contentType};base64,${base64}`;
}

// Prépare une image pour l'API (convertit en base64 si nécessaire)
async function prepareImageForApi(
  imageData: string,
  origin?: string
): Promise<string> {
  if (imageData.startsWith("data:image/")) {
    return imageData;
  }
  if (isUrlLike(imageData)) {
    const resolvedUrl = isHttpUrl(imageData) ? imageData : resolveUrlLike(imageData, origin);
    return await urlToBase64(resolvedUrl);
  }
  throw new Error("Format d'image non supporté");
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

  instructions.push(
    "You are an elite graphic designer. Create a PRINT-READY advertising poster with agency-level polish."
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

  instructions.push("");
  instructions.push("TEXT RULES:");
  instructions.push("- ONLY print text that appears in USER PROVIDED CONTENT below.");
  instructions.push("- Do NOT invent phone numbers, addresses, prices, dates, or any extra information.");

  if (hasReferenceImage) {
    instructions.push("");
    instructions.push("=== REFERENCE IMAGE DESIGN ===");
    instructions.push("The FIRST image is the DESIGN REFERENCE. Replicate its design with MAXIMUM FIDELITY:");
    instructions.push("1. LAYOUT: Copy the EXACT grid system, margins, and spacing.");
    instructions.push("2. TYPOGRAPHY: Match font styles, sizes, and hierarchy.");
    instructions.push("3. COLORS: Replicate the color scheme exactly.");
    instructions.push("4. GRAPHICS: Copy decorative elements, shapes, and effects.");
    instructions.push("5. ATMOSPHERE: Reproduce the mood and visual energy.");
    instructions.push("");
    instructions.push("CRITICAL: Generate NEW, DIFFERENT people/characters - NEVER copy faces from reference!");
    instructions.push("CRITICAL: Do NOT copy any text, phone numbers, or contact info from the reference!");
  }

  if (hasLogoImage) {
    instructions.push("");
    instructions.push("LOGO: A logo is provided. Integrate it prominently without distortion.");
  }

  if (hasContentImage) {
    instructions.push("");
    instructions.push("MAIN VISUAL: Integrate the provided content image as the PRIMARY visual element.");
  }

  instructions.push("");
  instructions.push("=== USER PROMPT ===");
  instructions.push(userPrompt);
  instructions.push("=== END USER PROMPT ===");

  return instructions.join("\n");
}

// ============ INPUT VALIDATION CONSTANTS ============
const MAX_PROMPT_LENGTH = 5000;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_LOGO_COUNT = 5;
const ALLOWED_ASPECT_RATIOS = ['1:1', '3:4', '4:3', '16:9', '9:16'];

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
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
    } = body;

    let referenceImage = rawReferenceImage as string | undefined;

    // ============ INPUT VALIDATION ============
    if (!prompt || typeof prompt !== 'string') {
      throw new Error("Le prompt est requis");
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(`Le prompt dépasse la limite de ${MAX_PROMPT_LENGTH} caractères`);
    }

    if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
      throw new Error(`Format invalide. Formats acceptés: ${ALLOWED_ASPECT_RATIOS.join(', ')}`);
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
    console.log("- Has reference image:", !!referenceImage);
    console.log("- Logo images count:", logoImages?.length || 0);
    console.log("- Has content image:", !!contentImage);
    console.log("- Aspect ratio:", aspectRatio);

    const originHeader = req.headers.get("origin") || undefined;
    const refererHeader = req.headers.get("referer") || undefined;
    const requestOrigin = originHeader
      ? originHeader
      : refererHeader
        ? new URL(refererHeader).origin
        : undefined;

    // Auto-pick a template if no images provided
    if (!referenceImage && !contentImage && (!logoImages || logoImages.length === 0)) {
      console.log("No user images provided. Selecting a fallback style template...");
      try {
        const { data: tplCandidates, error: tplError } = await supabase
          .from("reference_templates")
          .select("image_url, domain, design_category")
          .order("created_at", { ascending: false })
          .limit(40);

        if (!tplError && tplCandidates && tplCandidates.length > 0) {
          const picked = tplCandidates[Math.floor(Math.random() * tplCandidates.length)];
          referenceImage = picked.image_url;
          console.log(`Picked fallback template: ${picked.domain}/${picked.design_category}`);
        }
      } catch (e) {
        console.warn("Error selecting fallback template:", e);
      }
    }

    // Build messages content array for Lovable AI
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Prepare images for the API
    const imagePromises: Promise<void>[] = [];

    if (referenceImage) {
      imagePromises.push(
        prepareImageForApi(referenceImage, requestOrigin).then((base64) => {
          messageContent.push({
            type: "image_url",
            image_url: { url: base64 }
          });
        })
      );
    }

    if (logoImages && Array.isArray(logoImages)) {
      for (const logo of logoImages) {
        imagePromises.push(
          prepareImageForApi(logo, requestOrigin).then((base64) => {
            messageContent.push({
              type: "image_url",
              image_url: { url: base64 }
            });
          })
        );
      }
    }

    if (contentImage) {
      imagePromises.push(
        prepareImageForApi(contentImage, requestOrigin).then((base64) => {
          messageContent.push({
            type: "image_url",
            image_url: { url: base64 }
          });
        })
      );
    }

    // Wait for all images to be processed
    await Promise.all(imagePromises);

    // Build the professional prompt
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

    // Add the text prompt at the beginning
    messageContent.unshift({
      type: "text",
      text: professionalPrompt
    });

    console.log("Calling Lovable AI for image generation...");
    console.log("Message content items:", messageContent.length);

    // Call Lovable AI
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Limite de requêtes atteinte. Réessayez plus tard.");
      }
      if (response.status === 402) {
        throw new Error("Crédits insuffisants. Veuillez recharger votre compte.");
      }
      
      throw new Error(`Erreur génération: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lovable AI response received");

    // Extract the generated image
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Aucune image générée dans la réponse");
    }

    console.log("Image generated successfully");

    // Upload the generated image to Supabase Storage for persistence
    let finalImageUrl = generatedImage;
    
    if (generatedImage.startsWith("data:image/")) {
      try {
        const matches = generatedImage.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
        if (matches) {
          const mimeType = matches[1].toLowerCase();
          const base64Content = matches[2];
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const extension = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg' : mimeType;
          const fileName = `generated_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
          
          const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, bytes, {
              contentType: `image/${mimeType}`,
              upsert: false,
            });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('generated-images')
              .getPublicUrl(fileName);
            finalImageUrl = urlData.publicUrl;
            console.log("Image uploaded to storage:", finalImageUrl);
          } else {
            console.warn("Storage upload failed, using base64:", uploadError);
          }
        }
      } catch (e) {
        console.warn("Failed to upload to storage, using base64:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        taskId: crypto.randomUUID(),
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
