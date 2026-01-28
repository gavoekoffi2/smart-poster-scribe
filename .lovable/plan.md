
# Plan : Integration des Miniatures YouTube et Interface d'Administration du Marquee

## Objectif

1. **Ajouter les 4 nouvelles miniatures YouTube** au marquee du landing page
2. **Creer une interface d'administration** pour gerer dynamiquement les images du marquee (ajouter/supprimer/activer-desactiver)

---

## Fichiers Uploades a Integrer

Les 4 miniatures YouTube uploadees :
- `maxresdefault_1-2.jpg` - E-commerce/Shopify (Commencer le E-commerce - Cout total)
- `maxresdefault-2.jpg` - TikTok Sales (37.45k euro ventes)
- `maxresdefault_3.jpg` - YouTube Subscribers (28K abonnes vs -72)
- `maxresdefault_2.jpg` - Business (Ne pas lancer de Business)

---

## Architecture de la Solution

### Approche : Table Dediee en Base de Donnees

Le marquee sera gere dynamiquement via une table `marquee_items` :
- Stockage des images et leur configuration
- Chargement dynamique avec fallback sur les images actuelles
- Interface admin dediee pour la gestion

---

## Fichiers a Creer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `public/reference-templates/youtube/*.jpg` | COPIER | Ajouter les 4 nouvelles miniatures |
| Migration SQL | CREER | Table `marquee_items` avec RLS |
| `src/pages/AdminMarquee.tsx` | CREER | Page de gestion du marquee |
| `src/components/landing/TemplatesMarquee.tsx` | MODIFIER | Charger depuis la DB avec fallback |
| `src/pages/AdminDashboard.tsx` | MODIFIER | Ajouter lien vers gestion marquee |
| `src/App.tsx` | MODIFIER | Ajouter route `/admin/marquee` |
| `src/integrations/supabase/types.ts` | AUTO-UPDATE | Types generes automatiquement |

---

## Phase 1 : Ajout des Miniatures

### Copie des Fichiers

```text
public/reference-templates/youtube/
├── commencer-ecommerce.jpg       (existant)
├── ecommerce-tiktok-sales.jpg    (existant)
├── ecommerce-cout-total.jpg      (NOUVEAU - maxresdefault_1-2.jpg)
├── tiktok-ventes-37k.jpg         (NOUVEAU - maxresdefault-2.jpg)
├── youtube-subscribers-28k.jpg   (NOUVEAU - maxresdefault_3.jpg)
├── ne-pas-lancer-business.jpg    (NOUVEAU - maxresdefault_2.jpg)
```

---

## Phase 2 : Migration Base de Donnees

### Table `marquee_items`

```sql
CREATE TABLE public.marquee_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'other',
  row_number INTEGER NOT NULL CHECK (row_number BETWEEN 1 AND 3),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour les requetes frequentes
CREATE INDEX idx_marquee_items_active 
  ON public.marquee_items(is_active, row_number, sort_order);

-- RLS
ALTER TABLE public.marquee_items ENABLE ROW LEVEL SECURITY;

-- Lecture publique des elements actifs
CREATE POLICY "Anyone can view active marquee items"
  ON public.marquee_items FOR SELECT
  USING (is_active = true);

-- Gestion par les admins/content managers
CREATE POLICY "Admins can manage marquee items"
  ON public.marquee_items FOR ALL
  USING (has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']::app_role[]));
```

### Seed Initial des Donnees

Migration pour inserer les images actuellement codees en dur :

```sql
INSERT INTO public.marquee_items (image_url, domain, row_number, sort_order, is_active)
VALUES
  -- Row 1
  ('/reference-templates/church/14-jours-jeune.jpg', 'church', 1, 1, true),
  ('/reference-templates/ecommerce/mega-sales-event.jpg', 'ecommerce', 1, 2, true),
  -- ... autres images existantes
  ('/reference-templates/youtube/ecommerce-tiktok-sales.jpg', 'youtube', 1, 10, true),
  -- Row 2
  ('/reference-templates/youtube/commencer-ecommerce.jpg', 'youtube', 2, 10, true),
  -- Nouvelles miniatures
  ('/reference-templates/youtube/ecommerce-cout-total.jpg', 'youtube', 1, 11, true),
  ('/reference-templates/youtube/tiktok-ventes-37k.jpg', 'youtube', 2, 11, true),
  ('/reference-templates/youtube/youtube-subscribers-28k.jpg', 'youtube', 3, 10, true),
  ('/reference-templates/youtube/ne-pas-lancer-business.jpg', 'youtube', 3, 11, true);
```

---

## Phase 3 : Page d'Administration du Marquee

### Structure de `AdminMarquee.tsx`

