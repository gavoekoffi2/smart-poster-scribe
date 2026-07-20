## Objectif

Se démarquer de ChatGPT en produisant des affiches vraiment "graphistes" : (1) toujours s'inspirer d'un template de la base, (2) varier les polices d'une affiche à l'autre ET combiner 2 polices complémentaires sur la même affiche (titre / corps), (3) respecter des codes graphiques pro (hiérarchie, contraste, alignement).

## Ce qu'on change

### 1. Toujours partir d'un template (renforcement)

Aujourd'hui, si `!referenceImage`, on sélectionne un template ; sinon on utilise celui de l'utilisateur. On garde ce comportement mais on durcit :

- Si aucun template de domaine trouvé → au lieu de "FREE creation mode" (ligne 1708), on force la sélection d'un template actif quelconque et on **passe automatiquement en mode "inspiration ADN" strict** (composition + hiérarchie + typographie du template servent de base). Plus jamais de génération sans template.
- Log clair `templateAlwaysUsed=true` dans `image_jobs.params` pour traçabilité.

### 2. Système de duo typographique (nouveau)

Nouveau module `supabase/functions/generate-image/typographySystem.ts` :

- **Catalogue de ~20 duos de polices professionnels** (display + body), curatés par ambiance : editorial (Playfair + Inter), bold-modern (Bebas Neue + Work Sans), luxury (Cormorant + Karla), tech (Space Grotesk + DM Sans), organic (Fraunces + Manrope), brutalist (Archivo Black + Hind), retro (Abril Fatface + Cabin), etc.
- **Fonction `pickTypographyDuo(domain, template, seed)`** : sélectionne un duo cohérent avec le domaine ET différent des dernières générations de l'utilisateur (petit LRU via `image_jobs.params.typo_duo` sur les 5 derniers jobs). Garantit la rotation.
- **Fonction `buildTypographyBrief(duo)`** : produit un bloc de directives injecté dans le prompt : "TITRE : {display font} — graisse Black, tracking serré, casse haute. SOUS-TITRE : {display font} — Regular, italique optionnel. CORPS : {body font} — Regular/Medium, interlignage 1.4. NE PAS mélanger plus de 2 familles."

Injecté systématiquement dans `buildExpertSkillsInstructions` (là où `typoStyle` existe déjà à la ligne 653) — remplace le style typo générique par un duo précis et nommé.

### 3. Codes graphiques renforcés

Dans `professionalStandards.ts`, ajouter une checklist "Règles de graphiste" explicite injectée à chaque génération :

- Hiérarchie visuelle stricte (1 focal point, 3 niveaux max).
- Contraste titre/corps : ratio de tailles ≥ 2.5x.
- Alignement rigoureux sur une grille (baseline).
- Un seul duo de polices, pas de 3ᵉ famille.
- Palette 60-30-10 (déjà en Core memory) — renforcé comme règle bloquante.
- Interdiction de "tout centrer" par défaut : varier ancrages selon le template.

### 4. Variation garantie entre générations

Ajouter dans `index.ts`, avant `buildExpertSkillsInstructions` :

```ts
const recentDuos = await fetchRecentTypoDuos(userId, 5); // depuis image_jobs
const typoDuo = pickTypographyDuo(detectedDomain, template, { exclude: recentDuos });
```

Le duo choisi est loggé dans `image_jobs.params.typo_duo` pour alimenter la rotation.

### 5. Mémoire de projet

Ajouter à `mem://index.md` Core : "Toujours partir d'un template DB + duo typographique (display+body) obligatoire, rotation entre générations."
Nouveau fichier mémoire `mem://design/typography-duos-fr` décrivant le catalogue et la rotation.

## Fichiers touchés

- `supabase/functions/generate-image/typographySystem.ts` — nouveau, catalogue + sélection
- `supabase/functions/generate-image/index.ts` — appel `pickTypographyDuo`, injection du brief, suppression du fallback "FREE mode", log `typo_duo`
- `supabase/functions/generate-image/expertSkills.ts` — remplace `typoStyle` générique par le duo précis
- `supabase/functions/generate-image/professionalStandards.ts` — checklist codes graphiques
- `mem://index.md` + `mem://design/typography-duos-fr`

## Ce qu'on ne touche pas

- Pas de changement UI. Pas de changement de modèle IA. Pas de nouveau secret. Pas de migration DB (la rotation lit `image_jobs.params` existant).
