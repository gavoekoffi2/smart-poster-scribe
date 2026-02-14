// ============================================================================
// STANDARDS PROFESSIONNELS DU GRAPHISME - RÈGLES FONDAMENTALES
// ============================================================================
// Ces règles UNIVERSELLES s'appliquent à TOUS les designs, tous domaines confondus
// Inspiré des standards de l'industrie graphique professionnelle (15+ ans expérience)
// ============================================================================

export interface ProfessionalStandard {
  id: string;
  name: string;
  rules: string[];
}

// Les 7 Piliers du Design - Version condensée
export const DESIGN_PILLARS: ProfessionalStandard = {
  id: "design_pillars",
  name: "7 Piliers du Design",
  rules: [
    "HIÉRARCHIE: Élément principal 20-25% surface, secondaire 15-18%, tertiaire 8-12%",
    "HIÉRARCHIE: Ratio taille entre niveaux 5:2:1 minimum, titre 2x plus grand que sous-titre",
    "CONTRASTE: Ratio minimum 3:1 (taille), Bold (700-900) vs Light (300-400)",
    "CONTRASTE: Différences DRAMATIQUES jamais subtiles - évident au premier coup d'œil",
    "ALIGNEMENT: Grille 12 colonnes invisible, espacement multiples de 10px",
    "ALIGNEMENT: Interligne 120-150% taille police, JAMAIS d'éléments flottants",
    "RÉPÉTITION: Éléments similaires = style identique (taille, police, coins arrondis, ombres)",
    "PROPORTION: Golden Ratio 1:1.618, division 60/40 ou 70/30, règle des tiers",
    "MOUVEMENT: Parcours Z ou F, guide l'œil: Accroche→Titre→Sous-titre→Détails→CTA→Contact",
    "ESPACE BLANC: 30-50% de la composition DOIT rester vide, marges min 5%",
  ],
};

// Standards Typographiques - Version condensée
export const TYPOGRAPHY_STANDARDS: ProfessionalStandard = {
  id: "typography",
  name: "Standards Typographiques",
  rules: [
    "MAX 2-3 polices: 1 titre (Sans-serif BOLD), 1 corps (Serif/Sans regular), 1 accent (Script)",
    "INTERDITS: Comic Sans, Papyrus, polices fantaisie illisibles, 4+ polices",
    "TAILLES: Titre 50-80pt, Sous-titre 24-36pt, Corps min 14pt, Footer 10-12pt",
    "RATIO: Titre vs Sous-titre min 2:1, Sous-titre vs Corps min 1.5:1",
    "MAJUSCULES: +5 à +10% espacement lettres obligatoire",
    "LONGUEUR LIGNE: 40-60 caractères optimal, max 80, diviser si trop long",
    "ALIGNEMENT: Corps texte TOUJOURS gauche, JAMAIS centrer paragraphes longs",
  ],
};

// Règle des couleurs - Version condensée
export const COLOR_STANDARDS: ProfessionalStandard = {
  id: "colors",
  name: "Standards Couleurs",
  rules: [
    "RÈGLE 60-30-10: Dominante 60%, Accent primaire 30%, Highlight 10%",
    "MAX 3-5 couleurs totales (neutrales incluses), au-delà = chaos visuel",
    "HARMONIES: Monochromatique, Analogique, Complémentaire, Triadique",
    "CONTRASTES WCAG: Texte normal min 4.5:1, Texte large min 3:1",
    "PSYCHOLOGIE: Rouge=urgence, Bleu=confiance, Vert=nature, Jaune=optimisme",
    "PSYCHOLOGIE: Orange=énergie, Violet=luxe, Noir=élégance, Blanc=pureté",
  ],
};

// Règles Images et Éléments - Version condensée
export const IMAGE_STANDARDS: ProfessionalStandard = {
  id: "images",
  name: "Standards Images",
  rules: [
    "RÉSOLUTION: 300 DPI minimum impression, JAMAIS pixelisé ou flouté",
    "PROPORTIONS: JAMAIS étirer une image, maintenir ratio original",
    "PHOTOS: Haute qualité uniquement, regard vers contenu ou spectateur",
    "COINS ARRONDIS: Cohérence 15-25px partout (moderne) ou 0px (classique)",
    "OMBRES: Direction unique 135°, flou 15-30px, opacité 15-30%",
    "BORDURES: Épaisseur cohérente 1-3px (fine) ou 4-6px (moyenne)",
  ],
};

