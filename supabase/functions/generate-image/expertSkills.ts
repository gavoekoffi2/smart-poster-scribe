// ============================================================================
// COMPÉTENCES GRAPHISTES EXPERTS - PROFILES DE DESIGN PROFESSIONNEL
// ============================================================================
// Ces profils définissent les règles de design pour chaque domaine d'activité
// Utilisés par buildProfessionalPrompt en mode création libre (sans template)
// ============================================================================

export interface ExpertSkillProfile {
  id: string;
  name: string;
  applicableDomains: string[];
  composition: string[];
  typography: string[];
  colorSystem: string[];
  colorHarmonization: string[];  // Nouvelles règles d'harmonisation des couleurs utilisateur
  visualElements: string[];
  effects: string[];
  principles: string[];
  errors: string[];
  referenceStyleGuide: string[];  // NOUVEAU: Guide de style visuel concret pour qualité pro
}

// ============================================================================
// PROFIL 1: CORPORATE MODERN
// Applicable à: Formation, Technologie, Éducation, Services Entreprises
// ============================================================================
const CORPORATE_MODERN: ExpertSkillProfile = {
  id: "corporate_modern",
  name: "Corporate Modern",
  applicableDomains: ["formation", "technology", "education", "business_services", "realestate", "health", "other"],
  composition: [
    "Composition asymétrique 60/40 ou 70/30 (jamais centré)",
    "Grille invisible de 12 colonnes pour alignement",
    "Hiérarchie 3 niveaux: Primaire (25-30% surface), Secondaire (18-22%), Tertiaire (12-15%)",
    "Layering: Arrière-plan texturé (10-20% opacité) → Formes colorées → Sujet + Texte",
    "Marges minimum 5% sur tous les côtés",
    "30-40% d'espace vide obligatoire pour respiration",
    "Point focal principal positionné sur intersection des tiers",
  ],
  typography: [
    "Maximum 2-3 familles de polices",
    "Titre: Sans-serif ULTRA-BOLD (Montserrat Black, Poppins ExtraBold)",
    "Sous-titre: Graisse medium, taille 40-50% du titre",
    "Corps: Regular, haute lisibilité, interligne 1.4-1.6",
    "Contraste typographique fort: Très gras + Très fin",
    "Espacement lettres titre: +2 à +5% pour impact",
    "Jamais plus de 3 tailles de police différentes",
  ],
  colorSystem: [
    "Ratio 60-30-10: Dominante (60%), Accent (30%), Highlight (10%)",
    "Palette corporate: Bleu (#0066CC à #004080), Vert (#00875A), Gris (#333-#666)",
    "Tons professionnels et sobres, jamais criards",
    "Dégradés subtils (pas plus de 2 couleurs)",
    "Contrastes élevés pour lisibilité (ratio 4.5:1 minimum)",
    "Blanc ou crème pour espaces négatifs",
  ],
  colorHarmonization: [
    "⚠️ SI PALETTE UTILISATEUR FOURNIE → REMPLACER TOUTES les couleurs du template",
    "Couleur #1 (DOMINANTE 60%): Fonds, grandes zones, éléments principaux",
    "Couleur #2 (SECONDAIRE 30%): Titres, accents, éléments importants",
    "Couleur #3 (ACCENT 10%): Détails, bordures, CTA, highlights",
    "Harmonisation corporate: dégradés subtils entre les couleurs, ombres cohérentes",
    "Si couleurs similaires: variations de luminosité (+/-20%) pour différencier",
    "Si couleurs contrastées: utiliser la plus sombre pour le fond",
    "Garantir lisibilité: texte clair sur fond foncé OU texte foncé sur fond clair",
    "Ajouter blanc/gris neutres si besoin d'équilibre",
    "🚨 COMBINAISONS INTERDITES: bleu/orange, rouge/vert vif, jaune/violet en contact direct",
    "💡 SOLUTION BLANC: Si les couleurs clashent, ajouter du blanc comme séparateur/harmonisateur",
    "⚡ Le blanc passe avec TOUTES les couleurs - l'utiliser généreusement pour créer de l'espace",
  ],
  visualElements: [
    "Formes géométriques simples (cercles, rectangles arrondis)",
    "Icônes flat design avec style cohérent",
    "Photos professionnelles détourées proprement",
    "Cadres et bordures fines (1-2px)",
    "Badges et labels rectangulaires arrondis (15-25px radius)",
    "Lignes de séparation subtiles",
  ],
  effects: [
    "Ombres portées douces: 20-30% opacité, flou 15-25px",
    "Coins arrondis uniformes: 15-25px partout",
    "Overlay de couleur sur photos: 5-15% opacité",
    "Pas d'effets 3D exagérés",
    "Grain photographique subtil: 3-5% opacité",
    "Vignettage léger: 10-15% sur les bords",
  ],
  principles: [
    "Crédibilité et professionnalisme avant tout",
    "Clarté du message en moins de 3 secondes",
    "Équilibre entre espace vide et contenu",
    "Cohérence visuelle absolue entre tous les éléments",
    "Hiérarchie d'information immédiatement compréhensible",
  ],
  errors: [
    "Trop de couleurs (max 3-4)",
    "Typographie décontractée ou ludique",
    "Effets néon ou brillants",
    "Arrière-plans trop chargés",
    "Manque d'espace blanc",
    "Photos de mauvaise qualité",
    "Alignements approximatifs",
  ],
  referenceStyleGuide: [
    "Style visuel des meilleures affiches corporate africaines:",
    "- Fond avec dégradé bleu corporate (#0066CC → #004080) ou vert (#00875A)",
    "- Photo du formateur/expert détourée proprement, positionné à droite (35-40% largeur)",
    "- Titre en Montserrat ExtraBold blanc avec ombre portée douce",
    "- Sous-titre en police light, italique pour contraste",
    "- Badge 'CERTIFICATION' ou 'NOUVEAU' en haut à gauche (rectangle arrondi coloré)",
    "- Icônes professionnelles pour illustrer les bénéfices (max 3-4)",
    "- Footer avec informations (date, lieu, prix) sur fond légèrement plus foncé",
    "- QR Code discret en bas à droite pour inscription",
    "Exemple: 'MASTERCLASS MARKETING DIGITAL' avec formateur en costume",
    "fond bleu marine → bleu ciel dégradé, badge jaune 'PLACES LIMITÉES',",
    "3 icônes blanches (laptop, graphique, cible), prix en badge arrondi vert.",
  ],
};