```text
AdminMarquee
├── Header (titre + navigation retour)
├── Section Upload/Ajout
│   ├── Upload nouvelle image OU
│   ├── Selection depuis templates existants
│   ├── Choix de la rangee (1, 2, ou 3)
│   └── Bouton ajouter
├── Sections par Rangee (x3)
│   ├── Rangee 1 - Defilement gauche vers droite
│   │   └── Grille d'images avec toggle actif/inactif + suppression
│   ├── Rangee 2 - Defilement droite vers gauche
│   │   └── Grille d'images avec toggle actif/inactif + suppression
│   └── Rangee 3 - Defilement gauche vers droite
│       └── Grille d'images avec toggle actif/inactif + suppression
```

### Fonctionnalites

1. **Vue par rangee** : Affichage des 3 rangees du marquee
2. **Ajouter une image** :
   - Upload d'une nouvelle image vers storage
   - Ou selection depuis les templates de reference existants
   - Attribution a une rangee specifique
3. **Activer/Desactiver** : Toggle switch sans supprimer
4. **Supprimer** : Retirer du marquee (avec confirmation)
5. **Preview en temps reel** : Voir l'effet des changements

---

## Phase 4 : Modification du Composant TemplatesMarquee

### Logique de Chargement Dynamique

```typescript
// Etat initial avec fallback
const [marqueeItems, setMarqueeItems] = useState<{
  row1: string[];
  row2: string[];
  row3: string[];
}>({
  row1: FALLBACK_TEMPLATES.row1,
  row2: FALLBACK_TEMPLATES.row2,
  row3: FALLBACK_TEMPLATES.row3,
});

// Chargement depuis la base de donnees
useEffect(() => {
  const loadMarqueeItems = async () => {
    const { data, error } = await supabase
      .from("marquee_items")
      .select("image_url, row_number")
      .eq("is_active", true)
      .order("sort_order");
    
    if (data && data.length > 0) {
      const grouped = {
        row1: data.filter(i => i.row_number === 1).map(i => i.image_url),
        row2: data.filter(i => i.row_number === 2).map(i => i.image_url),
        row3: data.filter(i => i.row_number === 3).map(i => i.image_url),
      };
      // Seulement mettre a jour si des donnees existent
      if (grouped.row1.length > 0 || grouped.row2.length > 0 || grouped.row3.length > 0) {
        setMarqueeItems(grouped);
      }
    }
    // Sinon, garder le fallback
  };
  
  loadMarqueeItems();
}, []);
```

---

## Phase 5 : Navigation Admin

### Mise a Jour du Dashboard

Ajouter dans `navItems` :

```typescript
{ 
  id: 'marquee' as const, 
  label: "Marquee", 
  icon: Rows3,  // ou GalleryHorizontal
  permission: 'manage_templates' 
}
```

### Nouvelle Route

```typescript
// Dans App.tsx
<Route path="/admin/marquee" element={<AdminMarquee />} />
```

---

## Resume des Modifications

### Fichiers a Creer

| Fichier | Description |
|---------|-------------|
| `src/pages/AdminMarquee.tsx` | Interface complete de gestion du marquee |

### Fichiers a Modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/landing/TemplatesMarquee.tsx` | Chargement dynamique + fallback |
| `src/pages/AdminDashboard.tsx` | Ajout lien navigation vers marquee |
| `src/App.tsx` | Route `/admin/marquee` |

### Migration SQL

| Action | Description |
|--------|-------------|
| CREATE TABLE | `marquee_items` avec colonnes et contraintes |
| CREATE INDEX | Index sur `is_active`, `row_number`, `sort_order` |
| RLS POLICIES | Lecture publique + gestion admin |
| SEED DATA | Migration des images actuelles vers la DB |

### Assets

| Fichier | Destination |
|---------|-------------|
| `maxresdefault_1-2.jpg` | `public/reference-templates/youtube/ecommerce-cout-total.jpg` |
| `maxresdefault-2.jpg` | `public/reference-templates/youtube/tiktok-ventes-37k.jpg` |
| `maxresdefault_3.jpg` | `public/reference-templates/youtube/youtube-subscribers-28k.jpg` |
| `maxresdefault_2.jpg` | `public/reference-templates/youtube/ne-pas-lancer-business.jpg` |

---

## Comportement Final

### Pour les Visiteurs

- Le marquee affiche les images gerees dynamiquement depuis la base de donnees
- Fallback sur les images codees en dur si la DB est vide
- Le bouton "S'inspirer" fonctionne sur toutes les images (y compris YouTube)

### Pour les Administrateurs

- Acces a `/admin/marquee` depuis le dashboard
- Vue des 3 rangees avec toutes les images
- Possibilite d'ajouter/supprimer/activer-desactiver des images
- Detection automatique du domaine depuis le chemin de l'image
- Changements appliques en temps reel sur le landing page