// Checklist Qualité - Version condensée
export const QA_CHECKLIST: ProfessionalStandard = {
  id: "qa",
  name: "Checklist Qualité",
  rules: [
    "✓ Message compris en moins de 3 secondes ?",
    "✓ Hiérarchie visuelle immédiatement claire ?",
    "✓ 30-50% d'espace blanc respecté ?",
    "✓ Tous éléments alignés sur grille invisible ?",
    "✓ Maximum 3-4 couleurs utilisées ?",
    "✓ Contraste texte/fond suffisant (4.5:1) ?",
    "✓ Aucune image pixelisée ou étirée ?",
    "✓ CTA clair et visible ?",
  ],
};

// Erreurs Fatales - Version condensée
export const FATAL_ERRORS: ProfessionalStandard = {
  id: "errors",
  name: "Erreurs Fatales Interdites",
  rules: [
    "🚫 JAMAIS étirer une image (distorsion)",
    "🚫 JAMAIS 4+ polices différentes",
    "🚫 JAMAIS texte < 14pt corps",
    "🚫 JAMAIS contraste < 4.5:1 texte normal",
    "🚫 JAMAIS < 30% espace blanc",
    "🚫 JAMAIS images pixelisées ou floues",
    "🚫 JAMAIS marges < 5%",
    "🚫 JAMAIS centrer longs paragraphes",
    "🚫 JAMAIS ombres directions différentes",
    "🚫 JAMAIS éléments non-alignés sur grille",
  ],
};

/**
 * Génère le prompt des standards professionnels
 * Version ULTRA-CONDENSÉE pour respecter les limites de tokens
 */
export function buildProfessionalStandardsPrompt(): string {
  const lines: string[] = [];
  
  lines.push("═══ 🎓 STANDARDS GRAPHISTE PROFESSIONNEL (15+ ANS EXPÉRIENCE) ═══");
  lines.push("");
  
  // Piliers du design (sélection des plus critiques)
  lines.push("【HIÉRARCHIE】Titre 2x+ sous-titre | Ratio 5:2:1 | Point d'entrée haut-gauche");
  lines.push("【CONTRASTE】Dramatique, jamais subtil | Bold vs Light | Ratio 3:1 tailles");
  lines.push("【ALIGNEMENT】Grille 12 colonnes | Espacement ×10px | Jamais flottant");
  lines.push("【ESPACE BLANC】30-50% obligatoire | Marges ≥5% | Respiration visuelle");
  lines.push("【PROPORTION】Golden Ratio 1:1.618 | Règle des tiers | 60/40 ou 70/30");
  lines.push("");
  
  // Typographie critique
  lines.push("【TYPO】Max 2-3 polices | Titre 50-80pt | Corps ≥14pt | Ratio 2:1 niveaux");
  lines.push("【TYPO】Ligne max 80 car | Corps aligné gauche | Majuscules +10% espacement");
  lines.push("【TYPO DESIGN】JAMAIS de texte plat/basique | Titres avec effets 3D, ombres épaisses, contours, dégradés, glow ou metallic | Texte = élément graphique designé");
  lines.push("【LAYOUT PRO】Courbes, vagues, arcs, formes organiques pour structurer | Bandeaux obliques, rubans 3D | Séparateurs décoratifs | Superposition de couches avec profondeur");
  lines.push("");
  
  // Couleurs critique
  lines.push("【COULEURS】Règle 60-30-10 | Max 3-5 couleurs | Contraste WCAG 4.5:1");
  lines.push("");
  
  // Erreurs critiques (les plus importantes)
  lines.push("【INTERDIT】Étirer images | 4+ polices | Texte <14pt | Marges <5% | Pas grille");
  lines.push("");
  
  return lines.join("\n");
}

/**
 * Version complète pour logs/debug uniquement
 */
export function getFullStandardsForDebug(): string {
  const all = [
    DESIGN_PILLARS,
    TYPOGRAPHY_STANDARDS,
    COLOR_STANDARDS,
    IMAGE_STANDARDS,
    QA_CHECKLIST,
    FATAL_ERRORS,
  ];
  
  return all.map(std => `\n${std.name}:\n${std.rules.join("\n")}`).join("\n");
}