// ============================================================================
// PROFIL 2: SURRÉALISTE / PHOTORÉALISTE
// Applicable à: Événements, Musique, Sport, E-commerce
// ============================================================================
const SURREALIST_PHOTOREALISTIC: ExpertSkillProfile = {
  id: "surrealist_photorealistic",
  name: "Surréaliste / Photoréaliste",
  applicableDomains: ["event", "music", "sport", "ecommerce", "fashion"],
  composition: [
    "3-5 plans de profondeur avec flou progressif (premier plan net → arrière-plan flouté 60-80%)",
    "Perspectives dynamiques: angle 15-45° pour impact dramatique",
    "Personnages/produits en avant-plan, éléments 3D flottants autour",
    "Scènes impossibles mais physiquement crédibles",
    "Superposition audacieuse de plans avec transparences",
    "Zone héro centrale occupant 50-70% de la surface",
    "Équilibre dynamique asymétrique",
  ],
  typography: [
    "Typographie MASSIVE: 70-120pt pour titres principaux",
    "Multi-color inline: différentes couleurs dans le même mot",
    "Effets 3D prononcés sur titres: extrusion, ombres portées fortes",
    "Contours lumineux (stroke) contrastants",
    "Texte intégré dans la scène (derrière/devant personnages)",
    "Dégradés métalliques ou néon dans les lettres",
    "Distorsion légère du texte pour dynamisme (perspective)",
  ],
  colorSystem: [
    "Haute saturation: 70-100% sur couleurs principales",
    "Palette énergique: Magenta (#FF00FF), Cyan (#00FFFF), Orange vif (#FF6600), Jaune (#FFFF00)",
    "Dégradés audacieux multi-couleurs (sunset, neon, holographique)",
    "Color grading unifié sur toute l'image",
    "Contraste extrême: noirs profonds + couleurs vibrantes",
    "Touches de blanc pur pour highlights",
  ],
  colorHarmonization: [
    "⚠️ SI PALETTE UTILISATEUR FOURNIE → REMPLACER TOUTES les couleurs du template",
    "Couleur #1 (DOMINANTE 60%): Fond principal, zones de base (saturer à 80-100%)",
    "Couleur #2 (SECONDAIRE 30%): Titres 3D, effets glow, accents néon",
    "Couleur #3 (ACCENT 10%): Highlights, lens flares, particules",
    "Harmonisation surréaliste: créer dégradés audacieux entre les couleurs utilisateur",
    "Ajouter effets néon/glow pour unifier des couleurs qui ne se mélangent pas",
    "Color grading: appliquer une teinte unifiée sur toute l'image",
    "Si couleurs ternes fournies: les saturer à +30-50% pour impact",
    "Utiliser reflets et brillances pour créer cohésion visuelle",
    "🚨 COMBINAISONS QUI CLASHENT: bleu texte sur orange fond, rouge sur vert vif",
    "💡 SOLUTION: Ajouter bordure blanche/noire épaisse sur texte pour séparer les couleurs",
    "⚡ Le BLANC ou NOIR en contour crée une barrière visuelle entre couleurs qui clashent",
  ],
  visualElements: [
    "Emojis et objets 3D photoréalistes avec ombres cohérentes",
    "Particules flottantes: confettis, étoiles, étincelles",
    "Éléments en lévitation autour du sujet principal",
    "Textures métalliques, chrome, holographiques",
    "Produits/personnages détourés avec reflets",
    "Formes géométriques 3D (sphères, cubes, tores)",
  ],
  effects: [
    "Motion blur directionnel sur éléments en mouvement",
    "Lens flares et reflets lumineux prononcés",
    "Glow/lueur néon autour des éléments clés (10-20px, 60-80% opacité)",
    "Réflexions au sol ou surfaces brillantes",
    "Bokeh prononcé en arrière-plan",
    "Effets de lumière volumétrique (god rays)",
    "Color grading cinématique final",
  ],
  principles: [
    "Impact visuel immédiat et mémorable",
    "Énergie et dynamisme dans chaque élément",
    "Cohérence de la source lumineuse malgré le surréalisme",
    "Le regard doit être attiré vers le centre/sujet",
    "Créer l'émerveillement et l'excitation",
  ],
  errors: [
    "Scènes plates sans profondeur",
    "Éclairage incohérent entre éléments",
    "Objets flottants sans ombres",
    "Couleurs désaturées ou ternes",
    "Manque de contraste",
    "Typographie basique sans effets",
    "Composition statique et prévisible",
  ],
  referenceStyleGuide: [
    "Style visuel des meilleures affiches événementielles africaines:",
    "- Fond spectaculaire: coucher de soleil, skyline de ville, scène de concert",
    "- Artiste/DJ en avant-plan avec éclairage dramatique, pose dynamique",
    "- Titre MASSIF en 3D avec effets néon, chrome ou holographique",
    "- Multiples plans de profondeur: fond flouté → éléments 3D → artiste → texte",
    "- Particules, confettis, étincelles flottant dans l'air",
    "- Dégradés audacieux magenta-cyan ou orange-violet",
    "- Lens flares et rayons de lumière depuis derrière l'artiste",
    "- Logo sponsors en bas, discret mais visible",
    "Exemple: 'AFROBEAT FESTIVAL 2024' avec artiste bras levés devant foule,",
    "ciel orange-rose coucher de soleil, titre doré 3D avec glow violet,",
    "silhouettes de mains levées en premier plan, confettis dorés tombant.",
  ],
};

