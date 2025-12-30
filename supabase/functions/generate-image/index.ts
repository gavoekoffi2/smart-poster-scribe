import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  outputFormat?: string;
  referenceImageUrl?: string;
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
    state: "waiting" | "success" | "fail";
    failMsg?: string;
    resultList?: Array<{
      url: string;
    }>;
  };
}

function mapResolutionToQuality(resolution: string): "basic" | "high" {
  return resolution === "4K" ? "high" : "basic";
}

function buildFinalPrompt({
  prompt,
  aspectRatio,
  resolution,
}: {
  prompt: string;
  aspectRatio: string;
  resolution: string;
}) {
  return [
    "Génère une affiche publicitaire prête à publier.",
    `Format: ${aspectRatio} (vertical).`,
    `Qualité: ${resolution}, ultra haute résolution, texte net et lisible.`,
    "Si une personne apparaît, elle doit être africaine.",
    "Respecte strictement les informations fournies.",
    "---",
    prompt.trim(),
  ].join("\n");
}

async function pollForResult(taskId: string, apiKey: string, maxAttempts = 40, intervalMs = 3000): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for taskId: ${taskId}`);
    
    const response = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Polling error: ${response.status}`);
      throw new Error(`Erreur lors de la vérification du statut: ${response.status}`);
    }

    const data = (await response.json()) as KieRecordInfoResponse;
    console.log(`Poll response state: ${data.data?.state}`);

    if (data.data?.state === "success") {
      const imageUrl = data.data.resultList?.[0]?.url;
      if (!imageUrl) {
        throw new Error("Aucune image retournée par l'API");
      }
      return imageUrl;
    }

    if (data.data?.state === "fail") {
      throw new Error(data.data.failMsg || "Échec de la génération d'image");
    }

    // state === "waiting", continue polling
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error("La génération a pris trop de temps, veuillez réessayer");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_AI_API_KEY = Deno.env.get("KIE_AI_API_KEY");

    if (!KIE_AI_API_KEY) {
      console.error("KIE_AI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Clé API Kie AI non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      prompt,
      aspectRatio = "3:4",
      resolution = "2K",
      outputFormat = "png",
    } = (await req.json()) as GenerateImageRequest;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPrompt = buildFinalPrompt({
      prompt,
      aspectRatio,
      resolution,
    });

    console.log("Creating task with Seedream 4.5...");
    console.log("Prompt:", finalPrompt.slice(0, 200) + "...");
    console.log("Aspect ratio:", aspectRatio);
    console.log("Quality:", mapResolutionToQuality(resolution));

    // Step 1: Create the task with proper nested input structure
    const requestBody = {
      model: "seedream/4.5-text-to-image",
      input: {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        quality: mapResolutionToQuality(resolution),
      },
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    const createTaskResponse = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!createTaskResponse.ok) {
      const errorText = await createTaskResponse.text();
      console.error("Kie AI createTask error:", createTaskResponse.status, errorText);

      if (createTaskResponse.status === 401) {
        return new Response(JSON.stringify({ error: "Erreur d'authentification avec l'API Kie AI" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (createTaskResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Solde insuffisant sur le compte Kie AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (createTaskResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: "Erreur serveur Kie AI",
          details: errorText,
          status: createTaskResponse.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createTaskData = (await createTaskResponse.json()) as KieCreateTaskResponse;
    console.log("Task created:", JSON.stringify(createTaskData));

    if (createTaskData.code !== 0 || !createTaskData.data?.taskId) {
      console.error("Failed to create task:", createTaskData.msg);
      return new Response(JSON.stringify({ error: createTaskData.msg || "Échec de la création de la tâche" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const taskId = createTaskData.data.taskId;
    console.log("Task ID:", taskId);

    // Step 2: Poll for result
    const imageUrl = await pollForResult(taskId, KIE_AI_API_KEY);
    console.log("Image generated successfully:", imageUrl.slice(0, 100) + "...");

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        taskId,
        outputFormat: outputFormat.toLowerCase(),
        provider: "kie-ai-seedream",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
