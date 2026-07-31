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
 * Polices d'accent (3ᵉ famille) : utilisée UNIQUEMENT sur des micro-éléments
 * (badge, date, prix, tag, mention "NEW", numéro) pour créer du contraste premium.
 */
export const ACCENT_FONTS: Array<{ name: string; treatment: string; pairsWith: string[] }> = [
  { name: "Bebas Neue", treatment: "casse haute, tracking large, petits labels/dates", pairsWith: ["editorial-classic", "luxury-serif", "organic-warm", "lora-nunito", "libre-ibm"] },
  { name: "JetBrains Mono", treatment: "majuscules, chiffres tabulaires, badges & prix", pairsWith: ["tech-geometric", "urbanist-epilogue", "outfit-figtree", "sora-manrope", "syne-jakarta"] },
  { name: "Playfair Display Italic", treatment: "italique fine sur 1 à 3 mots d'accroche", pairsWith: ["bold-modern", "brutalist", "bebas-barlow", "tech-geometric", "urbanist-epilogue"] },
  { name: "Cormorant Garamond Italic", treatment: "italique élégante sur une accroche courte", pairsWith: ["bold-modern", "outfit-figtree", "sora-manrope", "mono-technical"] },
  { name: "Archivo Black", treatment: "bloc massif sur un chiffre ou un mot-clé unique", pairsWith: ["editorial-classic", "instrument-worksans", "dm-serif-fira", "lora-nunito"] },
  { name: "Space Mono", treatment: "petites capitales espacées pour tags & coordonnées", pairsWith: ["retro-poster", "abril-cabin", "libre-ibm", "organic-warm"] },
];