// ============================================================================
// PROFIL 3: SPIRITUEL / RELIGIEUX
// Applicable à: Église, Cultes, Événements spirituels
// ============================================================================
const SPIRITUAL_RELIGIOUS: ExpertSkillProfile = {
  id: "spiritual_religious",
  name: "Spirituel / Religieux",
  applicableDomains: ["church"],
  composition: [
    "Division en zones: Titre (40-50% haut), Portrait (30-40% côté droit), Informations (20-25% bas)",
    "Portrait prédicateur/orateur: tiers droit, 35-45% de la hauteur",
    "Arrière-plan: silhouettes floues de fidèles (mains levées, prière)",
    "Overlay sombre 40-60% opacité pour contraste texte",
    "Profondeur: Fond flouté → Overlay → Texte → Portrait net",
    "Source lumineuse principale en haut (lumière divine descendante)",
  ],
  typography: [
    "MIX TYPOGRAPHIQUE OBLIGATOIRE: Script + Sans-serif Bold + Serif",
    "Mots spirituels clés en police Script/Calligraphique (Culte, Grâce, Gloire, Saint-Esprit)",
    "Informations principales en Sans-serif Ultra-Bold",
    "Versets bibliques en Serif élégant + italique",
    "Titre principal: 50-80pt avec effets dorés",
    "Tailles: Titre 50-80pt, Sous-titre 24-36pt, Prédicateur 18-24pt, Infos 16-20pt",
    "Glow doré sur titres importants: 2-4px, couleur or, opacité 60-80%",
  ],
  colorSystem: [
    "PALETTE ROYAUTÉ DIVINE: Bleu royal (#0033AA) + Or (#FFD700) + Blanc",
    "PALETTE FEU DE L'ESPRIT: Rouge (#CC3300) + Orange (#FF6600) + Jaune (#FFCC00)",
    "PALETTE GLOIRE CÉLESTE: Brun/Sépia (#5C4033) + Or + Crème (#FFF8DC)",
    "PALETTE RÉVÉLATION: Vert foncé (#1A4D2E) + Or + Blanc",
    "Dégradés verticaux: Haut lumineux → Bas sombre",
    "Overlay de teinte chaude (or, orange) à 15-25% sur toute l'image",
  ],
  colorHarmonization: [
    "⚠️ SI PALETTE UTILISATEUR FOURNIE → REMPLACER TOUTES les couleurs du template",
    "Couleur #1 (DOMINANTE 60%): Arrière-plan avec overlay 40-60% opacité",
    "Couleur #2 (SECONDAIRE 30%): Titres, bandeaux, effets de lumière divine",
    "Couleur #3 (ACCENT 10%): Rayons de lumière, halos, bordures dorées",
    "Harmonisation spirituelle: ajouter des effets de lumière divine pour unifier",
    "Les couleurs chaudes (or, orange) peuvent servir d'overlay 15-25% pour harmoniser",
    "Créer dégradés verticaux: couleur dominante en haut → plus sombre en bas",
    "Rim light (contour lumineux) utilisant la couleur d'accent autour des portraits",
    "Glow doré sur titres: 2-4px, couleur secondaire, opacité 60-80%",
    "🚨 ÉVITER: texte coloré directement sur fond de couleur similaire ou opposée",
    "💡 SOLUTION BLANC: Ajouter du BLANC pur dans les zones de texte pour garantir lisibilité",
    "⚡ Titres en BLANC avec ombre de couleur dominante = harmonie parfaite en contexte spirituel",
  ],
  visualElements: [
    "Rayons de lumière divine (god rays): angle 15-30°, opacité 20-35%",
    "Halos lumineux autour des titres ou portraits",
    "Particules lumineuses (bokeh, poussière dorée)",
    "Bannières 3D texturées (effet satin/tissu) pour titres",
    "Cercle ou forme arrondie colorée derrière le portrait",
    "Lens flares subtils en haut à gauche/droite",
    "Ornements décoratifs: lignes dorées, cadres",
  ],
  effects: [
    "Rim light (contour lumineux) autour du portrait sur fond sombre",
    "Ombres portées prononcées: Distance 5-10px, Angle 135°, Flou 8-15px",
    "Underlines/soulignements décoratifs sous mots clés",
    "Flou gaussien élevé (40-80%) sur arrière-plan",
    "Ombres sous bannières 3D: opacité 40-60%",
    "Vignettage: assombrissement des bords 15-25%",
    "Grain photographique subtil: 3-5% pour unité",
  ],
  principles: [
    "Dignité et respect: inspirer la révérence",
    "Clarté du message spirituel immédiate",
    "Atmosphère appropriée: solennelle (cultes), puissante (jeûnes), joyeuse (célébrations)",
    "Symbolisme intentionnel: chaque couleur a une signification",
    "Professionnalisme: crédibilité du ministère",
    "Informations pratiques (date, heure, lieu) très visibles",
  ],
  errors: [
    "Arrière-plans trop chargés distrayant du message",
    "Portraits de mauvaise qualité ou mal détourés",
    "Plus de 3 couleurs principales",
    "Textes illisibles sur fonds complexes",
    "Date/heure/lieu peu visibles",
    "Typographie trop décontractée",
    "Symboles religieux mal placés ou disproportionnés",
    "Manque de hiérarchie entre titre et détails",
  ],
  referenceStyleGuide: [
    "Style visuel des meilleures affiches d'église africaines:",
    "- Fond sombre (bleu nuit #0A1628 ou violet profond #1A0A2E) avec overlay 40-60%",
    "- Portrait du pasteur/prédicateur tiers droit, éclairage rim light doré",
    "- Titre principal en 3D avec effet OR MÉTALLIQUE et glow lumineux",
    "- Rayons de lumière divine descendant d'en haut à gauche (god rays)",
    "- Silhouettes floues de fidèles mains levées en arrière-plan (prière)",
    "- Bannière 3D texturée (effet satin/tissu) pour les dates/horaires",
    "- Particules dorées/lumineuses flottant (atmosphère céleste)",
    "- Mots spirituels clés en police script (Grâce, Gloire, Saint-Esprit)",
    "- Verset biblique en italique élégant, encadré discret",
    "Exemple: 'GRANDE CROISADE DE MIRACLES' avec Bishop en costume blanc,",
    "fond bleu nuit avec étoiles et nuages, titre doré 3D avec glow,",
    "rayons de lumière derrière lui, infos dans bandeau rouge en bas,",
    "icônes réseaux sociaux et numéro WhatsApp bien visibles.",
  ],
};

