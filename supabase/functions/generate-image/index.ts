import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { detectDomainFromPrompt, buildExpertSkillsPrompt } from "./expertSkills.ts";

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
  if (isCloneMode || hasReferenceImage) {
    instructions.push("Tu es un graphiste d'élite spécialisé dans la PERSONNALISATION FIDÈLE d'affiches publicitaires. Tu PERSONNALISES un design existant, tu ne crées pas de zéro.");
  } else {
    instructions.push("Tu es un DIRECTEUR ARTISTIQUE et GRAPHISTE DE RENOMMÉE MONDIALE, expert en création d'affiches publicitaires EXCEPTIONNELLES pour l'Afrique francophone.");
    instructions.push("Tu travailles pour les plus grandes marques et événements. Chaque création doit être SPECTACULAIRE et MÉMORABLE.");
  }
  instructions.push("");

  // ====== MODE CRÉATION LIBRE - DESIGN PROFESSIONNEL AVANCÉ ======
  if (!hasReferenceImage && !isCloneMode) {
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  🎨 CRÉATION LIBRE - NIVEAU DIRECTEUR ARTISTIQUE                      ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    
    instructions.push("🌟 EXCELLENCE VISUELLE OBLIGATOIRE:");
    instructions.push("Tu ne crées PAS une affiche basique. Tu crées une ŒUVRE PUBLICITAIRE digne");
    instructions.push("d'une agence de communication internationale comme Publicis ou Ogilvy.");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("1. 🔤 TYPOGRAPHIE DE MAÎTRE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ TITRE PRINCIPAL: Police BOLD, DISPLAY, spectaculaire");
    instructions.push("     - Effets 3D, ombres portées, reflets métalliques ou dorés");
    instructions.push("     - Dégradés sophistiqués dans les lettres");
    instructions.push("     - Contours lumineux (glow) ou effet néon si approprié");
    instructions.push("     - Taille IMPOSANTE (occupe 20-35% de l'affiche)");
    instructions.push("   ✓ SOUS-TITRES: Polices élégantes complémentaires");
    instructions.push("     - Contraste de styles (sans-serif + script, bold + light)");
    instructions.push("   ✓ DÉTAILS: Polices lisibles, tailles proportionnelles");
    instructions.push("   ✓ JAMAIS de polices basiques comme Arial, Times, Calibri");
    instructions.push("   ✓ Hiérarchie visuelle PARFAITE: œil guidé naturellement");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("2. 🎭 COMPOSITION DYNAMIQUE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Utiliser la règle des tiers ou le nombre d'or");
    instructions.push("   ✓ Points focaux clairement définis");
    instructions.push("   ✓ Flux visuel qui guide le regard");
    instructions.push("   ✓ Équilibre asymétrique dynamique (éviter la symétrie plate)");
    instructions.push("   ✓ Espaces négatifs stratégiques pour respiration");
    instructions.push("   ✓ Superposition de plans (avant-plan, milieu, arrière-plan)");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("3. 🌈 COULEURS ET AMBIANCE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Palette harmonieuse et cohérente (max 3-4 couleurs principales)");
    instructions.push("   ✓ Dégradés sophistiqués (pas de aplats plats)");
    instructions.push("   ✓ Contrastes forts pour lisibilité et impact");
    instructions.push("   ✓ Si palette utilisateur fournie: L'UTILISER OBLIGATOIREMENT");
    instructions.push("   ✓ Sinon: Couleurs vibrantes, africaines, énergiques");
    instructions.push("   ✓ Ambiance cohérente avec le sujet (festive, spirituelle, pro...)");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("4. ✨ EFFETS ET FINITIONS PREMIUM:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Effets de lumière: rayons, halos, lens flares, bokeh");
    instructions.push("   ✓ Particules flottantes (étoiles, confettis, poussière lumineuse)");
    instructions.push("   ✓ Textures subtiles (grain, motifs africains stylisés)");
    instructions.push("   ✓ Ombres réalistes et profondeur");
    instructions.push("   ✓ Bordures ou cadres décoratifs si approprié");
    instructions.push("   ✓ Éléments graphiques (formes géométriques, lignes dynamiques)");
    instructions.push("   ✓ Effet de brillance ou métallique sur éléments clés");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("5. 👤 PERSONNAGES (si nécessaires):");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Africains authentiques, traits réalistes et beaux");
    instructions.push("   ✓ Expressions dynamiques et engageantes");
    instructions.push("   ✓ Vêtements appropriés au contexte (tenue traditionnelle, moderne, pro)");
    instructions.push("   ✓ Éclairage professionnel (studio quality)");
    instructions.push("   ✓ Intégration harmonieuse avec le fond");
    instructions.push("");
    
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("6. 🎯 STYLES SELON LE CONTEXTE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ÉGLISE/SPIRITUEL:");
    instructions.push("     - Tons dorés, violets profonds, bleus célestes");
    instructions.push("     - Rayons de lumière divine, nuages, étoiles");
    instructions.push("     - Typographie majestueuse avec effets dorés");
    instructions.push("   CONCERT/ÉVÉNEMENT:");
    instructions.push("     - Couleurs vives, néons, effets disco/lumière");
    instructions.push("     - Énergie dynamique, mouvement");
    instructions.push("     - Police bold, moderne, impactante");
    instructions.push("   RESTAURANT/FOOD:");
    instructions.push("     - Couleurs chaudes (orange, rouge, jaune)");
    instructions.push("     - Photos de plats appétissants");
    instructions.push("     - Style gourmand et invitant");
    instructions.push("   FORMATION/PRO:");
    instructions.push("     - Couleurs corporate (bleu, vert, gris)");
    instructions.push("     - Design épuré mais sophistiqué");
    instructions.push("     - Crédibilité et professionnalisme");
    instructions.push("   E-COMMERCE/PROMO:");
    instructions.push("     - Badges promo, prix barrés, pourcentages");
    instructions.push("     - Couleurs qui attirent l'œil (rouge, jaune)");
    instructions.push("     - Urgence et action");
    instructions.push("");
    
    instructions.push("❌ INTERDIT EN MODE CRÉATION LIBRE:");
    instructions.push("   - Designs plats, basiques, sans effets");
    instructions.push("   - Texte simple sans style typographique");
    instructions.push("   - Fonds unis sans texture ni profondeur");
    instructions.push("   - Compositions ennuyeuses et prévisibles");
    instructions.push("   - Manque de hiérarchie visuelle");
    instructions.push("   - Couleurs ternes ou mal assorties");
    instructions.push("");
    
    // ====== INJECTION DES COMPÉTENCES GRAPHISTES EXPERTS ======
    // Détection automatique du domaine à partir du prompt utilisateur
    const detectedDomain = detectDomainFromPrompt(userPrompt);
    console.log(`Expert skills: Detected domain "${detectedDomain}" for prompt`);
    
    // Injection des compétences spécifiques au domaine
    const expertSkillsPrompt = buildExpertSkillsPrompt(detectedDomain);
    instructions.push(expertSkillsPrompt);
    instructions.push("");
  }

  // ====== RÈGLE FONDAMENTALE: PERSONNALISATION FIDÈLE ======
  if (hasReferenceImage) {
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  🎯 PERSONNALISATION FIDÈLE D'UN DESIGN EXISTANT                      ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    instructions.push("⚠️ RÈGLE FONDAMENTALE: Tu PERSONNALISES le template de référence.");
    instructions.push("   Tu ne crées pas, tu ADAPTES fidèlement.");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("CE QUE TU CONSERVES EXACTEMENT DU TEMPLATE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("1. MISE EN PAGE:");
    instructions.push("   ✓ Disposition exacte des éléments (positions, zones, grille)");
    instructions.push("   ✓ Marges, espacements, alignements identiques");
    instructions.push("   ✓ Proportions et équilibre visuel");
    instructions.push("");
    instructions.push("2. TYPOGRAPHIE:");
    instructions.push("   ✓ Style de police (ou très similaire)");
    instructions.push("   ✓ Tailles relatives (titre grand, détails petits)");
    instructions.push("   ✓ Effets sur texte (ombres, contours, dégradés)");
    instructions.push("   ✓ Positions des zones de texte");
    instructions.push("");
    instructions.push("3. ÉLÉMENTS GRAPHIQUES:");
    instructions.push("   ✓ Formes décoratives (cercles, lignes, cadres, motifs)");
    instructions.push("   ✓ Effets lumineux (flares, halos, reflets)");
    instructions.push("   ✓ Textures et dégradés de fond");
    instructions.push("   ✓ Cadres et bordures");
    instructions.push("");
    instructions.push("4. STRUCTURE:");
    instructions.push("   ✓ Si personnage à gauche → personnage à gauche");
    instructions.push("   ✓ Si bandeau en bas → bandeau en bas");
    instructions.push("   ✓ Si logo en haut → logo en haut");
    instructions.push("");
    
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  🎨 HARMONISATION PROFESSIONNELLE DE LA PALETTE UTILISATEUR           ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    instructions.push("⚠️ RÈGLE ABSOLUE: Utiliser UNIQUEMENT les couleurs fournies par l'utilisateur.");
    instructions.push("   Les couleurs du template original doivent être TOTALEMENT REMPLACÉES.");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("SYSTÈME D'ATTRIBUTION DES COULEURS (Règle 60-30-10):");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   • Couleur #1 (60%): DOMINANTE → Arrière-plan, grandes zones, fonds");
    instructions.push("   • Couleur #2 (30%): SECONDAIRE → Titres principaux, accents forts");
    instructions.push("   • Couleur #3 (10%): HIGHLIGHT → Détails, bordures, CTA, éléments clés");
    instructions.push("   • Couleurs supplémentaires: Dégradés, variations, effets subtils");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("TECHNIQUES D'HARMONISATION PROFESSIONNELLES:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Si les couleurs sont similaires (même famille):");
    instructions.push("     → Créer des variations de saturation/luminosité pour différencier");
    instructions.push("     → Ajouter des dégradés subtils entre elles");
    instructions.push("");
    instructions.push("   ✓ Si les couleurs sont contrastées (complémentaires):");
    instructions.push("     → Utiliser la plus sombre pour le fond");
    instructions.push("     → Réserver la plus vive pour les accents");
    instructions.push("     → Ajouter une couleur neutre (noir/blanc/gris) pour équilibrer");
    instructions.push("");
    instructions.push("   ✓ Si les couleurs ne se mélangent pas naturellement:");
    instructions.push("     → AJOUTER DU BLANC comme séparateur/harmonisateur (le blanc passe avec tout)");
    instructions.push("     → Ajouter des effets de lumière (glow, reflets) pour unifier");
    instructions.push("     → Créer des dégradés doux entre les zones de couleur");
    instructions.push("     → Utiliser des ombres pour séparer visuellement les éléments");
    instructions.push("     → Ajouter une texture ou un overlay pour créer de la cohésion");
    instructions.push("");
    instructions.push("   ✓ Pour garantir la lisibilité:");
    instructions.push("     → Texte clair sur fond foncé OU texte foncé sur fond clair");
    instructions.push("     → Contours/ombres sur le texte si le contraste est faible");
    instructions.push("     → Jamais de texte coloré sur fond de couleur proche");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("🚨 COMBINAISONS INTERDITES (FONT MAL AUX YEUX):");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ❌ Texte BLEU sur fond ORANGE (vibration optique, illisible)");
    instructions.push("   ❌ Texte ROUGE sur fond VERT vif (effet sapin de Noël)");
    instructions.push("   ❌ Texte JAUNE sur fond VIOLET (contraste agressif)");
    instructions.push("   ❌ Couleurs complémentaires en contact direct sans séparation");
    instructions.push("   ❌ Deux couleurs saturées côte à côte sans espace neutre");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("💡 SOLUTION UNIVERSELLE: LE BLANC COMME HARMONISATEUR");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ✓ Le BLANC passe avec TOUTES les couleurs");
    instructions.push("   ✓ Ajouter du blanc entre deux couleurs qui clashent");
    instructions.push("   ✓ Bordure blanche (3-6px) autour du texte sur fond coloré");
    instructions.push("   ✓ Zones blanches ou crème pour aérer le design");
    instructions.push("   ✓ Rectangle blanc derrière le texte si le fond est trop vif");
    instructions.push("   ✓ Le NOIR fonctionne aussi comme séparateur neutre");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("❌ INTERDIT ABSOLUMENT:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("   ❌ Garder UNE SEULE couleur du template original");
    instructions.push("   ❌ Mélanger les couleurs du template avec celles de l'utilisateur");
    instructions.push("   ❌ Ignorer une couleur fournie par l'utilisateur");
    instructions.push("   ❌ Créer un design où les couleurs sont mal agencées/illisibles");
    instructions.push("   ❌ Poser des couleurs qui clashent sans utiliser le blanc pour séparer");
    instructions.push("");
    
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  ⚠️ RÈGLE ABSOLUE: ZÉRO INFORMATION ORIGINALE SUR L'AFFICHE FINALE   ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    instructions.push("🚨 COMPRENDRE LA MISSION:");
    instructions.push("   Tu analyses l'INGÉNIERIE GRAPHIQUE du template (mise en page, effets,");
    instructions.push("   typographie, compositions, style visuel) pour la REPRODUIRE avec");
    instructions.push("   UNIQUEMENT les données du client. C'est un TRANSFERT DE COMPÉTENCES.");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("🧹 SUPPRESSION TOTALE - TOUT CE QUI N'EST PAS FOURNI DOIT DISPARAÎTRE:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("");
    instructions.push("❌ LOGOS: Si l'utilisateur n'a PAS fourni de logo → AUCUN logo sur l'affiche");
    instructions.push("   (supprimer complètement les logos du template original)");
    instructions.push("");
    instructions.push("❌ TEXTES: Tous les textes du template (noms, slogans, descriptions)");
    instructions.push("   → SUPPRIMER et remplacer UNIQUEMENT par ce que le client a fourni");
    instructions.push("   → Si le client n'a pas fourni d'équivalent → zone VIDE ou supprimée");
    instructions.push("");
    instructions.push("❌ NUMÉROS DE TÉLÉPHONE: Ceux du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT le numéro du client s'il l'a fourni");
    instructions.push("");
    instructions.push("❌ DATES/HORAIRES: Celles du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT les dates du client s'il les a fournies");
    instructions.push("");
    instructions.push("❌ LIEUX/ADRESSES: Ceux du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT le lieu du client s'il l'a fourni");
    instructions.push("");
    instructions.push("❌ PRIX/TARIFS: Ceux du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT les prix du client s'il les a fournis");
    instructions.push("");
    instructions.push("❌ NOMS/PERSONNES: Les orateurs/artistes du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT les noms fournis par le client");
    instructions.push("   → Si le template a 3 personnes mais le client en fournit 1:");
    instructions.push("     • Option 1: Afficher seulement la personne du client");
    instructions.push("     • Option 2: Si le client a demandé, générer les autres automatiquement");
    instructions.push("");
    instructions.push("❌ RÉSEAUX SOCIAUX: Les handles du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT ceux du client s'il les a fournis");
    instructions.push("");
    instructions.push("❌ EMAILS/SITES WEB: Ceux du template → EFFACER TOTALEMENT");
    instructions.push("   → Afficher UNIQUEMENT ceux du client s'il les a fournis");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("🎯 CE QUE TU REPRODUIS (L'INGÉNIERIE GRAPHIQUE):");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("✓ Le LAYOUT exact (positions des zones de texte, images, éléments)");
    instructions.push("✓ Le STYLE typographique (polices stylisées, effets 3D, ombres, glow)");
    instructions.push("✓ La COMPOSITION (équilibre, hiérarchie, points focaux)");
    instructions.push("✓ Les EFFETS VISUELS (lumières, particules, dégradés, textures)");
    instructions.push("✓ Les ÉLÉMENTS DÉCORATIFS (cadres, formes, motifs - sans contenu)");
    instructions.push("✓ L'AMBIANCE et la PALETTE (ou la palette client si fournie)");
    instructions.push("");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("⛔ INTERDIT ABSOLUMENT:");
    instructions.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    instructions.push("❌ Laisser le MOINDRE texte, numéro, nom, logo du template original");
    instructions.push("❌ Inventer des informations que le client n'a pas fournies");
    instructions.push("❌ Garder partiellement des éléments du template (ex: numéro tronqué)");
    instructions.push("❌ Conserver un logo du template même 'discrètement'");
    instructions.push("❌ Mélanger les informations du template avec celles du client");
    instructions.push("");
    instructions.push("🎯 RÉSULTAT FINAL:");
    instructions.push("   L'affiche générée = DESIGN du template + CONTENU du client UNIQUEMENT");
    instructions.push("   → Si quelqu'un regarde l'affiche, il ne doit voir AUCUNE trace");
    instructions.push("   → de l'ancienne affiche, seulement les informations du nouveau client.");
    instructions.push("");
  }

  // ====== RÈGLE SUR LE CONTENU UTILISATEUR ======
  instructions.push("=== CONTENU À AFFICHER (ET RIEN D'AUTRE) ===");
  instructions.push("⚠️ AFFICHER UNIQUEMENT ces informations fournies par l'utilisateur:");
  instructions.push("- Titre → affiché en grand et lisible");
  instructions.push("- Dates/Horaires → SI FOURNIS par l'utilisateur");
  instructions.push("- Lieu/Adresse → SI FOURNI par l'utilisateur");
  instructions.push("- Contact → SI FOURNI par l'utilisateur");
  instructions.push("- Prix → SI FOURNIS par l'utilisateur");
  instructions.push("- Orateurs/Artistes → SI FOURNIS par l'utilisateur");
  instructions.push("");
  instructions.push("❌ INTERDIT: Afficher des infos NON fournies par l'utilisateur");
  instructions.push("❌ INTERDIT: Inventer ou conserver des infos du template original");
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
    instructions.push("⚠️ Reproduire le logo EXACTEMENT comme fourni, sans aucune modification.");
    instructions.push("   Ne pas réinventer, recréer ou modifier le logo.");
    instructions.push("");
  }

  if (hasContentImage) {
    instructions.push("PHOTO PRINCIPALE: Utiliser l'image de contenu fournie comme visuel central.");
    instructions.push("");
  }

  // ====== QUALITÉ AFRICAINE ======
  instructions.push("=== STYLE ===");
  instructions.push("- Personnages: Africains authentiques avec traits réalistes");
  instructions.push("- Couleurs: UTILISER LA PALETTE FOURNIE (ou vibrantes si non fournie)");
  instructions.push("- Texte: Français");
  instructions.push("");

  // ====== CONTENU UTILISATEUR ======
  instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
  instructions.push("║  CONTENU CLIENT À AFFICHER (REMPLACER LE TEXTE DU TEMPLATE)           ║");
  instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
  instructions.push("");
  instructions.push(userPrompt);
  instructions.push("");
  instructions.push("═══════════════════════════════════════════════════════════════════════");
  instructions.push("");
  if (hasReferenceImage) {
    instructions.push("╔═══════════════════════════════════════════════════════════════════════╗");
    instructions.push("║  🎯 RAPPEL FINAL - CLONAGE FIDÈLE AVEC CONTENU CLIENT UNIQUEMENT      ║");
    instructions.push("╚═══════════════════════════════════════════════════════════════════════╝");
    instructions.push("");
    instructions.push("1. ✅ REPRODUIRE exactement le DESIGN et LAYOUT du template");
    instructions.push("2. ✅ APPLIQUER les couleurs de l'utilisateur (si fournies)");
    instructions.push("3. ✅ AFFICHER uniquement le contenu fourni par le client ci-dessus");
    instructions.push("4. ⛔ SUPPRIMER TOTALEMENT tout texte/logo/info du template original");
    instructions.push("5. ⛔ NE RIEN INVENTER - si le client n'a pas fourni, la zone est vide/supprimée");
    instructions.push("");
    instructions.push("🚨 VÉRIFICATION FINALE:");
    instructions.push("   Avant de générer, vérifie que RIEN du template original ne reste:");
    instructions.push("   - Aucun logo de l'ancien template");
    instructions.push("   - Aucun numéro de téléphone de l'ancien template");
    instructions.push("   - Aucun nom/titre de l'ancien template");
    instructions.push("   - Aucune date/lieu de l'ancien template");
    instructions.push("   - L'affiche doit sembler 100% nouvelle, créée pour CE client");
  } else {
    instructions.push("🎯 RAPPEL FINAL - CRÉATION LIBRE:");
    instructions.push("   1. Design SPECTACULAIRE niveau agence internationale");
    instructions.push("   2. Typographie STYLISÉE avec effets (3D, ombres, dégradés, glow)");
    instructions.push("   3. Composition DYNAMIQUE et professionnelle");
    instructions.push("   4. Effets visuels PREMIUM (lumières, particules, textures)");
    instructions.push("   5. Afficher UNIQUEMENT les éléments listés ci-dessus");
    instructions.push("   6. Si palette couleur fournie: L'UTILISER obligatoirement");
    instructions.push("   7. INTERDIT: design basique, plat, ou amateur");
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
  console.log("Resolution requested:", resolution);
  console.log("Aspect ratio:", aspectRatio);
  console.log("Image inputs count:", imageInputs.length);
  console.log("Output format:", outputFormat);

  // The Kie AI API expects resolution as "1K", "2K", or "4K"
  // Ensure we're passing the correct format
  const validResolution = ["1K", "2K", "4K"].includes(resolution) ? resolution : "2K";
  
  const requestBody = {
    model: "nano-banana-pro",
    input: {
      prompt: prompt,
      image_input: imageInputs,
      aspect_ratio: aspectRatio,
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
  maxAttempts: number = 150, // Increased for 4K which takes much longer
  baseIntervalMs: number = 2000  // Base polling interval
): Promise<string> {
  // Adjust timeouts based on resolution - 4K takes significantly longer
  const resolutionConfig: Record<string, { maxAttempts: number; baseInterval: number }> = {
    "1K": { maxAttempts: 80, baseInterval: 2000 },
    "2K": { maxAttempts: 120, baseInterval: 2000 },
    "4K": { maxAttempts: 200, baseInterval: 2500 }, // 4K needs more time (~8+ min timeout)
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

const MAX_PROMPT_LENGTH = 5000;
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
      // Créer un client avec le token de l'utilisateur pour vérifier son identité
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      // Utiliser getClaims pour valider le JWT (plus fiable que getUser)
      const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
        console.log("Authenticated user via claims:", userId);
      } else {
        // Fallback vers getUser si getClaims échoue
        console.log("getClaims failed, trying getUser:", claimsError?.message);
        const { data: { user }, error: authError } = await userSupabase.auth.getUser();
        
        if (!authError && user) {
          userId = user.id;
          console.log("Authenticated user via getUser:", userId);
        } else {
          console.log("Auth error or no user:", authError?.message);
        }
      }
    }

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
      scenePreference, // Nouvelle prop pour les préférences de mise en scène YouTube
      domain, // Domaine passé par le client
    } = body;

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
    
    const professionalPrompt = buildProfessionalPrompt({
      userPrompt: prompt + (logoPositionText ? ` ${logoPositionText}` : "") + scenePreferenceText,
      hasReferenceImage: !!referenceImage,
      hasContentImage: !!contentImage,
      hasLogoImage: logoImages && logoImages.length > 0,
      aspectRatio,
      isCloneMode,
    });

    console.log("Professional prompt built, length:", professionalPrompt.length);
    console.log("Scene preference included:", scenePreference ? "yes" : "no");
    console.log("Domain:", domain || "not specified");

    const taskId = await createTask(
      KIE_API_KEY,
      professionalPrompt,
      imageInputs,
      aspectRatio,
      resolution,
      outputFormat
    );

    const resultUrl = await pollForResult(KIE_API_KEY, taskId, resolution);

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