export function pickAccentFont(duo: TypographyDuo) {
  const matches = ACCENT_FONTS.filter((f) => f.pairsWith.includes(duo.id));
  const pool = matches.length > 0 ? matches : ACCENT_FONTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Construit le brief typographique injecté dans le prompt de génération.
 * Objectif : DIVERSITÉ typographique maîtrisée (2 familles principales + 1 accent)
 * avec variation de graisses, casses et styles — rendu premium type studio.
 */
export function buildTypographyBrief(duo: TypographyDuo): string {
  const accent = pickAccentFont(duo);
  const lines: string[] = [];
  lines.push(`═══ 🔤 SYSTÈME TYPOGRAPHIQUE IMPOSÉ (${duo.mood}) ═══`);
  lines.push(`• TITRE / DISPLAY → "${duo.display.name}" — ${duo.display.treatment}.`);
  lines.push(`• SOUS-TITRE / ACCROCHE → "${duo.display.name}" (variante Regular / Italique) OU "${duo.body.name}" en Semibold.`);
  lines.push(`• CORPS / INFOS → "${duo.body.name}" — ${duo.body.treatment}.`);
  lines.push(`• ACCENT (3ᵉ police, obligatoire mais LIMITÉE) → "${accent.name}" — ${accent.treatment}. À utiliser sur 1 à 3 micro-éléments MAXIMUM (date, prix, badge, numéro, tag, mention spéciale).`);
  lines.push(`• DIVERSITÉ OBLIGATOIRE : l'affiche doit montrer au moins 5 traitements typographiques distincts (ex. Black casse haute / Regular casse mixte / Italique / Small caps trackées / Light grande taille). Une affiche mono-police ou mono-graisse est REFUSÉE.`);
  lines.push(`• Varier délibérément : graisses (Light→Black), casses (UPPERCASE / Sentence case / small caps), tracking (serré sur titres, large sur labels), et 1 mot-clé mis en valeur (italique, couleur accent ou taille XXL).`);
  lines.push(`• LIMITE STRICTE : 3 familles maximum au total (${duo.display.name}, ${duo.body.name}, ${accent.name}). Aucune 4ᵉ police, aucune substitution générique (pas d'Arial/Helvetica/Times par défaut).`);
  lines.push(`• Hiérarchie : Titre ≥ 2.5× sous-titre ; sous-titre ≥ 1.6× corps ; accent ≤ 0.8× corps sauf si c'est un chiffre vedette.`);
  lines.push(`═══ 📏 ÉCHELLE DE TEXTE — LISIBILITÉ IMPOSANTE (RÈGLE CRITIQUE) ═══`);
  lines.push(`• TITRE PRINCIPAL : hauteur de casse = 12-18% de la hauteur de l'affiche, largeur du lockup = 70-90% de la largeur utile. Il doit être lisible sur une miniature de 200px.`);
  lines.push(`• SOUS-TITRE / ACCROCHE : 5-8% de la hauteur de l'affiche.`);
  lines.push(`• INFOS CLÉS (date, heure, lieu, prix, téléphone) : minimum 3.5% de la hauteur de l'affiche, en graisse Semibold/Bold — JAMAIS en texte fin minuscule.`);
  lines.push(`• TEXTE LE PLUS PETIT DE L'AFFICHE (mentions, site web, hashtags) : jamais en dessous de 2.2% de la hauteur de l'affiche.`);
  lines.push(`• INTERDIT : blocs de texte minuscules, paragraphes denses, listes de détails en corps réduit illisibles. Résumer en 3-6 lignes courtes et grandes plutôt que 12 lignes petites.`);
  lines.push(`• Si le contenu est trop long pour rester grand : réduire le nombre de mots, agrandir la police — jamais l'inverse.`);
  lines.push(`• Chaque texte doit rester lisible une fois l'affiche affichée en petit format sur smartphone (test miniature obligatoire).`);
  lines.push(`• Cohérence : toutes les infos de même nature partagent EXACTEMENT le même style (pas de mélange aléatoire).`);
  return lines.join("\n");
}


// ============================================================================
// SAVOIR-FAIRE TYPOGRAPHIQUE DES GRAPHISTES PRO (inspiration métier)
// ============================================================================
// Techniques réellement utilisées par les directeurs artistiques / graphistes
// affiche : la police n'est pas "posée", elle est COMPOSÉE (lockup).
// ============================================================================

export const DESIGNER_TYPE_TECHNIQUES: string[] = [
  "LOCKUP EMPILÉ : titre découpé en 2-3 lignes de largeurs égales (justification optique), interlignage serré 0.85-0.95, chaque ligne dans une graisse/casse différente.",
  "MOT-VEDETTE : un seul mot du titre en police display XXL, les autres mots réduits 40-60% en small caps trackées — contraste d'échelle brutal.",
  "TYPE AS IMAGE : le titre déborde volontairement du cadre ou passe DERRIÈRE le sujet détouré (chevauchement texte/photo) pour créer de la profondeur.",
  "BLOC MASSE : bloc typographique plein (fond coloré derrière le texte, padding serré) posé comme une étiquette graphique sur la composition.",
  "BASELINE SHIFT : chiffres (date, prix, %) surdimensionnés et alignés en pied de mot, avec exposant en petite capitale mono.",
  "FILET & LABELS : petites capitales trackées (+150) séparées par des filets fins 1px ou des points médians pour les infos secondaires.",
  "COURBE / ARC : une ligne de texte (accroche ou nom d'événement) suit un arc ou une diagonale, le reste reste sur grille stricte.",
  "CONTRE-FORME : titre en outline (contour uniquement) superposé à une version pleine décalée de quelques pixels — effet sérigraphie.",
  "MIXED CASE DRAMATIQUE : Sentence case en display serif pour l'émotion + UPPERCASE condensé pour l'information factuelle.",
  "ANCRAGE : bloc d'infos pratiques (date, lieu, contact) aligné à gauche en colonne étroite, corps 1/6 du titre, interligne 1.4.",
];

// Familles de polices réellement plébiscitées en studio, par registre
export const DESIGNER_FONT_SHELF: Record<string, string[]> = {
  grotesk: ["Helvetica Now Display", "Neue Haas Grotesk", "Inter Display", "Archivo", "Söhne"],
  condensed: ["Bebas Neue", "Anton", "Oswald", "Barlow Condensed", "Druk-like condensed"],
  serif_editorial: ["Playfair Display", "Instrument Serif", "DM Serif Display", "Canela-like", "Cormorant Garamond"],
  geometric: ["Space Grotesk", "Poppins", "Outfit", "Syne", "Sora"],
  mono: ["JetBrains Mono", "Space Mono", "IBM Plex Mono"],
  script: ["Playfair Display Italic", "Cormorant Italic", "signature script (accroche uniquement)"],
};

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length > 0 && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

/**
 * Brief compact "savoir-faire graphiste" : 3 techniques de composition
 * typographique tirées du répertoire pro, à appliquer sur l'affiche.
 */
export function buildTypeCraftBrief(): string {
  const techniques = pickN(DESIGNER_TYPE_TECHNIQUES, 3);
  const lines: string[] = [];
  lines.push("═══ ✒️ SAVOIR-FAIRE TYPOGRAPHIQUE (COMPOSITION DE GRAPHISTE) ═══");
  lines.push("Le texte doit être COMPOSÉ comme un lockup de studio, jamais simplement posé sur le fond.");
  techniques.forEach((t) => lines.push(`• ${t}`));
  lines.push("• Kerning optique sur le titre (pas d'espacement mécanique), veuves/orphelines interdites, césures maîtrisées.");
  return lines.join("\n");
}

/**
 * Déduit une direction typographique à partir des affiches réellement
 * présentes en base (catégories de design + tags des templates du domaine).
 */
export function buildTemplateTypoInspiration(
  templates: Array<{ design_category?: string | null; tags?: string[] | null; description?: string | null }>,
): string {
  if (!templates || templates.length === 0) return "";

  const catCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  for (const t of templates) {
    const c = (t.design_category || "").trim().toLowerCase();
    if (c) catCount.set(c, (catCount.get(c) || 0) + 1);
    for (const raw of t.tags || []) {
      const tag = String(raw).trim().toLowerCase();
      if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

  const cats = top(catCount, 3);
  const tags = top(tagCount, 6);
  if (cats.length === 0 && tags.length === 0) return "";

  const lines: string[] = [];
  lines.push("═══ 🗂️ RÉFÉRENCE STUDIO (affiches réelles de la base) ═══");
  if (cats.length) lines.push(`Styles dominants de ce domaine : ${cats.join(" / ")}.`);
  if (tags.length) lines.push(`Codes visuels récurrents : ${tags.join(", ")}.`);
  lines.push("S'inspirer de ces codes pour le CHOIX et le TRAITEMENT des polices (échelle, graisse, casse, effets), sans copier le contenu de ces affiches.");
  return lines.join("\n");
}
