
# Plan : Gestion des Templates et Chat Inspirations

## Résumé du Problème

1. **Templates user-contributed affichés**: Les images de référence ajoutées par les utilisateurs sont actuellement visibles dans le marketplace, alors qu'elles ne devraient pas l'être.

2. **Chat bloqué en mode "S'inspirer"**: Quand un utilisateur clique sur "S'inspirer" depuis un template, le chat ne permet pas d'écrire car l'étape `clone_gathering` n'est pas incluse dans la liste des étapes avec champ texte.

---

## Solution Proposée

### Partie 1 : Filtrer les templates affichés

**Objectif**: Ne montrer que les templates officiels (créés par les designers) sur la page d'accueil et le marketplace, tout en gardant les contributions utilisateurs pour l'inspiration interne.

**Modifications**:

1. **TemplatesMarketplace.tsx** - Ajouter un filtre pour exclure les templates `user-contributed`:
   - Modifier la requête pour filtrer `design_category != 'user-contributed'`
   - Afficher seulement 12 templates par défaut
   - Ajouter un bouton "Voir plus de templates" qui affiche tous les templates officiels

2. **TemplatesMarquee.tsx** - Aucun changement nécessaire (utilise des images locales)

---

### Partie 2 : Débloquer le chat en mode inspiration

**Objectif**: Permettre aux utilisateurs d'interagir avec le chat après avoir sélectionné un template à cloner.

**Modifications**:

1. **AppPage.tsx (ligne 257)** - Ajouter `clone_gathering` à la liste des étapes avec champ texte:
   ```
   Avant:
   const showTextInput = step === "greeting" || step === "details" || ...
   
   Après:
   const showTextInput = step === "greeting" || step === "clone_gathering" || step === "details" || ...
   ```

---

### Partie 3 : Bouton "Découvrir plus" pour les templates

**Objectif**: Permettre aux utilisateurs de voir plus de templates d'inspiration.

**Modifications dans TemplatesMarketplace.tsx**:

1. Afficher un nombre limité de templates par défaut (8-12)
2. Ajouter un état `showAllTemplates` pour contrôler l'affichage
3. Ajouter un bouton "Découvrir plus de templates" qui:
   - Affiche tous les templates officiels quand cliqué
   - Change en "Voir moins" après expansion

---

## Fichiers à Modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/AppPage.tsx` | Ajouter `clone_gathering` dans `showTextInput` |
| `src/components/landing/TemplatesMarketplace.tsx` | Filtrer user-contributed, ajouter bouton voir plus |

---

## Détails Techniques

### Modification 1 : AppPage.tsx

```text
Ligne 257 : Ajouter "clone_gathering" || après "greeting" ||
```

### Modification 2 : TemplatesMarketplace.tsx

La requête actuelle:
```typescript
supabase.from("reference_templates")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(24)
```

Nouvelle requête:
```typescript
supabase.from("reference_templates")
  .select("*")
  .neq("design_category", "user-contributed") // Exclure contributions utilisateurs
  .order("created_at", { ascending: false })
  .limit(showAllTemplates ? 50 : 12) // Limiter à 12 par défaut
```

### Ajout du bouton "Voir plus"

- État: `const [showAllTemplates, setShowAllTemplates] = useState(false)`
- Bouton après la grille de templates avec icône ChevronDown/ChevronUp
- Texte: "Découvrir plus de templates" / "Voir moins"

---

## Résultat Attendu

1. ✅ Les templates contributeurs restent en base de données mais ne s'affichent plus publiquement
2. ✅ Seuls les meilleurs templates officiels sont visibles
3. ✅ Bouton pour voir plus de templates disponible
4. ✅ Le chat fonctionne quand on clique sur "S'inspirer" - l'utilisateur peut répondre aux questions de l'IA
