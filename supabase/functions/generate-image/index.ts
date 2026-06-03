import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectDomainFromPrompt, buildExpertSkillsPrompt, getRandomTypographyStyle, getRandomLayoutStyle } from "./expertSkills.ts";
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Erreur inconnue";
  }
}

function isKieCreditError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("credits insufficient") ||
    message.includes("solde insuffisant") ||
    message.includes("balance isn’t enough") ||
    message.includes("balance isn't enough")
  );
}

function decodeDataUrlImage(dataUrl: string): { bytes: Uint8Array; contentType: string; extension: string } {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/i);
  if (!matches) {
    throw new Error("Format de réponse image invalide");
  }

  const subtype = matches[1].toLowerCase();
  const base64Content = matches[2];
  const binaryString = atob(base64Content);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const extension = subtype.includes("jpeg") || subtype.includes("jpg")
    ? "jpg"
    : subtype.includes("webp")
      ? "webp"
      : "png";

  return {
    bytes,
    contentType: `image/${subtype}`,
    extension,
  };
}

async function persistGeneratedImageToStorage(
  supabase: any,
  imageSource: string,
  preferredFormat: string,
): Promise<string> {
  let bytes: Uint8Array;
  let contentType = preferredFormat === "jpg" ? "image/jpeg" : `image/${preferredFormat}`;
  let extension = preferredFormat === "jpg" ? "jpg" : preferredFormat;

  if (imageSource.startsWith("data:image/")) {
    const decoded = decodeDataUrlImage(imageSource);
    bytes = decoded.bytes;
    contentType = decoded.contentType;
    extension = decoded.extension;
  } else {
    const imgResp = await fetch(imageSource);
    if (!imgResp.ok) {
      throw new Error(`Impossible de télécharger l'image générée (${imgResp.status})`);
    }

    contentType = imgResp.headers.get("content-type") || contentType;
    extension = contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "png";
    bytes = new Uint8Array(await imgResp.arrayBuffer());
  }

  const fileName = `generated/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
  const { error } = await supabase.storage
    .from("reference-templates")
    .upload(fileName, bytes, { contentType, upsert: true });

  if (error) {
    throw new Error(`Erreur de persistance image: ${error.message}`);
  }

  const { data } = supabase.storage.from("reference-templates").getPublicUrl(fileName);
  return data.publicUrl;
}

async function generateWithGoogleGemini(
  apiKey: string,
  prompt: string,
  imageInputs: string[],
): Promise<string> {
  console.log("🔵 Generating image with Google Gemini API (Nano Banana 2)...");
  console.log("Image inputs count:", imageInputs.length);

  // Build content parts: text prompt + reference images
  const parts: any[] = [{ text: prompt }];

  // Add reference images as inline data or file URIs
  for (const imgUrl of imageInputs.slice(0, 6)) {
    if (imgUrl.startsWith("data:image/")) {
      // Base64 image
      const matches = imgUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/i);
      if (matches) {
        parts.push({
          inlineData: {
            mimeType: `image/${matches[1]}`,
            data: matches[2],
          },
        });
      }
    } else if (imgUrl.startsWith("http")) {
      // Download and convert to base64 for Gemini API
      try {
        const imgResp = await fetch(imgUrl);
        if (imgResp.ok) {
          const contentType = imgResp.headers.get("content-type") || "image/jpeg";
          const buffer = await imgResp.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          parts.push({
            inlineData: {
              mimeType: contentType,
              data: base64,
            },
          });
        }
      } catch (e) {
        console.warn("Failed to download image for Gemini input:", e);
      }
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Gemini API error:", response.status, errorText);
    throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Extract image from response
  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Google Gemini n'a retourné aucun candidat");
  }

  const contentParts = candidates[0]?.content?.parts;
  if (!contentParts || contentParts.length === 0) {
    throw new Error("Google Gemini n'a retourné aucune donnée");
  }

  // Find the image part in the response
  for (const part of contentParts) {
    if (part.inlineData && part.inlineData.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
      console.log("✅ Google Gemini image generated successfully");
      return dataUrl;
    }
  }

  throw new Error("Google Gemini n'a pas retourné d'image dans la réponse");
}

async function generateWithOpenRouter(
  apiKey: string,
  prompt: string,
  imageInputs: string[],
  quality: "fast" | "premium" = "fast",
): Promise<string> {
  const model = quality === "premium"
    ? "openai/gpt-5.4-image-2"
    : "google/gemini-3-pro-image-preview";
  console.log(`🟣 Generating with OpenRouter (${model}, quality=${quality})...`);

  const content: any[] = [{ type: "text", text: prompt }];
  for (const imgUrl of imageInputs.slice(0, 6)) {
    content.push({ type: "image_url", image_url: { url: imgUrl } });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://graphistegpt.pro",
      "X-Title": "GraphisteGPT",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;
  const images = message?.images;
  if (Array.isArray(images) && images.length > 0) {
    const url = images[0]?.image_url?.url;
    if (url) {
      console.log("✅ OpenRouter Nano Banana Pro image generated.");
      return url;
    }
  }
  // Some providers return content as array with image parts
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part?.type === "image_url" && part?.image_url?.url) {
        return part.image_url.url;
      }
    }
  }
  throw new Error("OpenRouter n'a retourné aucune image. Réponse: " + JSON.stringify(data).slice(0, 500));
}

async function generateWithLovableFallback(
  apiKey: string,
  prompt: string,
  imageInputs: string[],
): Promise<string> {
  console.log("Falling back to Lovable AI image generation...");

  const content = [
    { type: "text", text: prompt },
    ...imageInputs.slice(0, 6).map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallback Lovable AI indisponible: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Lovable AI n'a pas retourné d'image exploitable");
  }

  return imageUrl;
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

/**
 * Condense user prompt intelligently instead of brutal substring cut.
 * - Remove duplicate lines, excessive whitespace, repeated punctuation
 * - Deduplicate repeated info (phone, email, address patterns)
 * - Cut at sentence/line boundary to avoid broken text
 */
function condenseUserPrompt(text: string, maxLen: number): string {
  let result = text;
  
  // 1. Normalize whitespace: collapse multiple spaces/newlines
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  
  // 2. Remove duplicate lines (exact matches)
  const lines = result.split('\n');
  const seen = new Set<string>();
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { uniqueLines.push(''); continue; }
    if (!seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      uniqueLines.push(line);
    }
  }
  result = uniqueLines.join('\n').trim();
  
  // 3. Remove repeated punctuation patterns (e.g. "!!!!!!", "-------")
  result = result.replace(/([!?.\-=*#~])\1{3,}/g, '$1$1');
  
  // 4. Shorten very long words/URLs (likely copy-paste artifacts)
  result = result.replace(/\S{120,}/g, (match) => match.substring(0, 80) + '...');
  
  // 5. If still too long, cut at last complete line that fits
  if (result.length > maxLen) {
    const cutLines = result.substring(0, maxLen).split('\n');
    // Remove last potentially incomplete line
    if (cutLines.length > 1) {
      cutLines.pop();
    }
    result = cutLines.join('\n').trim();
  }
  
  // 6. Final safety: hard cap
  if (result.length > maxLen) {
    result = result.substring(0, maxLen);
  }
  
  return result;
}

type ReferenceMode = "none" | "user" | "auto";

function buildProfessionalPrompt({
  userPrompt,
  hasReferenceImage,
  hasContentImage,
  hasLogoImage,
  aspectRatio,
  isCloneMode = false,
  referenceMode = "none",
  isModification = false,
  modificationRequest = "",
  templateSourceDomain = null,
}: {
  userPrompt: string;
  hasReferenceImage: boolean;
  hasContentImage: boolean;
  hasLogoImage: boolean;
  aspectRatio: string;
  isCloneMode?: boolean;
  referenceMode?: ReferenceMode;
  isModification?: boolean;
  modificationRequest?: string;
  templateSourceDomain?: string | null;
}): string {
  const detectedDomain = detectDomainFromPrompt(userPrompt);
  console.log(`Expert skills: Detected domain "${detectedDomain}" for prompt (templateSourceDomain="${templateSourceDomain}")`);


  // ====== MODE MODIFICATION ======
  // Deux sous-modes :
  //  (A) AMÉLIORATION GLOBALE : demandes vagues ("plus professionnel", "mieux", "améliore"...)
  //  (B) MODIFICATION CHIRURGICALE : demandes précises (changer texte, couleur, supprimer X...)
  if (isModification && modificationRequest && hasReferenceImage) {
    const normalized = modificationRequest
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const enhancementKeywords = [
      "plus professionnel", "professionnel", "professionel", "pro ",
      "ameliore", "ameliorer", "ameliorez", "amelioration",
      "plus beau", "plus joli", "plus moderne", "plus design", "plus elegant",
      "plus premium", "plus haut de gamme", "plus impressionnant", "plus attractif",
      "plus stylé", "plus stylee", "plus stylise", "plus soigne",
      "mieux", "rends mieux", "rendre mieux", "fais mieux", "refais mieux",
      "qualite superieure", "plus de qualite", "monte en gamme",
      "wow", "spectaculaire", "premium",
    ];
    const isEnhancementRequest = enhancementKeywords.some((k) => normalized.includes(k));

    const lines: string[] = [];

    if (isEnhancementRequest) {
      // ====== (A) REDESIGN COMPLET À PARTIR DES INFOS CLIENT ======
      const typoStyle = getRandomTypographyStyle();
      const layoutStyle = getRandomLayoutStyle();
      const expertSkills = buildExpertSkillsPrompt(detectedDomain);

      lines.push("🎨 MODE REDESIGN COMPLET - LIRE ATTENTIVEMENT 🎨");
      lines.push("");
      lines.push("L'image jointe est une affiche DÉJÀ GÉNÉRÉE. Le client la trouve insuffisante et demande une TOUTE NOUVELLE AFFICHE, avec un DESIGN COMPLÈTEMENT DIFFÉRENT.");
      lines.push("");
      lines.push("═══ MISSION : CRÉER UNE NOUVELLE AFFICHE FROM SCRATCH ═══");
      lines.push("• L'image jointe sert UNIQUEMENT de SOURCE D'INFORMATIONS (textes, noms, dates, prix, lieux, contacts, logos, photos client).");
      lines.push("• Tu dois CRÉER UNE NOUVELLE AFFICHE au design TOTALEMENT DIFFÉRENT de la source.");
      lines.push("• CHANGE OBLIGATOIREMENT : la mise en page, la palette de couleurs, la typographie, les formes décoratives, le style général, la composition.");
      lines.push("• Le résultat NE DOIT PAS ressembler visuellement à la source. Un observateur doit voir DEUX affiches différentes pour le même contenu.");
      lines.push("• 🚫 INTERDIT : reproduire la même mise en page, la même palette, les mêmes formes ou la même typographie que l'image jointe.");
      lines.push("");
      lines.push("═══ CONSERVATION DES INFOS CLIENT (CRITIQUE) ═══");
      lines.push("• Conserver UNIQUEMENT et INTÉGRALEMENT les informations textuelles visibles sur l'image jointe : titres, sous-titres, dates, heures, lieux, prix, contacts, noms, slogans, hashtags.");
      lines.push("• REPRODUIRE chaque texte MOT POUR MOT, caractère par caractère. Aucune invention, aucune paraphrase, aucune date/prix/contact ajouté.");
      lines.push("• Si une photo du client ou un logo client est identifiable sur la source, le RÉUTILISER. Sinon, générer un visuel cohérent avec le contexte détecté.");
      lines.push("• Format/aspect ratio : IDENTIQUE à la source. Langue : IDENTIQUE (français par défaut).");
      lines.push("");
      lines.push("═══ STANDARDS PREMIUM À APPLIQUER ═══");
      lines.push(expertSkills);
      lines.push("");
      lines.push(`Style typographique: ${typoStyle}`);
      lines.push(`Structure de mise en page: ${layoutStyle}`);
      lines.push("• Composition en 5 couches : fond riche → formes décoratives → visuels → blocs texte → effets finaux.");
      lines.push("• Hiérarchie dramatique : titre 3x+ sous-titre, sous-titre 2x+ corps de texte.");
      lines.push("• Typographie premium avec effets (3D, ombres, contours, dégradés métalliques, glow).");
      lines.push("• Palette 60-30-10, contraste WCAG 4.5:1 minimum.");
      lines.push("• Icônes/symboles décoratifs cohérents avec le DOMAINE de l'affiche (pas avec le template source).");
      lines.push("");
      lines.push("═══ CONTRÔLE QUALITÉ ═══");
      lines.push("✓ Le nouveau design est-il VISIBLEMENT DIFFÉRENT (palette, layout, typo) de la source ? Si non → ÉCHEC.");
      lines.push("✓ Toutes les infos client de la source sont-elles présentes mot pour mot ? Si non → ÉCHEC.");
      lines.push("✓ Aucune info inventée (date, prix, contact) ? Si non → ÉCHEC.");
      lines.push("");
      lines.push(`Format:${aspectRatio}|HD|Francais`);
      lines.push("");
      lines.push("═══ DEMANDE DU CLIENT ═══");
      lines.push(modificationRequest);
      return lines.join("\n");
    }

    // ====== (B) MODIFICATION CHIRURGICALE ======
    lines.push("🔧 MODE MODIFICATION CHIRURGICALE - LIRE ATTENTIVEMENT 🔧");
    lines.push("");
    lines.push("L'image jointe est une affiche DÉJÀ GÉNÉRÉE par toi. Le client demande UNE CORRECTION PRÉCISE.");
    lines.push("");
    lines.push("═══ RÈGLE ABSOLUE: MODIFIER UNIQUEMENT CE QUI EST DEMANDÉ ═══");
    lines.push("• L'affiche doit rester 100% IDENTIQUE sauf le changement demandé.");
    lines.push("• NE PAS régénérer un nouveau design. NE PAS changer la mise en page.");
    lines.push("• NE PAS modifier les couleurs, les polices, les positions, les tailles SAUF si demandé.");
    lines.push("• NE PAS ajouter ou supprimer d'éléments SAUF si demandé.");
    lines.push("• Le fond, les formes, les photos, les logos: INTOUCHABLES sauf demande explicite.");
    lines.push("");
    lines.push("═══ 🚫🚫🚫 INTERDICTION ABSOLUE D'HALLUCINATION 🚫🚫🚫 ═══");
    lines.push("• NE JAMAIS inventer, ajouter ou modifier du texte que le client N'A PAS demandé de changer.");
    lines.push("• NE JAMAIS changer une date, un prix, un numéro, un nom propre : reproduire EXACTEMENT ce qui existe.");
    lines.push("• NE JAMAIS ajouter de contenu décoratif, slogan, ou information qui n'est pas dans la demande.");
    lines.push("• Chaque caractère, chaque chiffre doit être une copie FIDÈLE sauf la modification demandée.");
    lines.push("");
    lines.push("═══ TYPES DE MODIFICATIONS ═══");
    lines.push("• Correction de texte → changer UNIQUEMENT le texte concerné, même police, même taille, même position.");
    lines.push("• Suppression → supprimer UNIQUEMENT l'élément cité, reconstruire le fond local proprement.");
    lines.push("• Ajout → ajouter UNIQUEMENT ce qui est demandé, style cohérent avec l'existant.");
    lines.push("• Couleur → modifier UNIQUEMENT la couleur citée, tout le reste intact.");
    lines.push("• Déplacement → déplacer UNIQUEMENT l'élément cité, tout le reste fixe.");
    lines.push("");
    lines.push("═══ CONTRÔLE QUALITÉ ═══");
    lines.push("✓ Comparer pixel par pixel avec l'original: SEUL le changement demandé doit être visible.");
    lines.push("✓ Si on masque la zone modifiée, le reste doit être IDENTIQUE.");
    lines.push("");
    lines.push(`Format:${aspectRatio}|HD|Francais`);
    lines.push("");
    lines.push("═══ MODIFICATION DEMANDÉE ═══");
    lines.push(modificationRequest);
    return lines.join("\n");
  }

  // ====== MODE CLONE (Cas A & B) : GABARIT VISUEL + CONTENU 100% CLIENT ======
  if (isCloneMode || hasReferenceImage) {
    const lines: string[] = [];
    const isStrictUserReference = referenceMode === "user";

    // 🔥 LES INFOS CLIENT EN PREMIER — c'est LE contenu de l'affiche finale
    lines.push("🚨🚨🚨 MISSION ABSOLUE 🚨🚨🚨");
    lines.push("Tu dois produire une affiche PROFESSIONNELLE qui contient EXCLUSIVEMENT les informations du CLIENT ci-dessous.");
    lines.push("L'image de référence sert UNIQUEMENT de gabarit visuel (style, palette, mise en page). Son CONTENU (textes, dates, prix, noms, icônes thématiques, logos tiers) doit être ENTIÈREMENT REMPLACÉ par les informations du client.");
    lines.push("");
    lines.push("═══ 📋 INFORMATIONS CLIENT — SEULES INFOS AUTORISÉES SUR L'AFFICHE FINALE ═══");
    lines.push(userPrompt);
    lines.push("═══ FIN INFOS CLIENT ═══");
    lines.push("");
    lines.push("⚠️ TOUT texte de l'affiche finale doit provenir EXCLUSIVEMENT du bloc ci-dessus. Aucun mot, aucune date, aucun prix, aucun nom, aucun numéro de l'image de référence ne doit subsister.");
    lines.push("");

    lines.push("═══ RÈGLE #1 : RÔLE DE L'IMAGE DE RÉFÉRENCE ═══");
    lines.push("La PREMIÈRE image jointe = GABARIT de design (style graphique, palette, typographie, composition, formes décoratives).");
    lines.push("Tu RÉUTILISES son style visuel, MAIS tu remplaces 100% de son contenu informationnel par les infos client ci-dessus.");
    lines.push("Les autres images jointes = éléments à insérer (photos, logos client).");
    lines.push(
      isStrictUserReference
        ? "L'utilisateur a fourni cette référence : respecter au maximum sa structure (mise en page, palette, ambiance), mais le CONTENU doit être 100% celui du client."
        : "Adapter librement la structure du gabarit pour qu'elle serve PARFAITEMENT les infos du client (hiérarchie, lisibilité, typographie)."
    );

    lines.push("");
    lines.push("═══ RÈGLE #2 : STYLE VISUEL À CONSERVER ═══");
    lines.push("PALETTE & AMBIANCE : conserver les couleurs dominantes et l'ambiance (sauf si les infos client imposent un autre univers).");
    lines.push("TYPOGRAPHIE : conserver la même famille de polices, hiérarchie et graisses.");
    lines.push("COMPOSITION : conserver l'esprit de mise en page (équilibre, zones, rythme), avec ajustements autorisés pour que les vraies infos client tiennent proprement.");
    lines.push("FORMES DÉCORATIVES : garder les formes (vagues, cercles, bandeaux) si elles servent le nouveau contenu, sinon supprimer proprement.");

    lines.push("");
    lines.push("═══ RÈGLE #3 : REMPLACEMENT DU CONTENU (ÉTAPE PAR ÉTAPE) ═══");
    lines.push("1) Identifier CHAQUE zone de texte de la référence (titre, sous-titre, date, lieu, prix, contact, slogan, hashtag, etc.).");
    lines.push("2) Pour chaque zone, chercher l'info CORRESPONDANTE dans le bloc INFOS CLIENT.");
    lines.push("   • Si une info client correspond → insérer le TEXTE EXACT du client (mot pour mot, caractère pour caractère).");
    lines.push("   • Si AUCUNE info client ne correspond → SUPPRIMER la zone et reconstruire le fond local. NE JAMAIS garder le texte d'origine. NE JAMAIS inventer.");
    lines.push("3) Vérifier qu'AUCUN texte de la référence (même partiel : un mot, un chiffre, une date, un @) n'a survécu sur l'affiche finale.");

    lines.push("");
    lines.push("═══ RÈGLE #4 : SUPPRESSION TOTALE & ANTI-HALLUCINATION ═══");
    lines.push("TOUT élément non fourni par le client DOIT DISPARAÎTRE : textes, prix, slogans, dates, adresses, téléphones, hashtags, réseaux sociaux, QR codes, watermarks, logos tiers, photos de personnes non fournies.");
    lines.push("🚫 NE JAMAIS INVENTER de texte, date, prix, numéro, adresse, slogan.");
    lines.push("🚫 NE JAMAIS PARAPHRASER : utiliser les mots EXACTS du client.");
    lines.push("🚫 NE JAMAIS conserver un texte du template 'parce qu'il sonne bien'.");
    lines.push("Si une zone reste sans contenu client → la SUPPRIMER et reconstruire le fond.");

    lines.push("");
    lines.push("═══ RÈGLE #5 : ICÔNES & ILLUSTRATIONS — ADAPTATION AU DOMAINE CLIENT ═══");
    lines.push(`DOMAINE DE L'AFFICHE CIBLE : ${detectedDomain}`);
    lines.push("Le gabarit contient probablement des icônes/illustrations liées à SON sujet d'origine. Ces éléments doivent OBLIGATOIREMENT être adaptés au domaine client :");
    lines.push("• SUPPRIMER toute icône, logo de marque tiers, illustration, personnage, objet qui ne correspond PAS au contenu fourni par le client.");
    lines.push(`• REMPLACER par des icônes/illustrations cohérentes avec « ${detectedDomain} » et avec les infos client (même style graphique, même taille, même emplacement, même effet visuel).`);
    lines.push("• Exemples : comptabilité → calculatrice, graphiques, balance. Restauration → couverts, plats. Santé → croix médicale, stéthoscope. Éducation/formation → livre, tableau, ordinateur, chapeau de diplômé. Sport → ballon, trophée. Église → croix, colombe, Bible. Immobilier → maison, clé, plan.");
    lines.push("• Si aucun équivalent pertinent → SUPPRIMER proprement et reconstruire le fond.");
    lines.push("• 🚫 INTERDIT : laisser une icône/logo/illustration sans rapport avec le contenu client.");

    // ===== GARDE-FOU ANTI-MÉLANGE DE DOMAINES =====
    if (templateSourceDomain && templateSourceDomain !== detectedDomain) {
      const FORBIDDEN_VISUAL_LANGUAGE: Record<string, string> = {
        restaurant: "assiettes, plats, couverts, verres, vapeur de cuisson, ambiance gastronomique, palette chaude type menu de restaurant",
        fashion: "mannequins en pose défilé, portants de vêtements, ambiance boutique de mode, étiquettes de prix mode",
        music: "platines DJ, micros de concert, ondes sonores, scène de concert",
        sport: "ballons, terrains, trophées, équipement sportif, maillots",
        church: "croix, colombes, Bible, ambiance liturgique",
        restaurant_food: "nourriture, plats, couverts",
      };
      const REQUIRED_VISUAL_LANGUAGE: Record<string, string> = {
        formation: "ordinateur portable, tableau/whiteboard, livre ouvert, capuche de diplômé (uniquement si certification mentionnée), apprenants en situation, environnement studio/bureau moderne",
        education: "livre, cahier, crayon, chapeau de diplômé, bibliothèque, environnement scolaire/universitaire",
        service: "icônes business propres, ambiance corporate moderne, environnement bureau",
        technology: "écran, code, circuit, ambiance tech/digital, interface UI stylisée",
        health: "croix médicale, stéthoscope, capsule, ambiance clinique propre",
        realestate: "maison, clé, plan d'architecte, ambiance immobilier haut de gamme",
        church: "croix, colombe, Bible ouverte, ambiance spirituelle",
        event: "ambiance festive cohérente avec le type d'événement (sans nourriture sauf si gala/dîner explicite)",
        music: "instruments, micro, ondes sonores, ambiance scène",
        sport: "équipement sportif cohérent avec la discipline mentionnée",
        restaurant: "plats, couverts, ambiance culinaire",
        youtube: "miniature dynamique, expressions fortes, éléments graphiques YouTube",
      };
      const forbidden = FORBIDDEN_VISUAL_LANGUAGE[templateSourceDomain];
      const required = REQUIRED_VISUAL_LANGUAGE[detectedDomain];
      lines.push("");
      lines.push("═══ ⚠️ ANTI-MÉLANGE DE DOMAINES — CRITIQUE ⚠️ ═══");
      lines.push(`Le gabarit source vient du domaine « ${templateSourceDomain} », mais l'affiche cible est dans le domaine « ${detectedDomain} ».`);
      lines.push("Tu DOIS effacer toute trace visuelle du domaine source et imposer le vocabulaire visuel du domaine cible.");
      if (forbidden) lines.push(`🚫 INTERDIT ABSOLU (vient du gabarit "${templateSourceDomain}") : ${forbidden}.`);
      if (required) lines.push(`✅ OBLIGATOIRE (vocabulaire du domaine "${detectedDomain}") : ${required}.`);
      lines.push("Si un élément ne peut pas être transformé proprement → SUPPRIMER et reconstruire le fond.");
    }

    if (hasContentImage) {
      lines.push("");
      lines.push("═══ VISUEL CLIENT ═══");
      lines.push("Insérer le visuel client dans la zone image principale, en respectant le cadrage et la composition du gabarit.");
    } else {
      lines.push("");
      lines.push("═══ PAS DE VISUEL CLIENT ═══");
      lines.push("Si le gabarit contient une zone photo importante : générer un sujet photoréaliste africain cohérent avec les infos client, dans la même zone.");
      lines.push("Sinon : ne pas ajouter de photo.");
    }

    if (hasLogoImage) {
      lines.push("LOGO CLIENT : remplacer le logo existant à son emplacement exact.");
    } else {
      lines.push("PAS DE LOGO : supprimer tout logo présent dans le gabarit et reconstruire le fond.");
    }

    lines.push("");
    lines.push("═══ CONTRÔLE QUALITÉ FINAL (vérifier mentalement avant de générer) ═══");
    lines.push("✓ Toutes les infos client sont-elles présentes et lisibles ? (sinon → ÉCHEC)");
    lines.push("✓ Aucun texte/date/prix/nom de la référence n'a survécu ? (sinon → ÉCHEC)");
    lines.push("✓ Les icônes et illustrations correspondent-elles au domaine client ? (sinon → ÉCHEC)");
    lines.push("✓ Le style visuel (palette, typo, ambiance) ressemble au gabarit ? (sinon → ÉCHEC)");
    if (templateSourceDomain && templateSourceDomain !== detectedDomain) {
      lines.push(`✓ Aucun élément n'évoque le domaine « ${templateSourceDomain} » ? (sinon → ÉCHEC)`);
    }

    lines.push("");
    lines.push("🚫 INTERDICTIONS : Recopier la référence telle quelle / Garder un seul mot de la référence / Inventer du contenu / Paraphraser le client / Laisser des icônes hors-sujet / Laisser des logos tiers.");
    lines.push("");
    lines.push(`Format:${aspectRatio}|HD|Francais`);
    lines.push("");
    lines.push("═══ RAPPEL FINAL — INFOS CLIENT À AFFICHER (et UNIQUEMENT celles-ci) ═══");
    lines.push(userPrompt);
    return lines.join("\n");
  }

  // ====== MODE LIBRE (Cas C) : CRÉATION ULTRA-PROFESSIONNELLE PREMIUM ======
  const instructions: string[] = [];
  
  // Directive principale ultra-exigeante
  instructions.push("🎨🏆 DIRECTEUR ARTISTIQUE SENIOR - AGENCE DE DESIGN INTERNATIONALE (20+ ANS)");
  instructions.push("Tu crées une affiche de NIVEAU AWARD-WINNING. Le résultat doit rivaliser avec les meilleures agences de design au monde.");
  instructions.push("QUALITÉ NON-NÉGOCIABLE: Chaque pixel compte. Chaque choix typographique est une décision de design consciente.");
  
  // Expert skills spécifiques au domaine
  const expertSkillsPrompt = buildExpertSkillsPrompt(detectedDomain);
  instructions.push(expertSkillsPrompt);
  
  // Typographie ultra-premium
  const typoStyle = getRandomTypographyStyle();
  const layoutStyle = getRandomLayoutStyle();
  
  instructions.push("");
  instructions.push("═══ 🔤 TYPOGRAPHIE ULTRA-PREMIUM (CRITIQUE) ═══");
  instructions.push(`Style principal: ${typoStyle}`);
  instructions.push("TITRE PRINCIPAL: Police display MASSIVE avec traitement graphique SPECTACULAIRE.");
  instructions.push("→ Effets obligatoires sur le titre: 3D, ombres portées épaisses (6-12px), contours doubles, dégradé métallique, glow, ou relief biseauté.");
  instructions.push("→ Le titre n'est PAS du texte. C'est un ÉLÉMENT GRAPHIQUE CENTRAL qui attire l'œil immédiatement.");
  instructions.push("→ Taille titre: 60-100pt. IMPOSANT. DOMINANT. Occupe 20-30% de la surface.");
  instructions.push("SOUS-TITRES: Police complémentaire avec effets subtils (ombre légère, contour fin, légère transparence).");
  instructions.push("→ Hiérarchie DRAMATIQUE: Titre 3x+ le sous-titre. Sous-titre 2x+ le corps.");
  instructions.push("CORPS DE TEXTE: Ultra-lisible, espacement généreux, police clean et moderne.");
  instructions.push("INTERDITS: Texte plat sans effet, polices basiques (Arial, Helvetica brut), texte qui se fond dans le décor.");
  
  instructions.push("");
  instructions.push("═══ 📐 MISE EN PAGE AWARD-WINNING ═══");
  instructions.push(`Structure: ${layoutStyle}`);
  instructions.push("COMPOSITION EN COUCHES (5 niveaux minimum):");
  instructions.push("  1. FOND: Dégradé riche multicolore ou texture sophistiquée (JAMAIS fond uni/plat)");
  instructions.push("  2. FORMES DÉCORATIVES: Courbes, vagues, formes géométriques, particules, motifs abstraits");
  instructions.push("  3. ÉLÉMENTS VISUELS: Photos détourées, illustrations, icônes contextuelles");
  instructions.push("  4. TEXTE: Titres spectaculaires + sous-titres + infos avec hiérarchie claire");
  instructions.push("  5. EFFETS FINAUX: Glow, particules, reflets, grain photographique, overlays subtils");
  instructions.push("Composition asymétrique 60/40 ou 70/30. Point focal sur intersection des tiers.");
  instructions.push("Espace de respiration: 30-40%. Marges ≥5%. Grille invisible de 12 colonnes.");
  
  instructions.push("");
  instructions.push("═══ 🎭 ÉLÉMENTS VISUELS PREMIUM ═══");
  if (hasContentImage) {
    instructions.push("PHOTO CLIENT: Intégration premium avec masque organique ou géométrique, ombre portée réaliste (15-25px flou, 20% opacité), léger glow ambient.");
  } else {
    instructions.push("GÉNÉRER un personnage AFRICAIN photoréaliste HAUTE QUALITÉ:");
    instructions.push("→ Éclairage studio professionnel 3 points (key light, fill light, rim light).");
    instructions.push("→ Expression engageante et naturelle. Pose dynamique mais professionnelle.");
    instructions.push("→ Détourage net avec ombre portée réaliste. Le personnage est l'ACCROCHE VISUELLE.");
  }
  instructions.push("FORMES DÉCORATIVES: Courbes fluides, vagues dynamiques, arcs, bandeaux obliques, rubans 3D.");
  instructions.push("ICÔNES: Contextuelles au domaine, style flat ou outlined cohérent, taille proportionnelle.");
  instructions.push("SÉPARATEURS: Lignes courbes, dégradés, formes organiques (JAMAIS de lignes droites basiques).");
  
  instructions.push("");
  instructions.push("═══ 🎨 PALETTE COULEURS & EFFETS PREMIUM ═══");
  instructions.push("Règle 60-30-10: Dominante 60%, Accent 30%, Highlight vibrant 10%.");
  instructions.push("Dégradés: 2-3 couleurs harmonieuses, transitions fluides. Direction cohérente.");
  instructions.push("Ombres: Direction unique 135°, flou 15-30px, opacité 15-25%. Cohérence totale.");
  instructions.push("Effets premium: Grain photographique subtil (3-5%), reflets subtils, glow ambiant doux.");
  instructions.push("Coins arrondis cohérents partout (15-25px). Bordures fines (1-2px) si utilisées.");
  
  instructions.push("");
  instructions.push("═══ 🚫🚫🚫 INTERDICTION ABSOLUE D'HALLUCINATION (CRITIQUE) 🚫🚫🚫 ═══");
  instructions.push("C'est la RÈGLE LA PLUS IMPORTANTE. Violation = ÉCHEC TOTAL.");
  instructions.push("• SEUL le texte EXACTEMENT fourni par le client apparaît sur l'affiche. RIEN D'AUTRE.");
  instructions.push("• NE JAMAIS INVENTER : date, prix, numéro de téléphone, adresse, slogan, nom de marque, hashtag, URL, email, ou TOUTE info non donnée.");
  instructions.push("• NE JAMAIS PARAPHRASER : si le client écrit 'Grande Vente du 15 Mars', écrire EXACTEMENT 'Grande Vente du 15 Mars'. Pas 'Mega Promo', pas '15/03', pas 'Mars 2025'.");
  instructions.push("• NE JAMAIS AJOUTER de texte 'décoratif' ou 'pour compléter le design'. Les zones sans info client = fond graphique SANS TEXTE.");
  instructions.push("• NE JAMAIS MÉLANGER les domaines : une affiche e-commerce ne contient PAS de texte sur l'impression, la religion, ou d'autres domaines non liés.");
  instructions.push("• CHAQUE MOT sur l'affiche doit pouvoir être RETROUVÉ dans le texte du client ci-dessous. Sinon → NE PAS L'ÉCRIRE.");
  instructions.push("• Si le client a donné peu d'infos → l'affiche a PEU DE TEXTE. C'est NORMAL. Compenser avec du DESIGN, pas du texte inventé.");
  instructions.push("");
  instructions.push("═══ ⚡ EXIGENCES COMPLÉMENTAIRES ═══");
  instructions.push("• PERSONNAGES: Africains par défaut. Photoréalistes. Professionnels.");
  instructions.push("• LISIBILITÉ: Contraste WCAG 4.5:1 minimum. Texte TOUJOURS lisible au premier regard.");
  instructions.push("• ORTHOGRAPHE: Zéro faute. Respecter l'orthographe EXACTE du client, caractère par caractère.");
  instructions.push("• CTA: Si pertinent ET fourni par le client, bouton/bandeau visible et accrocheur.");
  if (hasLogoImage) instructions.push("• LOGO: Reproduire EXACTEMENT tel que fourni, sans déformation.");
  
  instructions.push("");
  instructions.push(`Format:${aspectRatio}|HD|Francais`);
  instructions.push("═══ DONNÉES CLIENT (UNIQUEMENT CES INFORMATIONS SUR L'AFFICHE, RIEN D'AUTRE) ═══");
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
  
  // Map unsupported aspect ratios to closest supported ones
  const KIE_SUPPORTED_RATIOS = ['1:1', '3:4', '4:3', '4:5', '5:4', '16:9', '9:16', '2:3', '3:2', '21:9'];
  const RATIO_FALLBACK_MAP: Record<string, string> = {
    '1:3': '9:16',   // Roll-up → closest tall
    '3:1': '21:9',   // Header → closest wide  
    '4:1': '21:9',   // Banner → closest wide
    '1:4': '9:16',   // Tall banner → closest tall
    '9:21': '9:16',  // Ultra-tall → closest tall
  };
  const validAspectRatio = KIE_SUPPORTED_RATIOS.includes(aspectRatio) 
    ? aspectRatio 
    : (RATIO_FALLBACK_MAP[aspectRatio] || '1:1');
  
  console.log(`Aspect ratio mapping: ${aspectRatio} → ${validAspectRatio}`);

  const requestBody = {
    model: "nano-banana-pro",
    input: {
      prompt: prompt,
      image_input: imageInputs,
      aspect_ratio: validAspectRatio,
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
  maxAttempts: number = 60,
  baseIntervalMs: number = 2000
): Promise<string> {
  // Keep total polling time under ~140s to avoid edge function wall clock limit
  const resolutionConfig: Record<string, { maxAttempts: number; baseInterval: number }> = {
    "1K": { maxAttempts: 50, baseInterval: 2000 },
    "2K": { maxAttempts: 60, baseInterval: 2000 },
    "4K": { maxAttempts: 65, baseInterval: 2000 },
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

const MAX_PROMPT_LENGTH = 15000;
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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
      isModification, // Flag pour les modifications (pas de débit de crédits)
      modificationRequest: rawModificationRequest, // Description de la modification demandée
      quality: rawQuality, // 'fast' (Nano Banana Pro) | 'premium' (OpenAI GPT Image 2, plus lent)
    } = body;
    const quality: "fast" | "premium" = rawQuality === "premium" ? "premium" : "fast";

    const userProvidedReferenceImage = typeof rawReferenceImage === "string" && rawReferenceImage.trim().length > 0;
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
    console.log("- Reference image size:", rawReferenceImage ? Math.round((rawReferenceImage as string).length / 1024) + " KB" : "n/a");
    console.log("- isModification:", !!isModification);
    console.log("- modificationRequest:", typeof rawModificationRequest === "string" ? rawModificationRequest.slice(0, 120) : "n/a");
    console.log("- Logo images count:", logoImages?.length || 0);
    console.log("- Has content image:", !!contentImage);
    console.log("- Secondary images count:", secondaryImages?.length || 0);

    // GARDE-FOU : en mode modification, il FAUT une image de référence (l'affiche déjà générée).
    // Sans elle, on renverrait un design générique sans les infos client.
    if (isModification && !userProvidedReferenceImage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MISSING_REFERENCE_FOR_MODIFICATION",
          message: "Aucune affiche de référence n'a été fournie pour la modification.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          p_is_modification: !!isModification,
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

    // ===== CRÉATION DU JOB ASYNCHRONE =====
    const { data: jobRow, error: jobErr } = await supabase
      .from('image_jobs')
      .insert({
        user_id: userId,
        status: 'processing',
        params: { prompt: prompt.slice(0, 500), aspectRatio, resolution, outputFormat },
      })
      .select('id')
      .single();
    if (jobErr || !jobRow) {
      console.error("Failed to create job:", jobErr);
      throw new Error("Erreur lors de la création du job de génération");
    }
    const jobId = jobRow.id as string;
    console.log("📋 Job created:", jobId);

    const backgroundWork = async () => {
      try {


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
    let pickedTemplateDomain: string | null = null;

    if (!referenceImage) {
      console.log("No reference image provided. Selecting best matching template...");
      try {
        // Source de vérité unique : on utilise EXACTEMENT la même détection que pour les consignes IA.
        const promptLower = prompt.toLowerCase();
        const detected = detectDomainFromPrompt(prompt);
        const bestDomain: string | null = detected && detected !== "other" ? detected : null;

        // Familles strictes : seuls les domaines visuellement compatibles peuvent servir de fallback.
        // Restaurant / fashion / food NE SONT JAMAIS un fallback pour les autres domaines.
        const DOMAIN_FAMILY: Record<string, string[]> = {
          formation:  ["formation", "education", "service", "event"],
          education:  ["education", "formation", "service", "event"],
          service:    ["service", "formation", "education", "technology", "event"],
          technology: ["technology", "service", "formation", "education"],
          health:     ["health", "service"],
          realestate: ["realestate", "service"],
          church:     ["church", "event"],
          event:      ["event", "church", "music", "sport"],
          music:      ["music", "event"],
          sport:      ["sport", "event"],
          youtube:    ["youtube", "event", "music"],
          restaurant: ["restaurant", "ecommerce"],
          ecommerce:  ["ecommerce", "restaurant", "fashion"],
          fashion:    ["fashion", "ecommerce"],
          other:      ["service", "event"],
        };

        console.log(`🎯 Template selection — detectedDomain="${detected}", bestDomain="${bestDomain}"`);

        let tplCandidates: any[] = [];
        let fallbackFamilyUsed: string[] = [];

        // 1) Domaine exact uniquement
        if (bestDomain) {
          const { data: domainTemplates } = await supabase
            .from("reference_templates")
            .select("image_url, domain, description, tags")
            .eq("domain", bestDomain)
            .limit(20);

          if (domainTemplates && domainTemplates.length > 0) {
            tplCandidates = domainTemplates;
            fallbackFamilyUsed = [bestDomain];
            console.log(`✅ Found ${tplCandidates.length} exact-domain templates for "${bestDomain}"`);
          }
        }

        // 2) Famille proche uniquement (jamais restaurant/fashion pour formation, etc.)
        if (tplCandidates.length === 0 && bestDomain) {
          const family = DOMAIN_FAMILY[bestDomain] || [bestDomain];
          fallbackFamilyUsed = family;
          const { data: familyTemplates } = await supabase
            .from("reference_templates")
            .select("image_url, domain, description, tags")
            .in("domain", family)
            .limit(20);
          if (familyTemplates && familyTemplates.length > 0) {
            tplCandidates = familyTemplates;
            console.log(`⚠️ Using family fallback [${family.join(", ")}] → ${tplCandidates.length} templates`);
          }
        }

        // 3) Aucun candidat pertinent → on NE clone PAS un template hors contexte.
        //    On laisse la génération basculer en mode libre (referenceImage reste null).
        if (tplCandidates.length === 0) {
          console.log(`🚫 No in-context template found for domain "${bestDomain ?? "unknown"}" — falling back to FREE creation mode (no cloning).`);
        } else {
          // Scoring : bonus si domaine exact + match de mots-clés du prompt.
          const scoredTemplates = tplCandidates.map(t => {
            let score = 0;
            const desc = (t.description || "").toLowerCase();
            const tags = (t.tags || []).map((tag: string) => String(tag).toLowerCase()).join(" ");
            const allText = desc + " " + tags;
            if (bestDomain && t.domain === bestDomain) score += 10;
            const promptWords = promptLower.split(/\s+/).filter(w => w.length > 4);
            for (const word of promptWords) {
              if (allText.includes(word)) score += 2;
            }
            if (t.description && t.description.length > 20) score += 3;
            return { template: t, score };
          });

          scoredTemplates.sort((a, b) => b.score - a.score);
          const topN = Math.min(5, scoredTemplates.length);
          const topTemplates = scoredTemplates.slice(0, topN);
          const picked = topTemplates[Math.floor(Math.random() * topTemplates.length)].template;

          referenceImage = resolveTemplateUrl(picked.image_url);
          isAutoSelectedTemplate = true;
          pickedTemplateDomain = picked.domain || null;

          console.log(`✅ Selected template — domain="${picked.domain}", isAutoSelected=true, fallbackFamilyUsed=[${fallbackFamilyUsed.join(", ")}]`);
          console.log(`   URL: ${referenceImage}`);
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
          if (userProvidedReferenceImage) {
            throw new Error("Impossible de charger l'image de reference fournie. Generation annulee pour eviter un design non fidele.");
          }
          // On tolère l'échec uniquement pour les templates auto-sélectionnés
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
    const referenceMode: ReferenceMode = userProvidedReferenceImage
      ? "user"
      : isAutoSelectedTemplate
        ? "auto"
        : "none";
    
    console.log(`🎯 Mode final: isCloneMode=${isCloneMode} (body=${body.isCloneMode}, autoSelected=${isAutoSelectedTemplate}, referenceMode=${referenceMode})`);
    
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
    
    // Smart condensation of user prompt to fit within API limits
    const MAX_USER_PROMPT = 2500;
    let userPromptFull = prompt + (logoPositionText ? ` ${logoPositionText}` : "") + scenePreferenceText + secondaryImagesPromptSection;
    if (userPromptFull.length > MAX_USER_PROMPT) {
      console.warn(`User prompt too long (${userPromptFull.length}), condensing to ${MAX_USER_PROMPT}`);
      userPromptFull = condenseUserPrompt(userPromptFull, MAX_USER_PROMPT);
    }
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: userPromptFull,
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: logoImages && logoImages.length > 0,
      aspectRatio,
      isCloneMode,
      referenceMode,
      isModification: !!isModification,
      modificationRequest: typeof rawModificationRequest === "string" ? rawModificationRequest : "",
      templateSourceDomain: pickedTemplateDomain,

    });

    console.log("Professional prompt built, length:", professionalPrompt.length);
    
    // Safety: smart truncate if exceeds API limit
    const MAX_SAFE_PROMPT = 6000;
    let finalPrompt = professionalPrompt;
    if (finalPrompt.length > MAX_SAFE_PROMPT) {
      console.warn(`Prompt too long (${finalPrompt.length}), condensing to ${MAX_SAFE_PROMPT}`);
      // Find where user data starts (after "=== INFOS CLIENT" or "=== DONNEES CLIENT")
      const clientDataMarker = finalPrompt.indexOf("=== ");
      if (clientDataMarker > 0) {
        const systemPart = finalPrompt.substring(0, clientDataMarker);
        const userPart = finalPrompt.substring(clientDataMarker);
        const availableForUser = MAX_SAFE_PROMPT - systemPart.length;
        if (availableForUser > 200) {
          finalPrompt = systemPart + condenseUserPrompt(userPart, availableForUser);
        } else {
          finalPrompt = finalPrompt.substring(0, MAX_SAFE_PROMPT);
        }
      } else {
        finalPrompt = finalPrompt.substring(0, MAX_SAFE_PROMPT);
      }
    }
    
    console.log("Final prompt length:", finalPrompt.length);

    let taskId = "";
    let resultUrl = "";
    
    let generationError: unknown = null;

    // ===== GÉNÉRATION PRINCIPALE: OpenRouter (Nano Banana Pro) =====
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

    const tryGoogle = async () => {
      if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY non configurée");
      taskId = `gemini-${crypto.randomUUID()}`;
      resultUrl = await generateWithGoogleGemini(GOOGLE_AI_API_KEY, finalPrompt, imageInputs);
    };
    const tryKie = async () => {
      taskId = await createTask(KIE_API_KEY, finalPrompt, imageInputs, aspectRatio, resolution, outputFormat);
      resultUrl = await pollForResult(KIE_API_KEY, taskId, resolution);
    };
    const tryLovable = async () => {
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");
      taskId = `lovable-${crypto.randomUUID()}`;
      resultUrl = await generateWithLovableFallback(LOVABLE_API_KEY, finalPrompt, imageInputs);
    };

    if (OPENROUTER_API_KEY) {
      try {
        console.log("🟣 Tentative de génération avec OpenRouter Nano Banana Pro (PRIMARY)...");
        taskId = `openrouter-${crypto.randomUUID()}`;
        resultUrl = await generateWithOpenRouter(OPENROUTER_API_KEY, finalPrompt, imageInputs, quality);
        console.log("✅ OpenRouter generation succeeded.");
      } catch (orError) {
        console.warn("⚠️ OpenRouter failed:", getErrorMessage(orError));
        try { await tryGoogle(); console.log("✅ Google Gemini fallback succeeded."); }
        catch (gErr) {
          console.warn("⚠️ Google Gemini failed:", getErrorMessage(gErr));
          try { await tryKie(); console.log("✅ Kie AI fallback succeeded."); }
          catch (kErr) {
            console.warn("⚠️ Kie AI failed:", getErrorMessage(kErr));
            try { await tryLovable(); console.log("✅ Lovable AI fallback succeeded."); }
            catch (lErr) { generationError = lErr; }
          }
        }
      }
    } else if (GOOGLE_AI_API_KEY) {
      try { await tryGoogle(); }
      catch (geminiError) {
        console.warn("⚠️ Google Gemini failed:", getErrorMessage(geminiError));
        try { await tryKie(); }
        catch (kieError) {
          console.warn("⚠️ Kie AI failed:", getErrorMessage(kieError));
          try { await tryLovable(); }
          catch (lErr) { generationError = lErr; }
        }
      }
    } else {
      try { await tryKie(); }
      catch (genError) {
        if (isKieCreditError(genError) && LOVABLE_API_KEY) {
          try { await tryLovable(); }
          catch (fallbackError) { generationError = fallbackError; }
        } else {
          generationError = genError;
        }
      }
    }


    if (!generationError) {
      console.log("✅ Image generation succeeded.");
    }

    // ===== REMBOURSEMENT AUTOMATIQUE =====
    if (generationError && creditCheckResult?.success && userId && creditCheckResult.credits_used > 0) {
      const creditsToRefund = creditCheckResult.credits_used;
      console.log(`⚠️ Generation failed, refunding ${creditsToRefund} credits to user ${userId}`);
      
      try {
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: creditsToRefund,
          type: 'refund',
          description: 'Remboursement auto: génération échouée',
        });
        
        const { data: currentSub } = await supabase
          .from('user_subscriptions')
          .select('id, credits_remaining, plan_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (currentSub) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('slug')
            .eq('id', currentSub.plan_id)
            .single();
          
          if (plan?.slug === 'free') {
            const { data: subData } = await supabase
              .from('user_subscriptions')
              .select('free_generations_used')
              .eq('id', currentSub.id)
              .single();
            if (subData) {
              await supabase
                .from('user_subscriptions')
                .update({ free_generations_used: Math.max(0, subData.free_generations_used - 1) })
                .eq('id', currentSub.id);
            }
          } else {
            await supabase
              .from('user_subscriptions')
              .update({ credits_remaining: currentSub.credits_remaining + creditsToRefund })
              .eq('id', currentSub.id);
          }
        }
        
        console.log(`✅ Refund of ${creditsToRefund} credits completed`);
      } catch (refundError) {
        console.error("❌ Refund failed:", refundError);
      }
    }
    
    // Cleanup temp files even on error
    if (tempFilePaths.length > 0) {
      await cleanupTempImages(supabase, tempFilePaths);
    }

    if (generationError) {
      throw generationError;
    }

    if (tempFilePaths.length > 0) {
      await cleanupTempImages(supabase, tempFilePaths);
    }

    let permanentUrl = resultUrl;
    try {
      permanentUrl = await persistGeneratedImageToStorage(supabase, resultUrl, outputFormat);
      console.log("Image persisted to storage:", permanentUrl);
    } catch (persistErr) {
      console.warn("Image persistence failed, using temp URL:", persistErr);
    }

        await supabase.from('image_jobs').update({
          status: 'completed',
          result_url: permanentUrl,
          task_id: taskId,
        }).eq('id', jobId);
        console.log("✅ Job completed:", jobId);
      } catch (bgErr) {
        console.error("❌ Background job error:", bgErr);
        await supabase.from('image_jobs').update({
          status: 'failed',
          error_message: getErrorMessage(bgErr).slice(0, 1000),
        }).eq('id', jobId);
      }
    };

    // @ts-ignore EdgeRuntime global
    EdgeRuntime.waitUntil(backgroundWork());

    return new Response(
      JSON.stringify({ success: true, jobId, status: 'processing' }),
      {
        status: 202,
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
