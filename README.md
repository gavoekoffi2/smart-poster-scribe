# Graphiste GPT — Smart Poster Scribe

Plateforme SaaS de génération d'affiches et visuels marketing par IA, destinée aux TPE/PME francophones.

## Stack

- **Frontend** : Vite + React + TypeScript + Tailwind + shadcn-ui
- **Backend** : Supabase (Postgres + Edge Functions Deno + Auth + Storage)
- **IA** : Kie AI, OpenRouter (Nano Banana Pro), Google Gemini
- **Paiements** : Moneroo & FedaPay (XOF / USD)

## Développement local

Prérequis : Node.js 18+, npm ou bun.

```sh
npm install
npm run dev
```

L'app démarre sur `http://localhost:8080`.

## Scripts

- `npm run dev` — serveur de dev avec HMR
- `npm run build` — build production
- `npm run build:dev` — build en mode développement
- `npm run lint` — ESLint
- `npm run preview` — preview du build

## Variables d'environnement

Voir `.env`. Les Edge Functions Supabase utilisent en plus des secrets côté serveur (`MONEROO_SECRET_KEY`, `MONEROO_WEBHOOK_SECRET`, `FEDAPAY_SECRET_KEY`, `KIE_API_KEY`, `OPENROUTER_API_KEY`, etc.) configurés via le dashboard Supabase.