// ============================================================================
// PROFIL 4: RESTAURANT / FOOD
// Applicable à: Restaurant, Food, Traiteur
// ============================================================================
const RESTAURANT_FOOD: ExpertSkillProfile = {
  id: "restaurant_food",
  name: "Restaurant / Food",
  applicableDomains: ["restaurant"],
  composition: [
    "Plat principal: 40-60% de la surface, 100% net (jamais flouté)",
    "Positionnement plat: légèrement décentré (règle des tiers)",
    "RÈGLE DES NOMBRES IMPAIRS: 1, 3 ou 5 éléments visibles (jamais 2, 4, 6)",
    "30-40% d'espace négatif obligatoire pour respiration",
    "Profondeur: Plat net → Ingrédients 30-50% flou → Ambiance 60-80% flou",
    "Zone texte/offre: 25-35%, Zone informations: 10-15% (footer)",
    "Composition en Z ou F pour parcours visuel naturel",
  ],
  typography: [
    "Titres offres: Sans-serif Bold ou Script élégant selon standing",
    "Noms de plats: Serif classique OU Script moderne",
    "PRIX TRÈS VISIBLE: 28-40pt bold, dans badges colorés distincts",
    "Descriptions: Sans-serif regular, 14-18pt, max 2-3 lignes",
    "Contact: 12-16pt, numéro téléphone 1.5-2x plus grand",
    "Symboles: % pour réductions, ★ pour spécialités",
    "Espacement généreux entre plat et prix (minimum 15px)",
  ],
  colorSystem: [
    "Couleurs chaudes pour stimuler appétit: Orange, Rouge, Jaune",
    "Fond: 50-60% neutre (ne pas distraire du plat)",
    "Plat: 30-40% (couleurs naturelles de la nourriture)",
    "Accents/CTA: 10-15% couleur vive de la marque",
    "Saturation +10-20% sur aliments (look appétissant)",
    "Température: légèrement chaude (+5 à +15) pour plats chauds",
    "Couleurs froides uniquement pour boissons/desserts froids",
  ],
  colorHarmonization: [
    "⚠️ SI PALETTE UTILISATEUR FOURNIE → REMPLACER TOUTES les couleurs du template",
    "Couleur #1 (DOMINANTE 60%): Fond/arrière-plan (table, mur, texture bois/marbre)",
    "Couleur #2 (SECONDAIRE 30%): Badges promo, bandeaux, zones de prix",
    "Couleur #3 (ACCENT 10%): Bordures, CTA, highlights sur plats",
    "⚠️ EXCEPTION FOOD: Les couleurs naturelles de la nourriture restent INTACTES",
    "Appliquer la palette UNIQUEMENT sur les éléments graphiques (fond, texte, badges)",
    "Si palette froide (bleu, violet): utiliser comme fond, ajouter éclairage chaud sur plats",
    "Créer cohésion: couleur secondaire en bordures du plat ou reflets sur assiettes",
    "Badges rotationnels (-15° à -25°) dans la couleur d'accent pour dynamisme",
    "🚨 ÉVITER: couleurs vives derrière le plat qui détournent l'attention de la nourriture",
    "💡 SOLUTION BLANC/CRÈME: Utiliser blanc ou crème près du plat pour le mettre en valeur",
    "⚡ Prix en BLANC sur badge coloré = lisibilité maximale et appétit visuel préservé",
  ],
  visualElements: [
    "Ingrédients flottants en arrière-plan (tomates, épices, herbes)",
    "Effets vapeur sur plats chauds: 15-30% opacité, lignes courbes montantes",
    "Gouttes de fraîcheur sur fruits/légumes/boissons: 2-8px, opacité 60-90%",
    "Textures de surface: bois, marbre, ardoise, tissu (20-40% opacité)",
    "Props contextuels: couverts, ingrédients bruts",
    "Badges promotionnels: cercles, étoiles, rubans diagonaux (15-20% largeur)",
  ],
  effects: [
    "Éclairage 45° soft light (simule lumière naturelle fenêtre)",
    "Ombres douces sous plat: 20-40% opacité, flou 20-30px",
    "Profondeur de champ réduite (f/2.8 à f/5.6 simulée)",
    "Vibrance +15-25% sans exagération",
    "Toutes ombres même direction (135° standard)",
    "Condensation sur verres: flou + opacité 40-60%",
    "Rotation badges promotionnels: -15° à -25° pour dynamisme",
  ],
  principles: [
    "LE PLAT EST LA STAR: tout sert à le mettre en valeur",
    "Appétit visuel: la photo doit donner faim immédiatement",
    "Prix TOUJOURS très visible, jamais caché",
    "Simplicité: chaque élément a un rôle défini",
    "Qualité d'image élevée: pas de photos floues",
    "Style adapté au standing (fast-food vs gastronomique)",
  ],
  errors: [
    "Photos de plats floues ou mal éclairées",
    "Trop d'éléments (max 5-7 objets visibles)",
    "Prix illisibles ou cachés",
    "Fond qui concurrence le plat (trop coloré ou net)",
    "Couleurs non-naturelles sur la nourriture",
    "Manque d'espace négatif (composition étouffée)",
    "Informations de contact invisibles",
    "Plat flouté ou en arrière-plan",
  ],
  referenceStyleGuide: [
    "Style visuel des meilleures affiches restaurant africaines:",
    "- Plat principal STAR: occupe 40-60% de l'affiche, net et appétissant",
    "- Fond sobre (bois, ardoise, marbre) avec flou bokeh (60-80%)",
    "- Vapeur légère montant du plat pour effet 'fraîcheur/chaleur'",
    "- Ingrédients frais flottant autour (tomates, épices, herbes) en arrière-plan",
    "- Badge PROMO rotatif (-20°) en rouge/jaune vif avec prix barré",
    "- Nom du plat en police élégante (script ou serif)",
    "- Prix TRÈS visible dans cercle ou rectangle coloré",
    "- Photo du chef ou logo restaurant en coin discret",
    "- Numéro WhatsApp/téléphone en grand en bas",
    "Exemple: 'POULET BRAISÉ SPÉCIAL' avec poulet doré fumant au centre,",
    "fond table en bois flouté, piments et oignons flottants,",
    "badge '-30%' rouge incliné, prix '3500 FCFA' en jaune,",
    "logo restaurant en haut gauche, WhatsApp en bas droite.",
  ],
};

