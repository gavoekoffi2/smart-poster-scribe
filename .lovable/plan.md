
# Plan d'implémentation — Tous les chantiers (Sprints 1 à 5)

Je vais exécuter les 12 améliorations identifiées dans l'audit, sans interruption, dans l'ordre logique de dépendances. Chaque sprint est livré avec son backend, son front et ses tests visuels.

---

## Sprint 1 — Emails transactionnels + Relance promo (items 2, 3)

1. Activer l'infrastructure email Lovable (domaine + queue pgmq + cron).
2. Scaffolder les fonctions `send-transactional-email`, `handle-email-unsubscribe`, `process-email-queue`.
3. Créer 6 templates React Email :
   - `welcome` — envoyé au signup
   - `payment-receipt` — déclenché par `geniuspay-webhook` sur `completed`
   - `low-credits` — quand `credits_remaining ≤ 4`
   - `subscription-expiring` — J-3 avant `current_period_end`
   - `payout-approved` — graphiste/affilié
   - `referral-signup` — affilié notifié d'un nouveau filleul
4. Table `pricing_offers` (user_id, code, discount_pct, expires_at, used_at) + RLS.
5. Persister l'offre `BOOST20` du `UpgradeModal` en DB, l'appliquer côté `create-geniuspay-payment` si non expirée.
6. Cron quotidien `cron-low-credits-alerts` + `cron-subscription-expiring`.

## Sprint 2 — Marketplace graphistes : finir le programme (item 6)

7. Page `/admin/settings` : éditer `designer_royalty_rate` + `generation_unit_value_usd` (table `platform_settings` existe déjà).
8. Page `/admin/designer-payouts` : liste des `designer_payout_requests`, actions Approuver/Payer/Rejeter + note admin.
9. `TemplatesMarketplace` : nouveau filtre "Par nos graphistes" + crédit auteur sur chaque carte (avatar + nom cliquable → `/designer/:id`).
10. Lien "Devenir graphiste partenaire" dans `Footer`, section dédiée sur `LandingPage`, entrée "Espace graphiste" dans le menu user si profil `partner_designers` existe.
11. Dans `/app` : badge "Design original — clone exact" + lien profil graphiste sous le template choisi.

## Sprint 3 — Affiliation complète + Notifications in-app (items 5, 7)

12. Table `affiliate_payout_requests` (calquée sur designer) + RPC `get_affiliate_balance` + section "Mes gains & retraits" dans `AffiliateTab` (seuil 10 000 FCFA).
13. Page `/admin/affiliate-payouts` (mêmes patterns que designer payouts).
14. Table `notifications` (user_id, type, payload jsonb, read_at) + Realtime channel.
15. Composant `<NotificationBell />` dans `Navbar` (badge non-lus, dropdown, marquage lu).
16. Émettre des notifications sur : génération async terminée, commission affilié reçue, payout payé, abonnement activé.

## Sprint 4 — Dashboard, onboarding & API Usage (items 1, 4, 9)

17. Forcer le déclenchement du `TutorialOverlay` au 1er login (`tutorial_completed = false`).
18. Checklist "Premiers pas" sur `/account` (1ère affiche / définir logo / inviter un ami / connecter domaine).
19. Onglet "Statistiques" dans `/account` : graphique 30j générations, top 3 domaines, projection fin de crédits.
20. Onglet "API Usage" dans `/account` lisant `api_usage_logs` : requêtes/jour, top endpoints, latence p50/p95, erreurs 4xx/5xx, alerte 80% quota.
21. Modal "Note ta création" tous les 5 designs (utilise `generation_feedback` existant) + carrousel témoignages dynamique sur landing.

## Sprint 5 — Pro features : Équipes, SEO, Observabilité (items 8, 10, 11, 12)

22. Tables `teams`, `team_members` + pool de crédits partagé + plan "Agence" (50 sièges, 49$).
23. UI gestion d'équipe dans `/account` (inviter par email, rôles owner/member, retirer).
24. 8 landing pages SEO `/[domaine]` (église, mariage, restaurant, e-commerce, youtube, événement, immobilier, formation) avec JsonLd + meta complets.
25. Sitemap auto-régénéré incluant les nouvelles routes + 3 articles seeds dans `/blog` (mdx léger).
26. Intégration Sentry front + edge functions (DSN via secret).
27. Page publique `/status` lisant table `service_health` + bandeau d'incident global.
28. Alerte admin (notification + email) si > 5 paiements failed/heure.

---

## Tables à créer (résumé)

```text
pricing_offers              user-specific promo codes
affiliate_payout_requests   calqué sur designer_payout_requests
notifications               in-app notifications, realtime
teams                       owner_id, name, plan_id, credits_pool
team_members                team_id, user_id, role
service_health              statut public des services
email_log                   audit envois (auto par infra email)
```
Toutes avec GRANT explicites + RLS scopée propriétaire/service_role.

## Edge functions à créer

- `send-transactional-email` (scaffold Lovable)
- `cron-low-credits-alerts`, `cron-subscription-expiring`, `cron-payment-health-check`
- `create-team-invite`, `accept-team-invite`

## Secrets nécessaires

- `SENTRY_DSN` (à demander en cours de Sprint 5)
- Domaine email (configuration interactive au Sprint 1)

---

## Mode d'exécution

Je travaille **sprint par sprint sans m'arrêter**, en livrant à chaque sprint :
- Migration SQL (avec GRANT + RLS)
- Edge functions déployées
- Composants UI + intégration dans les pages existantes
- Vérification visuelle Playwright sur les écrans critiques

Au démarrage du Sprint 1, je vais devoir te demander **une seule chose interactive** : valider la configuration du domaine email (ex: `notify.graphistegpt.pro`). Ensuite tout est automatique.

Prêt à lancer le Sprint 1 dès validation de ce plan.
