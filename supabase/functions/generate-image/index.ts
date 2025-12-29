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
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, aspectRatio = "1:1", resolution = "1K", outputFormat = "png" } = await req.json() as GenerateImageRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating task with prompt:", prompt.substring(0, 100) + "...");
    console.log("Parameters:", { aspectRatio, resolution, outputFormat });

    // Step 1: Create the task
    const createTaskResponse = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KIE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "nano-banana-pro",
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          resolution,
          output_format: outputFormat,
        },
      }),
    });

    const createTaskData = await createTaskResponse.json();
    console.log("Create task response:", JSON.stringify(createTaskData));

    if (createTaskData.code !== 200 || !createTaskData.data?.taskId) {
      console.error("Failed to create task:", createTaskData);
      return new Response(
        JSON.stringify({ 
          error: createTaskData.message || "Failed to create generation task",
          details: createTaskData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskId = createTaskData.data.taskId;
    console.log("Task created with ID:", taskId);

    // Step 2: Poll for task completion
    const maxAttempts = 60; // 2 minutes max
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`https://api.kie.ai/api/v1/jobs/getTask?taskId=${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${KIE_AI_API_KEY}`,
        },
      });

      const statusData = await statusResponse.json();
      console.log(`Poll attempt ${attempt + 1}:`, JSON.stringify(statusData));

      if (statusData.code !== 200) {
        console.error("Error checking task status:", statusData);
        continue;
      }

      const taskState = statusData.data?.state;

      if (taskState === "success") {
        // Parse the resultJson to get the image URL
        let imageUrl = null;
        
        if (statusData.data?.resultJson) {
          try {
            const resultData = typeof statusData.data.resultJson === 'string' 
              ? JSON.parse(statusData.data.resultJson)
              : statusData.data.resultJson;
            
            imageUrl = resultData.resultUrls?.[0] || resultData.imageUrl;
          } catch (e) {
            console.error("Error parsing resultJson:", e);
          }
        }

        if (!imageUrl) {
          return new Response(
            JSON.stringify({ error: "No image URL in response", details: statusData }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Image generated successfully:", imageUrl);
        
        return new Response(
          JSON.stringify({ 
            success: true,
            imageUrl,
            taskId,
            costTime: statusData.data?.costTime
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (taskState === "fail") {
        console.error("Task failed:", statusData.data);
        return new Response(
          JSON.stringify({ 
            error: statusData.data?.failMsg || "Image generation failed",
            failCode: statusData.data?.failCode
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Task is still processing, continue polling
    }

    // Timeout
    return new Response(
      JSON.stringify({ error: "Generation timed out. Please try again.", taskId }),
      { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