// ============================================================================
// PROFIL 5: MINIATURES YOUTUBE VIRALES
// Applicable à: YouTube, Thumbnails, Vignettes
// ============================================================================
const YOUTUBE_THUMBNAIL: ExpertSkillProfile = {
  id: "youtube_thumbnail",
  name: "Miniatures YouTube Virales",
  applicableDomains: ["youtube", "thumbnail", "miniature"],
  composition: [
    "Visage humain CENTRAL: 30-50% de la surface totale obligatoire",
    "Expression faciale EXAGÉRÉE (surprise, choc, joie intense, concentration extrême)",
    "Cadrage gros plan ou plan poitrine sur le sujet",
    "Format OBLIGATOIRE: 16:9 (1280x720 ou 1920x1080)",
    "Arrière-plan simplifié: flou bokeh OU couleur unie OU contexte visuel simple",
    "Maximum 1-3 objets symboliques surdimensionnés ('props')",
    "Zone texte: 25-35% de la surface, JAMAIS sur le visage",
    "Point focal sur le regard du sujet (yeux écarquillés idéal)",
  ],
  typography: [
    "Police Sans-serif ULTRA-GRASSE uniquement (Impact, Bebas Neue, Montserrat Black)",
    "Taille MASSIVE: 70-120pt pour titres principaux (les plus grandes de tous les profils)",
    "Maximum 5-7 mots (court et percutant, arrêter le scroll)",
    "Bordure de contraste OBLIGATOIRE: stroke 3-6px noir ou blanc",
    "Mots-clés en couleur vive: Jaune (#FFFF00), Rouge (#FF0000), Vert (#00FF00)",
    "Chiffres et montants TOUJOURS mis en évidence ($27K, 2026, 100%, 10M)",
    "Fond coloré rectangle arrondi derrière mots-clés importants",
    "Jamais de police fine, script ou décorative",
  ],
  colorSystem: [
    "Hyper-saturation OBLIGATOIRE: +30 à +50% sur toute l'image",
    "Contraste EXTRÊME (le plus élevé de tous les profils): +20-40%",
    "Palette Énergie/Action: Rouge (#FF0000), Jaune (#FFFF00), Orange (#FF6600)",
    "Palette Productivité: Bleu (#0066FF), Vert (#00CC00) avec accents jaunes",
    "Palette Richesse/Argent: Or (#FFD700), Noir profond (#000000), Blanc pur (#FFFFFF)",
    "Température légèrement chaude pour dynamisme",
    "Éclairage dramatique avec highlights marqués sur le visage",
    "Ombres prononcées pour relief 3D du sujet",
  ],
  colorHarmonization: [
    "⚠️ SI PALETTE UTILISATEUR FOURNIE → REMPLACER TOUTES les couleurs du template",
    "Couleur #1 (DOMINANTE 60%): Fond principal (saturer à +30-50% obligatoire)",
    "Couleur #2 (SECONDAIRE 30%): Texte principal avec bordure épaisse (3-6px)",
    "Couleur #3 (ACCENT 10%): Rectangles arrondis derrière mots-clés, flèches, highlights",
    "Harmonisation YouTube: TOUJOURS hyper-saturer les couleurs utilisateur",
    "Si couleurs ternes fournies: augmenter saturation +30% et contraste +20%",
    "Fond coloré rectangle arrondi (15-25px) derrière mots-clés importants",
    "Éclairage sur visage: reflets de la couleur dominante sur la peau",
    "Bordures de texte ÉPAISSES: utiliser couleur contrastante (noir sur clair, blanc sur foncé)",
    "🚨 INTERDICTION ABSOLUE: texte bleu sur orange, rouge sur vert, jaune sur violet (fait mal aux yeux)",
    "💡 SOLUTION OBLIGATOIRE: Bordure BLANCHE (4-6px) ou NOIRE autour du texte pour isoler les couleurs",
    "⚡ Le BLANC comme bordure texte = TOUJOURS lisible, passe avec TOUTES les combinaisons de fond",
    "🎯 RÈGLE YOUTUBE: Si couleurs clashent, mettre fond blanc derrière le texte avec bordure colorée",
  ],
  visualElements: [
    "Objets symboliques SURDIMENSIONNÉS (billets, téléphones, logos, argent)",
    "Flèches et cercles rouges/jaunes pour pointer éléments importants",
    "Logos d'applications reconnaissables (YouTube, PayPal, Shopify, Amazon)",
    "Symboles de succès: montres luxe, voitures, ordinateurs, billets",
    "Emojis 3D si appropriés (surdimensionnés, style Apple)",
    "Encadrés et badges pour prix et chiffres (cercles, étoiles, rubans)",
    "Props contextuels liés au sujet de la vidéo",
  ],
  effects: [
    "Saturation globale: +30-50% obligatoire",
    "Contraste global: +20-40% pour rendu 'pop'",
    "Éclairage dramatique sur le visage (highlights très marqués)",
    "Ombres prononcées pour relief 3D",
    "Bordures de texte ÉPAISSES: 3-6px minimum",
    "Fond coloré derrière mots-clés (rectangles arrondis 15-25px)",
    "Rendu final 'POP': couleurs qui sautent aux yeux",
    "Vignettage léger: 10-15% sur les bords pour focus central",
  ],
  principles: [
    "ARRÊTER LE SCROLL en moins de 1 seconde",
    "Répondre à: 'Qu'est-ce que je vais apprendre et pourquoi c'est important ?'",
    "3 PILIERS: Visage expressif + Texte percutant + Symboles de valeur",
    "Émotion IMMÉDIATE (surprise, curiosité, excitation)",
    "Message clair en UN COUP D'ŒIL",
    "Contraste MAXIMAL sur fond YouTube (blanc/gris)",
    "Le visage est l'élément le plus important (100% des miniatures virales)",
  ],
  errors: [
    "Trop de texte (max 7 mots absolument)",
    "Texte illisible (trop petit, pas de contraste, pas de bordure)",
    "Visage trop petit ou absent de la miniature",
    "Expression neutre ou ennuyeuse sur le visage",
    "Arrière-plan distrayant ou trop chargé",
    "Couleurs ternes, désaturées ou fades",
    "Manque de contraste global",
    "Police trop fine, script ou décorative",
    "Chiffres et montants non mis en évidence",
    "Logo qui cache ou interfère avec le visage",
  ],
  referenceStyleGuide: [
    "Style visuel des meilleures miniatures YouTube africaines:",
    "- Visage CENTRAL occupant 35-50% de la miniature, expression CHOQUÉE ou EXCITÉE",
    "- Yeux écarquillés, bouche ouverte en 'O' de surprise",
    "- Fond simplifié: couleur unie vive OU flou bokeh OU contexte minimal",
    "- Texte MASSIF (70-100pt) en 3-5 mots MAX avec bordure épaisse (4-6px)",
    "- Chiffres/montants en TRÈS GRAND avec fond coloré (cercle/rectangle arrondi)",
    "- Objet symbolique SURDIMENSIONNÉ (billets, téléphone, logo, produit)",
    "- Flèche rouge/jaune pointant vers élément important",
    "- Saturation +30-50%, contraste +20-40% sur toute l'image",
    "- Couleurs HYPER vives: jaune #FFFF00, rouge #FF0000, bleu #0066FF",
    "Exemple: Youtubeur africain bouche ouverte, yeux grands, tenant un iPhone géant,",
    "fond jaune vif uni, texte 'J'AI GAGNÉ 27 000€' en noir bordure blanche,",
    "'27 000€' sur fond rouge en très grand, logo PayPal en coin,",
    "flèche rouge pointant vers le montant, saturation maximale.",
  ],
};

