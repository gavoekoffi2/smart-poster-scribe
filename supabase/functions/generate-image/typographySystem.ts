// ============================================================================
// SYSTÈME DE DUOS TYPOGRAPHIQUES PROFESSIONNELS
// ============================================================================
// Objectif : chaque affiche générée utilise un DUO de polices (display + body)
// choisi dans un catalogue curaté, différent des dernières générations du même
// utilisateur — pour éviter l'uniformité "ChatGPT" et se rapprocher du travail
// d'un vrai graphiste.
// ============================================================================

export interface TypographyDuo {
  id: string;
  mood: string;
  display: { name: string; treatment: string };
  body: { name: string; treatment: string };
  bestFor: string[]; // domaines où ce duo brille particulièrement
}

export const TYPOGRAPHY_DUOS: TypographyDuo[] = [
  {
    id: "editorial-classic",
    mood: "Editorial élégant",
    display: { name: "Playfair Display", treatment: "Black, tracking serré, italique optionnel sur un mot-clé" },
    body: { name: "Inter", treatment: "Regular / Medium, interlignage 1.4" },
    bestFor: ["fashion", "realestate", "restaurant", "event"],
  },
  {
    id: "bold-modern",
    mood: "Bold moderne, impact frontal",
    display: { name: "Bebas Neue", treatment: "Casse haute, tracking serré, taille massive" },
    body: { name: "Work Sans", treatment: "Regular, phrases courtes" },
    bestFor: ["sport", "event", "music", "youtube"],
  },
  {
    id: "luxury-serif",
    mood: "Luxe raffiné, haute couture",
    display: { name: "Cormorant Garamond", treatment: "Light avec grande taille, italique pour accroche" },
    body: { name: "Karla", treatment: "Regular, small caps sur labels" },
    bestFor: ["fashion", "restaurant", "realestate"],
  },
  {
    id: "tech-geometric",
    mood: "Tech géométrique, produit SaaS",
    display: { name: "Space Grotesk", treatment: "Bold, casse mixte, tracking neutre" },
    body: { name: "DM Sans", treatment: "Regular, hiérarchie via graisse" },
    bestFor: ["technology", "education"],
  },
  {
    id: "organic-warm",
    mood: "Organique et chaleureux",
    display: { name: "Fraunces", treatment: "Semibold, ligatures activées, opsz variable" },
    body: { name: "Manrope", treatment: "Regular, contraste doux" },
    bestFor: ["health", "restaurant", "church"],
  },
  {
    id: "brutalist",
    mood: "Brutaliste, statement graphique",
    display: { name: "Archivo Black", treatment: "Casse haute, blocs typographiques massifs" },
    body: { name: "Hind", treatment: "Regular, lignes courtes" },
    bestFor: ["music", "sport", "event", "youtube"],
  },
  {
    id: "retro-poster",
    mood: "Rétro poster années 70",
    display: { name: "Abril Fatface", treatment: "Regular grande taille, courbes prononcées" },
    body: { name: "Cabin", treatment: "Regular, spacing généreux" },
    bestFor: ["event", "music", "restaurant"],
  },
  {
    id: "mono-technical",
    mono: true as unknown as never,
    display: { name: "JetBrains Mono", treatment: "Bold, majuscules, chiffres tabulaires" },
    body: { name: "Work Sans", treatment: "Regular" },
    mood: "Technique mono, esprit dev/creative studio",
    bestFor: ["technology", "education"],
  },
  {
    id: "syne-jakarta",
    mood: "Contemporain premium, agence créative",
    display: { name: "Syne", treatment: "Extra Bold, tracking serré" },
    body: { name: "Plus Jakarta Sans", treatment: "Regular / Medium" },
    bestFor: ["fashion", "technology", "event"],
  },
  {
    id: "instrument-worksans",
    mood: "Serif contemporain sobre",
    display: { name: "Instrument Serif", treatment: "Regular grande taille, italique fine sur accents" },
    body: { name: "Work Sans", treatment: "Regular, hiérarchie stricte" },
    bestFor: ["realestate", "education", "health"],
  },
  {
    id: "dm-serif-fira",
    mood: "Éditorial dramatique",
    display: { name: "DM Serif Display", treatment: "Regular ultra-grand, contrastes forts" },
    body: { name: "Fira Sans", treatment: "Regular / Medium" },
    bestFor: ["restaurant", "event", "church"],
  },
  {
    id: "urbanist-epilogue",
    mood: "Urbain épuré",
    display: { name: "Urbanist", treatment: "Extra Bold, casse mixte" },
    body: { name: "Epilogue", treatment: "Regular" },
    bestFor: ["realestate", "technology", "sport"],
  },
  {
    id: "sora-manrope",
    mood: "Futuriste doux",
    display: { name: "Sora", treatment: "Bold" },
    body: { name: "Manrope", treatment: "Regular" },
    bestFor: ["technology", "education", "health"],
  },
  {
    id: "libre-ibm",
    mood: "Classique institutionnel moderne",
    display: { name: "Libre Baskerville", treatment: "Bold, casse mixte" },
    body: { name: "IBM Plex Sans", treatment: "Regular" },
    bestFor: ["education", "church", "realestate"],
  },
  {
    id: "bebas-barlow",
    mood: "Sportif énergique",
    display: { name: "Bebas Neue", treatment: "Casse haute, massif" },
    body: { name: "Barlow", treatment: "Medium, condensé optionnel" },
    bestFor: ["sport", "event", "youtube"],
  },
  {
    id: "lora-nunito",
    mood: "Chaleureux accessible",
    display: { name: "Lora", treatment: "Bold, italique sur accroche" },
    body: { name: "Nunito Sans", treatment: "Regular" },
    bestFor: ["health", "church", "education"],
  },
  {
    id: "outfit-figtree",
    mood: "Minimal moderne startup",
    display: { name: "Outfit", treatment: "Bold, tracking neutre" },
    body: { name: "Figtree", treatment: "Regular" },
    bestFor: ["technology", "realestate", "formation"],
  },
  {
    id: "abril-cabin",
    mood: "Poster événementiel rétro",
    display: { name: "Abril Fatface", treatment: "Regular, taille XXL" },
    body: { name: "Cabin", treatment: "Regular" },
    bestFor: ["event", "music", "church"],
  },
];

