

## Plan : Ajouter un Mode Rapide vs Mode Personnalisé

### Concept

Au tout début de la conversation (après le message de bienvenue), l'utilisateur choisit entre :
- **Mode Rapide** : Décrit son affiche → (optionnel : image de référence) → Génération immédiate (format Instagram Story 9:16 par défaut) → Après génération, proposer les personnalisations (logo, couleurs, format)
- **Mode Personnalisé** : Le flux actuel inchangé (référence → format → couleurs → logo → images secondaires → génération)

### Modifications techniques

**1. Types (`src/types/generation.ts`)**
- Ajouter `CreationMode = "quick" | "custom"` 
- Ajouter étape `"mode_select"` dans les steps du `ConversationState`
- Ajouter `creationMode?: CreationMode` dans `ConversationState`
- Ajouter étape `"post_generation_options"` pour les personnalisations post-génération en mode rapide

**2. Conversation flow (`src/hooks/useConversation.ts`)**
- Modifier le message initial pour proposer le choix du mode
- Après analyse de la description en mode rapide :
  - Demander uniquement si l'utilisateur a une image de référence (oui/non)
  - Si oui → upload puis génération directe
  - Si non → génération directe avec format 9:16, sans logo, sans couleurs personnalisées
- Après génération en mode rapide (`"complete"`) : afficher un message proposant des personnalisations optionnelles (logo, couleurs, format)
- En mode personnalisé : le flux reste identique à l'actuel

**3. UI - Sélection du mode (`src/pages/AppPage.tsx`)**
- Ajouter un composant de choix de mode (2 boutons/cards) quand `step === "mode_select"`
- Bouton "Mode Rapide" avec icone éclair et description courte
- Bouton "Mode Personnalisé" avec icone palette et description courte

**4. Nouveau composant (`src/components/chat/ModeSelect.tsx`)**
- Deux cartes cliquables : Rapide (éclair) et Personnalisé (palette)
- Style cohérent avec les composants existants (DomainSelect, FormatSelect)

**5. Post-génération rapide (`src/components/chat/PostGenerationOptions.tsx`)**
- Après la génération en mode rapide, afficher des boutons :
  - "Ajouter un logo"
  - "Changer les couleurs" 
  - "Changer le format"
  - "C'est parfait !"
- Chaque option lance une modification de l'affiche existante

### Flux Mode Rapide résumé

```text
Bienvenue → Choix du mode → [Rapide]
  → Description de l'affiche
  → Analyse IA (détection domaine auto)
  → "Avez-vous une image de référence ?" (oui/passer)
  → Génération immédiate (format 9:16, pas de logo, couleurs auto)
  → "Votre affiche est prête ! Souhaitez-vous :"
      - Ajouter un logo
      - Modifier les couleurs
      - Changer le format
      - C'est parfait !
```

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/types/generation.ts` | Ajouter types `CreationMode`, steps |
| `src/hooks/useConversation.ts` | Logique mode rapide dans le flux |
| `src/pages/AppPage.tsx` | Afficher ModeSelect et PostGenerationOptions |
| `src/components/chat/ModeSelect.tsx` | Nouveau composant choix de mode |
| `src/components/chat/PostGenerationOptions.tsx` | Nouveau composant options post-génération |
| `src/components/chat/StepNavigation.tsx` | Ajouter le step mode_select |

