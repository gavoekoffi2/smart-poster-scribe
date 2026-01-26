
# Plan : Intégration des Compétences Graphistes Experts

## Objectif

Intégrer les 4 profils de compétences de graphistes professionnels dans le système de génération d'images pour créer des affiches de niveau agence internationale, en utilisant **uniquement les données fournies par l'utilisateur**.

---

## Profils de Compétences à Intégrer

| Profil | Domaines Applicables | Caractéristiques Principales |
|--------|---------------------|------------------------------|
| Corporate Modern | `formation`, `technology`, `business_services`, `education` | Composition 60/40, hiérarchie 3 niveaux, grille 12 colonnes |
| Surréaliste/Photoréaliste | `event`, `music`, `sport`, `ecommerce` | 3-5 plans de profondeur, perspectives extrêmes, emojis 3D |
| Spirituel/Religieux | `church` | Zones lumière divine, mix typographique obligatoire, palettes symboliques |
| Restaurant/Food | `restaurant` | Plat = 40-60% surface, règle nombres impairs, effets vapeur/fraîcheur |

---

## Architecture Technique

### 1. Nouveau Fichier de Compétences

Créer un fichier `expertSkills.ts` dans le dossier `supabase/functions/generate-image/` contenant:

```text
supabase/functions/generate-image/
├── index.ts           (fichier principal - à modifier)
└── expertSkills.ts    (NOUVEAU - compétences graphistes)
```

### 2. Structure du Fichier expertSkills.ts

```text
// Interface pour un profil de compétences
ExpertSkillProfile {
  id: string
  name: string
  applicableDomains: string[]
  composition: string[]      // Règles de composition
  typography: string[]       // Règles typographiques  
  colorSystem: string[]      // Système colorimétrique
  visualElements: string[]   // Éléments visuels spécifiques
  effects: string[]          // Effets et finitions
  principles: string[]       // Principes à respecter
  errors: string[]           // Erreurs à éviter
}
```

### 3. Mapping Domaine → Profil

```text
church           → Spirituel/Religieux
restaurant       → Restaurant/Food
formation        → Corporate Modern
education        → Corporate Modern
technology       → Corporate Modern
business_services→ Corporate Modern
event            → Surréaliste/Photoréaliste
music            → Surréaliste/Photoréaliste  
sport            → Surréaliste/Photoréaliste
ecommerce        → Surréaliste/Photoréaliste (+ éléments Corporate)
fashion          → Surréaliste/Photoréaliste (à enrichir plus tard)
realestate       → Corporate Modern (à enrichir plus tard)
health           → Corporate Modern (à enrichir plus tard)
other            → Corporate Modern (profil par défaut)
```

---

## Modifications du Fichier index.ts

### Point d'Insertion

Dans la fonction `buildProfessionalPrompt`, section **"MODE CRÉATION LIBRE"** (lignes 206-309), ajouter l'injection des compétences expertes après les instructions générales.

### Logique d'Intégration

```text
1. Détecter le domaine depuis userPrompt (analyse de mots-clés)
2. Sélectionner le profil de compétences approprié
3. Injecter les instructions condensées dans le prompt
4. Combiner avec les templates de la base de données si disponibles
```

### Nouvelle Section dans le Prompt

```text
╔═══════════════════════════════════════════════════════════════════════╗
║  🎓 COMPÉTENCES GRAPHISTE EXPERT - [NOM DU PROFIL]                    ║
╚═══════════════════════════════════════════════════════════════════════╝

[Instructions condensées du profil sélectionné]
- Règles de composition
- Système typographique  
- Palette colorimétrique
- Effets visuels spécifiques
- Erreurs à éviter
```

---

## Détails des 4 Profils

### Profil 1 : Corporate Modern

**Applicable à:** Formation, Technologie, Éducation, Services Entreprises