// ============================================================================
// COLLECTION DE TOUS LES PROFILS
// ============================================================================
export const EXPERT_SKILL_PROFILES: ExpertSkillProfile[] = [
  CORPORATE_MODERN,
  SURREALIST_PHOTOREALISTIC,
  SPIRITUAL_RELIGIOUS,
  RESTAURANT_FOOD,
  YOUTUBE_THUMBNAIL,
];

// ============================================================================
// MAPPING DOMAINE → PROFIL
// ============================================================================
const DOMAIN_TO_PROFILE_MAP: Record<string, string> = {
  // YouTube Thumbnails
  youtube: "youtube_thumbnail",
  thumbnail: "youtube_thumbnail",
  miniature: "youtube_thumbnail",
  
  // Spirituel/Religieux
  church: "spiritual_religious",
  
  // Restaurant/Food
  restaurant: "restaurant_food",
  
  // Corporate Modern
  formation: "corporate_modern",
  education: "corporate_modern",
  technology: "corporate_modern",
  business_services: "corporate_modern",
  realestate: "corporate_modern",
  health: "corporate_modern",
  service: "corporate_modern",
  other: "corporate_modern",
  
  // Surréaliste/Photoréaliste
  event: "surrealist_photorealistic",
  music: "surrealist_photorealistic",
  sport: "surrealist_photorealistic",
  ecommerce: "surrealist_photorealistic",
  fashion: "surrealist_photorealistic",
};

