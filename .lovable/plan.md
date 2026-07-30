## Réponse courte

Oui : **c'est bien via MCP**. GraphisteGPT expose déjà un serveur MCP sécurisé par OAuth (`/functions/v1/mcp`) avec 4 outils en lecture seule. Hermès (dans Claude, ChatGPT, Cursor…) s'y connecte, se connecte **avec votre compte**, et agit en tant que vous. Il manque juste les outils d'action : aujourd'hui il peut seulement lire.

## Ce qu'on ajoute

### 1. Générer et vérifier (boucle « teste → corrige → recommence »)

- `generate_poster` — lance une génération (texte, domaine, format, mode rapide/premium, image de référence optionnelle) et renvoie un `job_id` immédiatement (mode asynchrone, pour ne pas dépasser le délai d'attente du client MCP).
- `get_job_status` — état du job : en attente / en cours / terminé (URL de l'affiche) / échec (message d'erreur).
- `modify_poster` — relance une modification d'une affiche existante (mode modification, gratuit) : c'est l'outil qui permet à Hermès d'itérer jusqu'au résultat voulu.
- `rate_poster` — enregistre une note sur une affiche générée, pour qu'Hermès mesure ses propres résultats.

Ces outils appellent la logique existante de `generate-image`, donc mêmes règles métier : crédits, qualité, clonage, anti-hallucination.

### 2. Piloter le compte

- `get_my_credits`, `list_my_posters`, `get_poster`, `search_templates` — déjà en place, on les garde.
- `get_my_account` — profil, plan, quotas, paramètres par défaut (logo, couleurs, entreprise).

### 3. Admin / modération (réservé aux comptes admin)

Chaque outil vérifie le rôle via `has_role(auth.uid(), 'admin')` côté base ; un compte non-admin reçoit un refus clair.

- `admin_list_generation_requests` — journal des demandes (y compris visiteurs non inscrits), filtres statut/date, pour repérer les échecs.
- `admin_generation_stats` — taux d'échec, volumes, répartition par domaine sur une période.
- `admin_list_users` — liste des utilisateurs avec plan, crédits, dernière activité.
- `admin_moderate_showcase` — valider ou retirer une affiche de la vitrine.
- `admin_set_subscription` — activer/prolonger un abonnement offert (durée en jours).

## Sécurité

- Aucun outil ne prend de `user_id` en entrée : l'identité vient du jeton OAuth vérifié.
- Toutes les requêtes passent par la clé publique + jeton de l'utilisateur, donc les règles RLS s'appliquent telles quelles. Aucune clé de service dans les outils.
- Les outils admin échouent proprement pour un utilisateur normal.
- Les outils qui écrivent (`generate_poster`, `modify_poster`, `admin_*`) sont marqués comme non-lecture-seule, donc le client d'Hermès demandera confirmation avant exécution.

## Détails techniques

- Nouveaux fichiers dans `src/lib/mcp/tools/`, enregistrés dans `src/lib/mcp/index.ts` ; le greffon Vite régénère `supabase/functions/mcp/index.ts`.
- Les outils admin s'appuient sur des fonctions SQL `security definer` déjà présentes ou à créer (contrôle de rôle interne), jamais sur une élévation de privilèges dans l'outil.
- Le mode asynchrone s'appuie sur la table `image_jobs` (`status`, `result_url`, `error_message`) déjà utilisée par l'API v1.
- Après implémentation : régénération du manifeste MCP + déploiement de la fonction `mcp`.

## Connexion d'Hermès (après implémentation)

1. Dans le client d'Hermès, ajouter un serveur MCP : `https://graphistegpt.pro`… en réalité l'URL de la fonction `mcp` du backend (je vous la donnerai telle quelle).
2. Hermès ouvre une page de connexion GraphisteGPT → vous vous connectez avec votre compte admin → vous approuvez.
3. Les outils apparaissent dans Hermès ; il peut alors générer, vérifier, corriger et superviser en boucle.
