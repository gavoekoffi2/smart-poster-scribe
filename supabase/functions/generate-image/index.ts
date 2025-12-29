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

interface KieTaskResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
  };
}

interface KieTaskStatusResponse {
  code: number;
  message: string;
  data: {
    taskId: string;
    state: "pending" | "processing" | "success" | "fail";
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  };
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

    const {
      prompt,
      aspectRatio = "1:1",
      resolution = "1K",
      outputFormat = "png",
      referenceImageUrl,
    } = (await req.json()) as GenerateImageRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating task with KIE AI Nano Banana Pro...");
    console.log("Prompt:", prompt.substring(0, 200) + "...");
    console.log("Parameters:", { aspectRatio, resolution, outputFormat });

    // Map aspect ratio format (our format uses ":" but KIE uses ":" as well)
    const kieAspectRatio = aspectRatio;

    // Build image_input array if reference image is provided
    const imageInput: string[] = [];
    if (referenceImageUrl) {
      imageInput.push(referenceImageUrl);
    }

    // Step 1: Create task
    const createTaskResponse = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nano-banana-pro",
        input: {
          prompt: prompt,
          image_input: imageInput.length > 0 ? imageInput : undefined,
          aspect_ratio: kieAspectRatio,
          resolution: resolution,
          output_format: outputFormat.toLowerCase(),
        },
      }),
    });

    if (!createTaskResponse.ok) {
      const errorText = await createTaskResponse.text();
      console.error("KIE AI createTask error:", createTaskResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to create generation task",
          details: errorText,
          status: createTaskResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createTaskData = (await createTaskResponse.json()) as KieTaskResponse;
    console.log("Task created:", createTaskData);

    if (createTaskData.code !== 200 || !createTaskData.data?.taskId) {
      console.error("Task creation failed:", createTaskData);
      return new Response(
        JSON.stringify({
          error: "Task creation failed",
          details: createTaskData.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskId = createTaskData.data.taskId;
    console.log("Task ID:", taskId);

    // Step 2: Poll for task completion
    const maxAttempts = 60; // 60 attempts * 3 seconds = 3 minutes max
    const pollInterval = 3000; // 3 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`);

      const statusResponse = await fetch("https://api.kie.ai/api/v1/jobs/getTask", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KIE_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (!statusResponse.ok) {
        console.error("Status poll error:", statusResponse.status);
        continue; // Retry on transient errors
      }

      const statusData = (await statusResponse.json()) as KieTaskStatusResponse;
      console.log("Task status:", statusData.data?.state);

      if (statusData.code !== 200) {
        console.error("Status check failed:", statusData);
        continue;
      }

      const taskState = statusData.data?.state;

      if (taskState === "success") {
        // Parse resultJson to get image URL
        try {
          const result = JSON.parse(statusData.data.resultJson || "{}");
          const imageUrl = result.resultUrls?.[0];

          if (!imageUrl) {
            console.error("No image URL in result:", result);
            return new Response(
              JSON.stringify({ error: "No image URL in result" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log("Image generated successfully:", imageUrl);

          return new Response(
            JSON.stringify({
              success: true,
              imageUrl,
              taskId,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (parseError) {
          console.error("Failed to parse result:", parseError, statusData.data.resultJson);
          return new Response(
            JSON.stringify({ error: "Failed to parse generation result" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (taskState === "fail") {
        console.error("Task failed:", statusData.data.failMsg);
        return new Response(
          JSON.stringify({
            error: "Image generation failed",
            details: statusData.data.failMsg || "Unknown error",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // pending or processing - continue polling
    }

    // Timeout
    console.error("Task timed out");
    return new Response(
      JSON.stringify({ error: "Generation timed out. Please try again." }),
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
