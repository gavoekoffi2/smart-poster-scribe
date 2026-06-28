
# Programme Graphistes Partenaires

## Modèle économique retenu

- **Royalty** : 20% (paramétrable par l'admin) de la valeur monétaire d'une génération, versés au graphiste à chaque utilisation de son template.
- **Valeur d'une génération** : 0,20 $ par défaut (paramétrable). Indépendant du plan de l'abonné — un illimité génère = le graphiste touche pareil.
- **Clone strict forcé** : tout template provenant d'un graphiste partenaire active automatiquement le mode pixel-perfect (`isCloneMode = true`). Le design reste intact, seul le texte/contenu de l'utilisateur est injecté.
- **Payouts** : manuels, demande déclenchée par le graphiste depuis son dashboard à partir de 10 000 FCFA, validation et marquage "payé" par l'admin.

## Ce qui existe déjà (à ne pas refaire)

- Tables `partner_designers`, `reference_templates.designer_id/earnings/usage_count`, `template_earnings`.
- Pages : `/designer/register`, `/designer/dashboard`, `/designer/upload`, `/designer/profile`, `/designer/:id` (public).
- Admin : `/admin/designers` pour vérifier les graphistes.
- Route protégée `DesignerRoute`.

## Ce qui manque et qu'on va construire

### 1. Paramètres globaux (admin)
Nouvelle table `platform_settings` (clé/valeur) avec deux entrées :
- `designer_royalty_rate` (défaut `0.20`)
- `generation_unit_value_usd` (défaut `0.20`)
Écran `/admin/settings` minimal pour les modifier.

### 2. Crédit automatique des royalties
- Trigger SQL `on_image_job_completed` : quand un `image_jobs` passe à `completed` ET que le template utilisé a un `designer_id` non null :
  - calcule `royalty = unit_value * rate`
  - insère dans `template_earnings`
  - incrémente `reference_templates.earnings` et `reference_templates.usage_count`
  - incrémente `partner_designers.total_earnings`
- Idempotent (clé unique sur `job_id` dans `template_earnings`).

### 3. Tableau de bord graphiste enrichi
Dans `/designer/dashboard` :
- KPI : gains totaux, gains du mois, solde disponible, nombre d'utilisations
- Tableau "Mes créations" avec usage_count + earnings par template
- Bouton "Activer / Désactiver" un template
- Graphique simple "Utilisations sur 30 jours"
- Section "Payouts" : solde, bouton "Demander un retrait" (≥ 10 000 FCFA), historique

### 4. Système de payouts
Nouvelle table `designer_payout_requests` (designer_id, amount, status pending/paid/rejected, payment_method, payment_details, admin_note, paid_at).
- Le graphiste remplit ses coordonnées (Mobile Money / IBAN) et soumet
- Le solde disponible = `total_earnings` - somme des payouts validés/en attente
- Admin valide depuis `/admin/designer-payouts` (nouvelle page)

### 5. Upload : clone strict par défaut
Dans `/designer/upload` : checkbox pré-cochée et verrouillée "Mes templates sont reproduits à l'identique" + texte d'info expliquant la protection.

### 6. Génération : forcer le clone pour les templates partenaires
- L'edge function de génération détecte `template.designer_id IS NOT NULL` → force `isCloneMode = true` et désactive les variations créatives, quels que soient les paramètres utilisateur.
- Affichage dans `/app` : badge "Design original — clone exact" et nom + lien profil du graphiste sous le template choisi.

### 7. Marketplace : section "Par nos graphistes"
- Filtre dédié dans `TemplatesMarketplace` pour afficher uniquement les templates `designer_id IS NOT NULL`.
- Carte template affiche avatar + nom du graphiste, cliquable vers `/designer/:id`.

### 8. Onboarding et visibilité
- Lien "Devenir graphiste partenaire" dans le footer + page d'accueil section dédiée
- Bouton "Espace graphiste" dans le menu utilisateur si le user a un profil `partner_designers`

## Détails techniques

### Nouvelle table `platform_settings`
```text
key text primary key, value jsonb, updated_by uuid, updated_at timestamptz
GRANT SELECT public, ALL service_role ; RLS lecture publique, écriture super_admin/admin
```

### Nouvelle table `designer_payout_requests`
```text
id, designer_id (fk partner_designers), amount_usd numeric, amount_fcfa integer,
status enum(pending|approved|paid|rejected), payment_method text, payment_details jsonb,
admin_note text, requested_at, processed_at, processed_by uuid
GRANT SELECT/INSERT au designer propriétaire ; ALL service_role ; UPDATE admins
```

### Ajout à `template_earnings`
Colonne `job_id uuid UNIQUE` + `royalty_rate numeric` + `unit_value_usd numeric` pour traçabilité.

### Trigger
```text
AFTER UPDATE OF status ON image_jobs
WHEN NEW.status='completed' AND OLD.status<>'completed'
→ fonction record_designer_royalty(job_id)
```
Lit le `template_id` utilisé dans le job, vérifie `designer_id`, lit les settings, insère earning.

### Flag clone strict côté edge function
Dans le builder de prompt, après lecture du template :
```text
if (template.designer_id) { params.isCloneMode = true; params.allowVariations = false; }
```

## Découpage en livraisons

1. **Backend royalties** : migration settings + payout_requests + trigger + colonnes traçabilité.
2. **Dashboard graphiste v2** : KPI, tableau templates, graph, section payouts.
3. **Admin** : page settings + page payouts.
4. **Génération** : clone strict forcé pour templates partenaires + badge UI dans `/app`.
5. **Marketplace** : filtre "Par nos graphistes" + crédit graphiste sur les cartes.
6. **Visibilité onboarding** : footer, landing, menu user.

Je commencerai par 1 → 2 → 4 dans la première itération de build (cœur fonctionnel), puis 3 → 5 → 6 dans une seconde passe.