// ============================================================================
// DÉTECTION DE DOMAINE PAR MOTS-CLÉS
// ============================================================================
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  youtube: [
    "miniature", "thumbnail", "youtube", "vignette", "chaîne", "chaine", "vidéo youtube",
    "video youtube", "youtuber", "youtubeur", "créateur", "createur", "contenu", "abonnés",
    "abonnes", "vues", "viral", "buzz", "clickbait", "tutoriel", "tuto", "vlog", "podcast",
    "interview", "réaction", "reaction", "challenge", "storytime", "unboxing", "haul",
    "review", "avis", "test", "1m vues", "millions de vues", "subscriber", "subscribe"
  ],
  church: [
    "église", "eglise", "culte", "pasteur", "évêque", "eveque", "prophète", "prophete",
    "prière", "priere", "jeûne", "jeune", "veillée", "veillee", "chrétien", "chretien",
    "louange", "adoration", "gospel", "worship", "crusade", "convention", "revival",
    "saint-esprit", "saint esprit", "dieu", "seigneur", "biblique", "temple", "tabernacle",
    "dimanche", "nuit de prière", "intercession", "onction", "ministère", "ministere"
  ],
  restaurant: [
    "restaurant", "menu", "plat", "cuisine", "chef", "manger", "repas", "déjeuner", "dejeuner",
    "dîner", "diner", "buffet", "traiteur", "food", "gastronomie", "recette", "saveur",
    "délice", "delice", "gourmand", "culinaire", "table", "réservation", "reservation",
    "livraison", "commande", "prix", "promotion", "offre", "promo", "réduction", "reduction"
  ],
  formation: [
    "formation", "séminaire", "seminaire", "atelier", "workshop", "cours", "coaching",
    "masterclass", "webinaire", "conférence", "conference", "certification", "diplôme",
    "diplome", "apprentissage", "compétence", "competence", "professionnel", "carrière",
    "carriere", "emploi", "entrepreneuriat", "business", "management", "leadership"
  ],
  event: [
    "événement", "evenement", "concert", "soirée", "soiree", "fête", "fete", "célébration",
    "celebration", "show", "spectacle", "gala", "festival", "cérémonie", "ceremonie",
    "inauguration", "anniversaire", "mariage", "fiançailles", "fiancailles", "party"
  ],
  music: [
    "musique", "music", "album", "single", "artiste", "chanteur", "chanteuse", "rap",
    "afrobeat", "hip-hop", "hip hop", "rnb", "r&b", "jazz", "reggae", "coupé-décalé",
    "coupe decale", "afropop", "ndombolo", "rumba", "makossa"
  ],
  sport: [
    "sport", "football", "basket", "basketball", "match", "tournoi", "compétition",
    "competition", "athlète", "athlete", "équipe", "equipe", "marathon", "course",
    "natation", "tennis", "boxe", "arts martiaux", "fitness", "musculation"
  ],
  ecommerce: [
    "promo", "promotion", "solde", "réduction", "reduction", "vente", "achat", "boutique",
    "shop", "produit", "article", "offre", "prix", "livraison", "commande", "panier",
    "paiement", "commerce", "magasin", "stock", "nouveau", "nouveauté"
  ],
  fashion: [
    "mode", "fashion", "collection", "vêtement", "vetement", "style", "couture", "défilé",
    "defile", "boutique", "prêt-à-porter", "pret a porter", "accessoire", "bijou",
    "tendance", "élégance", "elegance", "chic", "glamour"
  ],
  technology: [
    "technologie", "tech", "digital", "numérique", "numerique", "application", "app",
    "startup", "innovation", "hackathon", "développement", "developpement", "code",
    "programmation", "intelligence artificielle", "ia", "ai", "data", "cloud"
  ],
  health: [
    "santé", "sante", "health", "médical", "medical", "hôpital", "hopital", "clinique",
    "consultation", "bien-être", "bien etre", "fitness", "pharmacie", "docteur", "médecin",
    "medecin", "soins", "traitement", "thérapie", "therapie"
  ],
  realestate: [
    "immobilier", "appartement", "maison", "terrain", "location", "vente", "agence",
    "propriété", "propriete", "logement", "résidence", "residence", "villa", "duplex",
    "studio", "chambre", "loyer", "achat", "investissement"
  ],
  education: [
    "éducation", "education", "école", "ecole", "université", "universite", "étudiant",
    "etudiant", "enseignement", "professeur", "cours", "examen", "diplôme", "diplome",
    "baccalauréat", "baccalaureat", "licence", "master", "doctorat"
  ],
};

