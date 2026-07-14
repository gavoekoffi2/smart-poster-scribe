# Plan : Localisation complète + création libre avant inscription

## Objectif
1. Toute la plateforme (chat graphiste, questions, tutoriels, boutons, toasts) suit la langue choisie (EN par défaut, FR si sélectionné).
2. Le graphiste répond dans la langue de la plateforme au début, puis s'adapte à la langue du message utilisateur.
3. L'utilisateur peut créer son affiche **sans être connecté**. L'inscription est demandée **uniquement au moment du téléchargement**.

---

## Partie 1 — Localisation du parcours de création

### 1.1 Messages du "graphiste" (chat)
Fichiers concernés : `src/hooks/useConversation.ts`, `src/hooks/useDomainQuestions.ts`, `src/config/domainQuestions.ts`, `src/components/chat/*`.

- Extraire toutes les chaînes FR en dur (`addAssistantMessage("Bonjour...")`, questions par domaine, placeholders, boutons Oui/Non, étapes) vers `src/i18n/locales/{en,fr}.json` sous les namespaces `chat.*` et `domainQuestions.*`.
- Remplacer les littéraux par `t("chat.welcome")`, etc.
- Pour `domainQuestions.ts` : passer chaque question à une clé i18n (`question: "domainQuestions.church.hasPastor.question"`) et résoudre via `t()` au moment de l'affichage.

### 1.2 Langue transmise à l'IA (edge functions)
Fichier : `supabase/functions/generate-image/index.ts` (et `analyze-request`, `analyze-image` si pertinent).

- Ajouter un champ `locale: "en" | "fr"` dans le payload envoyé par le client (lu depuis `i18n.language`).
- Injecter dans le system prompt : `Respond and generate all UI/chat text in ${locale}. Poster text language stays as user requests.`
- **Important** : conserver la règle mémoire « affiches en français par défaut » uniquement si l'utilisateur ne précise rien ; sinon suivre la langue de la plateforme pour les textes de dialogue, et la langue explicite de la demande pour le texte de l'affiche.

### 1.3 Adaptation à la langue du message utilisateur
Dans le system prompt du chat : « Start in ${platformLocale}. If the user writes in another language, switch to that language for the rest of the conversation. »

### 1.4 Tutoriel & onboarding
Fichiers : `src/components/tutorial/TutorialOverlay.tsx`, `TutorialStep.tsx`, `src/components/onboarding/OnboardingTour.tsx`, `src/pages/OnboardingPage.tsx`.

- Déplacer `TUTORIAL_STEPS` et `STEPS` vers i18n (`tutorial.steps.*`, `onboarding.steps.*`).
- Boutons "Passer / Suivant / C'est parti" → `t()`.

### 1.5 Toasts & UI restants
Balayage des `toast({...})`, labels de `src/components/chat/*`, `HistoryPanel`, `QualityChoice`, `FormatSelect`, `PostGenerationOptions`, `UpgradeModal`, `CreditBalance`, `AccountPage` header — passage à `t()`.

---

## Partie 2 — Création libre, inscription au téléchargement

### 2.1 Ouvrir `/app` aux visiteurs anonymes
- Retirer la protection auth de la route `/app` dans `src/App.tsx` (garder pour `/account`, `/admin/*`).
- Dans `AppPage.tsx` : autoriser `user === null`. Stocker l'état de la conversation et l'image générée en `sessionStorage` pour les invités.

### 2.2 Crédits pour invités
- Autoriser 1 génération anonyme (compteur `sessionStorage: guest_generations_used`).
- Côté edge function `generate-image` : si pas de JWT, vérifier un token invité (simple id anonyme + limite 1) OU relayer via un flag `guest: true` et limiter par IP dans la fonction.
- Après la 1ʳᵉ génération, si l'invité tente une 2ᵉ → prompt d'inscription.

### 2.3 Mur d'inscription au téléchargement
- Dans `ImagePreview.tsx` (bouton Télécharger) : si `!user`, ouvrir une modale « Créez un compte gratuit pour télécharger votre affiche » avec CTA vers `/auth?redirect=/app&restore=1`.
- Après connexion : restaurer l'image depuis `sessionStorage` et déclencher le téléchargement automatiquement + créditer les 6 crédits d'essai comme d'habitude.
- La modification/regénération reste possible sans compte (mais consomme le crédit invité).

### 2.4 Persistance côté serveur
- Ne rien insérer en base pour un invité tant qu'il n'est pas connecté (pas d'entrée `history`, pas de `poster`). L'image reste dans le bucket temp (déjà nettoyé après 7 jours).
- À l'inscription (post-login), transférer l'image temp vers l'espace utilisateur.

---

## Détails techniques

- **i18n hook** : utiliser `useTranslation()` partout ; pour les hooks non-React (edge functions), passer la locale en paramètre depuis le client.
- **useConversation** : accepter `locale` et l'utiliser pour les messages initiaux + le passer aux appels edge.
- **Domain questions** : structure `{ id, questionKey, followUp: { imageUpload: { labelKey, hintKey } } }`.
- **Guest mode** : `useAuth` reste inchangé ; on gère un `isGuest = !user` dans `AppPage`.
- **Edge functions** : ajouter `verify_jwt = false` sur `generate-image` uniquement si nécessaire pour les invités ; sinon utiliser une clé service côté client publique + rate limit IP.

## Hors périmètre (non touché)
- Textes des affiches générées : restent selon la demande utilisateur (mémoire FR par défaut conservée si aucune indication).
- Pages admin (déjà en FR interne, non exposées aux end users).
- Landing page (déjà i18n).

Après approbation, j'implémente en commençant par la Partie 2 (accès libre) puis la Partie 1 (i18n complète du chat + tutoriel + edge prompt).