**Règles clés condensées:**
- Composition asymétrique 60/40 ou 70/30
- Hiérarchie visuelle 3 niveaux (Primaire 25%, Secondaire 18%, Tertiaire 12%)
- Palette 60-30-10 (dominante-accent-highlight)
- Layering: arrière-plan texturé (10-20% opacité) → formes colorées → sujet + texte
- Typographie max 2-3 familles, titre en Ultra-bold
- Marges minimum 5%, respiration 30-40% espace vide
- Ombres 20-30% opacité, coins arrondis 15-25px

### Profil 2 : Surréaliste/Photoréaliste

**Applicable à:** Événements, Musique, Sport, E-commerce

**Règles clés condensées:**
- 3-5 plans de profondeur avec flou progressif
- Perspectives extrêmes (15-45° d'angle)
- Scènes impossibles mais physiquement crédibles
- Typographie massive (70-120pt), multi-color inline
- Palette haute saturation (70-100%)
- Emojis 3D photoréalistes avec ombres cohérentes
- Motion blur directionnel sur mouvements
- Color grading unifié final

### Profil 3 : Spirituel/Religieux

**Applicable à:** Église, Cultes, Événements spirituels

**Règles clés condensées:**
- Zones: Titre (40-50% haut), Portrait (30-40% droite), Infos (20-25% bas)
- Mix typographique obligatoire: Script + Sans-serif Bold + Serif
- Palettes symboliques: Royauté Divine (Bleu/Or), Feu de l'Esprit (Rouge/Orange)
- Effets lumière divine: god rays 15-30°, halos, particules bokeh
- Portrait prédicateur: tiers droit, 35-45% hauteur, rim light
- Bannières 3D texturées (satin/tissu)
- Overlay sombre 40-60% pour contraste

### Profil 4 : Restaurant/Food

**Applicable à:** Restaurant, Food

**Règles clés condensées:**
- Plat principal: 40-60% de la surface, 100% net
- Règle des nombres impairs (1, 3, 5 éléments)
- Profondeur: Plat net → Ingrédients 30-50% flou → Ambiance 60-80% flou
- Prix très visible: 28-40pt bold dans badges colorés
- Effets: vapeur 15-30% opacité, gouttes de fraîcheur
- Éclairage 45° soft light
- Saturation +10-20% sur aliments
- 30-40% espace négatif obligatoire

---

## Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/generate-image/expertSkills.ts` | CRÉER | Définitions des 4 profils de compétences |
| `supabase/functions/generate-image/index.ts` | MODIFIER | Import + injection des compétences dans buildProfessionalPrompt |

---

## Fonction d'Injection

```text
function getExpertSkillsForDomain(domain: string): string[]

1. Mapper le domaine au profil approprié
2. Retourner les instructions condensées
3. Si domaine inconnu → utiliser Corporate Modern par défaut
```

---

## Détection du Domaine

Améliorer la détection en analysant le `userPrompt` pour des mots-clés:

```text
Église/Church: "église", "culte", "pasteur", "prière", "jeûne", "chrétien"
Restaurant: "restaurant", "menu", "plat", "cuisine", "chef", "food"
Formation: "formation", "séminaire", "atelier", "cours", "certification"
Événement: "concert", "festival", "show", "soirée", "gala"
```

---

## Résultat Attendu

Quand un utilisateur crée une affiche sans template de référence:

1. Le système détecte le domaine (ex: "église")
2. Charge le profil "Spirituel/Religieux"
3. Injecte les compétences expertes dans le prompt
4. L'IA génère une affiche avec:
   - Structure zones correcte (titre haut, portrait droite)
   - Mix typographique (script + bold)
   - Effets lumière divine
   - Palette or/bleu royal
   - **Uniquement les données fournies par l'utilisateur**

---

## Prochaines Étapes (Après Validation)

1. Ajouter les profils pour: Mode/Fashion, Immobilier, Santé
2. Créer un système de "blend" entre profils pour domaines hybrides
3. Permettre aux utilisateurs de choisir un style parmi plusieurs options