/**
 * Détecte le domaine à partir du contenu du prompt
 */
export function detectDomainFromPrompt(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  let bestMatch = { domain: "other", score: 0 };
  
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        score += 1;
        // Bonus pour correspondance exacte de mot
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        if (regex.test(promptLower)) {
          score += 0.5;
        }
      }
    }
    if (score > bestMatch.score) {
      bestMatch = { domain, score };
    }
  }
  
  console.log(`Domain detection: "${bestMatch.domain}" with score ${bestMatch.score}`);
  return bestMatch.domain;
}

/**
 * Retourne le profil de compétences pour un domaine donné
 */
export function getExpertProfileForDomain(domain: string): ExpertSkillProfile {
  const profileId = DOMAIN_TO_PROFILE_MAP[domain] || "corporate_modern";
  const profile = EXPERT_SKILL_PROFILES.find(p => p.id === profileId);
  return profile || CORPORATE_MODERN;
}

/**
 * Styles typographiques variés pour le mode libre
 * Sélection aléatoire à chaque génération pour éviter la répétitivité
 */
const TYPOGRAPHY_STYLES = [
  "Titre 3D métallique chrome avec reflets miroir et ombres portées épaisses (8-12px)",
  "Titre néon lumineux avec glow intense multicolore et halo pulsant",
  "Titre rétro vintage avec textures usées, serif classique et bordures dorées",
  "Titre calligraphie élégante avec traits fluides, dorures et fioritures",
  "Titre grunge texturisé avec effet béton brut, peinture écaillée et stencil",
  "Titre dégradé multicolore bold avec contours épais contrastés noir/blanc",
  "Titre ombre longue flat design avec couleurs vives et géométrie nette",
  "Titre brush peinture manuscrit avec éclaboussures dynamiques et traits spontanés",
  "Titre gravure classique avec empattements forts, lignes fines et ornements",
  "Titre futuriste holographique avec reflets arc-en-ciel, glow cyan et lignes laser",
  "Titre effet feu flammes avec dégradé orange-rouge-jaune et étincelles",
  "Titre glace cristal avec reflets bleutés, givre et transparence glaciale",
  "Titre bois sculpté avec texture grain, ombres profondes et relief 3D réaliste",
  "Titre néon rétro synthwave avec fond grille 80s, couleurs magenta-cyan-violet",
  "Titre aquarelle artistique avec coulures colorées, splash et dégradés fondus",
  "Titre comic book pop art avec contours épais noirs, halftone dots et couleurs saturées",
  "Titre diamant luxe avec facettes brillantes, reflets dorés et éclats de lumière",
  "Titre pixel art rétro gaming avec carrés nets, couleurs vives et ombre portée blocky",
  "Titre effet or massif avec texture métal brillant, reflets chauds et biseautage",
  "Titre nuage fumée avec lettres intégrées dans la brume, dégradé mystérieux",
  "Titre papier découpé avec ombres portées réalistes, couches superposées et profondeur",
  "Titre néon double contour avec glow intérieur et extérieur de couleurs différentes",
  "Titre effet craie tableau noir avec texture poudreuse, traits imparfaits et charme artisanal",
  "Titre métal brossé acier avec reflets directionnels, rivets et aspect industriel",
];

/**
 * Styles de layout variés pour diversifier les designs en mode libre
 */
const LAYOUT_STYLES = [
  "Courbes fluides et vagues dynamiques en arrière-plan, bandeaux obliques colorés, formes organiques",
  "Grille géométrique moderne avec rectangles arrondis superposés, lignes diagonales audacieuses",
  "Composition circulaire concentrique avec cercles concentriques, arcs et halos lumineux",
  "Mise en page en Z avec bandeaux horizontaux colorés, séparateurs courbes et rubans 3D",
  "Explosion radiale depuis le centre avec rayons, particules et éléments dispersés dynamiquement",
  "Composition asymétrique 70/30 avec grand visuel à gauche, texte structuré à droite sur fond contrasté",
  "Superposition de plans transparents avec formes géométriques, losanges et hexagones translucides",
  "Design split diagonal avec deux zones contrastées séparées par une ligne oblique audacieuse",
  "Cadre décoratif ornemental avec bordures travaillées, coins décoratifs et éléments floraux stylisés",
  "Composition en escalier avec blocs décalés, ombres portées longues et profondeur architecturale",
  "Flux organique avec formes blob, dégradés fluides et transitions douces entre les zones",
  "Grille brisée avec éléments qui débordent des cadres, superpositions audacieuses et dynamisme",
];

export function getRandomTypographyStyle(): string {
  return TYPOGRAPHY_STYLES[Math.floor(Math.random() * TYPOGRAPHY_STYLES.length)];
}

export function getRandomLayoutStyle(): string {
  return LAYOUT_STYLES[Math.floor(Math.random() * LAYOUT_STYLES.length)];
}

/**
 * Génère les instructions ULTRA-CONDENSÉES pour injection dans le prompt
 * IMPORTANT: Doit rester sous 400 caractères pour éviter le dépassement API
 */
export function buildExpertSkillsPrompt(domain: string): string {
  const profile = getExpertProfileForDomain(domain);
  
  // Extraire seulement les 2 règles les plus critiques de chaque section
  const comp = profile.composition.slice(0, 2).join("; ");
  const typo = profile.typography.slice(0, 2).join("; ");
  const colors = profile.colorHarmonization.slice(0, 3).join("; ");
  
  return `[${profile.name}] Composition: ${comp}. Typo: ${typo}. Couleurs: ${colors}.`;
}
