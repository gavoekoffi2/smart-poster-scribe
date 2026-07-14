## Objectif
Rendre la plateforme bilingue **Anglais / Français**, avec **Anglais par défaut** et un sélecteur de langue accessible partout.

## Approche technique
- Installer `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Créer `src/i18n/index.ts` (init) et deux fichiers de traductions :
  - `src/i18n/locales/en.json` (défaut)
  - `src/i18n/locales/fr.json`
- Namespaces organisés par zone : `common`, `nav`, `landing`, `auth`, `app`, `account`, `pricing`, `admin`, `footer`.
- Détection : `localStorage` → sinon **anglais** (pas de détection navigateur pour garantir EN par défaut).
- Persistance du choix dans `localStorage` (`i18nextLng`).

## Sélecteur de langue
Composant `src/components/LanguageSwitcher.tsx` (menu déroulant 🇬🇧 EN / 🇫🇷 FR) intégré dans :
- `Navbar` (desktop + menu mobile)
- `AdminLayout` (sidebar)
- `Footer`

## Portée des traductions (phase 1 — surface visible utilisateur)
1. **Navbar** + menu mobile
2. **LandingPage** : Hero, Features, Pricing, Showcase, Templates, Contact, FAQ, CTA, Footer
3. **AuthPage** (labels, boutons, messages toast)
4. **AppPage** (chat, boutons post-génération, options, éditeur visuel)
5. **AccountPage** (onglets, labels)
6. **PricingPage**
7. **Pages légales** : conserver le contenu FR existant + version EN (contenu court traduit).
8. **Toasts / erreurs** communs.

## Portée non incluse (reste en français)
- **Dashboards admin** (`/admin/*`) : outil interne — reste en FR.
- **Prompts IA de génération d'affiches** : la mémoire projet impose **le français par défaut pour les affiches générées**. Le sélecteur change uniquement l'UI, pas la langue des affiches produites.
- Pages designer (`/designer/*`) : phase 2.

## Fichiers créés
- `src/i18n/index.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/fr.json`
- `src/components/LanguageSwitcher.tsx`

## Fichiers modifiés (principaux)
- `src/main.tsx` (import i18n)
- `src/components/landing/Navbar.tsx`, `Footer.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `PricingSection.tsx`, `CTASection.tsx`, `ContactSection.tsx`, `FAQSection.tsx`, `ShowcaseSection.tsx`, `TemplatesMarketplace.tsx`
- `src/pages/AuthPage.tsx`, `AppPage.tsx`, `AccountPage.tsx`, `PricingPage.tsx`, `LandingPage.tsx`
- `src/components/chat/PostGenerationOptions.tsx` et composants chat visibles
- `index.html` (attribut `lang` dynamique via effect)

## Comportement par défaut
- Premier visiteur → **Anglais**.
- Choix utilisateur mémorisé dans `localStorage` → conservé entre visites.
- Changement de langue instantané (pas de rechargement).

Confirmez-vous que je peux **conserver l'admin en FR** et que **les affiches générées restent produites en français** (l'UI seule bascule) ?