/**
 * Choisit un duo cohérent avec le domaine ET différent des dernières générations.
 * exclude = liste d'IDs récemment utilisés par l'utilisateur.
 */
export function pickTypographyDuo(
  domain: string | null | undefined,
  exclude: string[] = []
): TypographyDuo {
  const dom = (domain || "").toLowerCase();
  const excludeSet = new Set(exclude);

  // 1) Duos qui matchent le domaine ET pas récemment utilisés
  const domainMatches = TYPOGRAPHY_DUOS.filter(
    (d) => d.bestFor.includes(dom) && !excludeSet.has(d.id)
  );
  if (domainMatches.length > 0) {
    return domainMatches[Math.floor(Math.random() * domainMatches.length)];
  }

  // 2) N'importe quel duo pas récemment utilisé
  const fresh = TYPOGRAPHY_DUOS.filter((d) => !excludeSet.has(d.id));
  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)];
  }

  // 3) Fallback : tout le catalogue
  return TYPOGRAPHY_DUOS[Math.floor(Math.random() * TYPOGRAPHY_DUOS.length)];
}

/**
 * Construit le brief typographique injecté dans le prompt de génération.
 * Compact (~350-450 chars) pour ne pas gonfler le prompt.
 */
export function buildTypographyBrief(duo: TypographyDuo): string {
  const lines: string[] = [];
  lines.push(`═══ 🔤 DUO TYPOGRAPHIQUE IMPOSÉ (${duo.mood}) ═══`);
  lines.push(`• TITRE / DISPLAY → "${duo.display.name}" — ${duo.display.treatment}.`);
  lines.push(`• SOUS-TITRE / ACCROCHE → "${duo.display.name}" (variante Regular / italique) OU "${duo.body.name}" en Semibold.`);
  lines.push(`• CORPS / INFOS → "${duo.body.name}" — ${duo.body.treatment}.`);
  lines.push(`• RÈGLE : EXACTEMENT 2 familles typographiques sur toute l'affiche. AUCUNE 3ᵉ police, aucune substitution générique (pas d'Arial/Helvetica/Times par défaut).`);
  lines.push(`• Hiérarchie : Titre ≥ 2.5× sous-titre ; sous-titre ≥ 1.6× corps.`);
  return lines.join("\n");
}
