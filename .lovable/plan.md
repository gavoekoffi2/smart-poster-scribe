
# Plan : Intégration des Miniatures YouTube dans le Marquee

## Objectifs
1. Ajouter les miniatures YouTube au défilement animé du landing page
2. Rendre le bouton "S'inspirer" fonctionnel et cliquable sur toutes les images du marquee

---

## Fichiers Uploadés à Intégrer

Les 2 miniatures YouTube uploadées :
- `maxresdefault.jpg` - Miniature e-commerce/TikTok (37.45k€ ventes)
- `maxresdefault_1.jpg` - Miniature e-commerce (Commencer le E-commerce)

---

## Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `public/reference-templates/youtube/` | CRÉER | Nouveau dossier pour les miniatures |
| `public/reference-templates/youtube/*.jpg` | COPIER | Copier les miniatures uploadées |
| `src/components/landing/TemplatesMarquee.tsx` | MODIFIER | Ajouter les miniatures + bouton fonctionnel |

---

## 1. Création du Dossier et Copie des Images

Créer la structure :
```
public/reference-templates/youtube/
├── ecommerce-tiktok-sales.jpg      (maxresdefault.jpg)
├── commencer-ecommerce.jpg         (maxresdefault_1.jpg)
```

---

## 2. Modifications du Composant TemplatesMarquee.tsx

### A. Imports à Ajouter

```typescript
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
```

### B. Ajouter les Miniatures YouTube aux Listes

```typescript
const MARQUEE_TEMPLATES = {
  row1: [
    // Templates existants...
    "/reference-templates/youtube/ecommerce-tiktok-sales.jpg",  // NOUVEAU
  ],
  row2: [
    // Templates existants...
    "/reference-templates/youtube/commencer-ecommerce.jpg",     // NOUVEAU
  ],
  row3: [
    // Templates existants...
  ],
};
```

### C. Fonction de Détection du Domaine

Ajouter une fonction helper pour détecter le domaine depuis le chemin de l'image :

```typescript
function getDomainFromPath(imagePath: string): string {
  if (imagePath.includes('/youtube/')) return 'youtube';
  if (imagePath.includes('/church/')) return 'church';
  if (imagePath.includes('/restaurant/')) return 'restaurant';
  if (imagePath.includes('/event/')) return 'event';
  if (imagePath.includes('/formation/')) return 'formation';
  if (imagePath.includes('/ecommerce/')) return 'ecommerce';
  if (imagePath.includes('/service/')) return 'service';
  if (imagePath.includes('/fashion/')) return 'fashion';
  return 'other';
}
```

### D. Transformer le Bouton Statique en Bouton Cliquable

**Avant (non fonctionnel) :**
```tsx
<div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/80...">
  <Sparkles className="w-3 h-3" />
  S'inspirer
</div>
```

**Après (fonctionnel) :**
```tsx
<button
  onClick={(e) => handleInspire(e, image)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 hover:bg-primary backdrop-blur-sm text-primary-foreground text-xs font-medium transition-all duration-200 hover:scale-105 shadow-lg"
>
  <Sparkles className="w-3 h-3" />
  S'inspirer
</button>
```

### E. Logique de Navigation (handleInspire)

Implémenter la même logique que dans `TemplatesMarketplace` :

```typescript
const handleInspire = async (e: React.MouseEvent, imageUrl: string) => {
  e.stopPropagation();
  
  // Déterminer le domaine depuis le chemin
  const domain = getDomainFromPath(imageUrl);
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Stocker le template pour après login
    sessionStorage.setItem('pendingCloneTemplate', JSON.stringify({
      imageUrl,
      domain
    }));
    navigate("/auth", { 
      state: { redirectTo: "/app", pendingClone: true } 
    });
    return;
  }
  
  // Utilisateur connecté → aller directement à l'app
  navigate("/app", {
    state: {
      cloneTemplate: { imageUrl, domain }
    }
  });
};
```

---

## 3. Adaptation du Style pour les Miniatures YouTube

Les miniatures YouTube sont en format 16:9 (paysage) alors que les affiches sont en 3:4 (portrait).

Pour maintenir la cohérence visuelle dans le défilement, j'ai deux options :

**Option 1 : Détecter et adapter le ratio**
```typescript
const isYouTube = image.includes('/youtube/');
className={`... ${isYouTube ? 'aspect-video' : 'aspect-[3/4]'}`}
```

**Option 2 : Garder le même ratio pour tous (recommandé)**
Les miniatures seront affichées avec le même ratio que les affiches (objet-cover) pour un défilement uniforme.

**Je recommande l'Option 2** pour une meilleure cohérence visuelle du marquee.

---

## 4. Structure Finale du Composant

```
TemplatesMarquee.tsx
├── Imports (useNavigate, supabase, Sparkles)
├── MARQUEE_TEMPLATES (avec miniatures YouTube)
├── getDomainFromPath() - fonction helper
├── MarqueeRow component
│   ├── useNavigate hook
│   ├── handleInspire() - navigation fonctionnelle
│   └── bouton cliquable avec onClick
└── export TemplatesMarquee
```

---

## Comportement Attendu

1. **Affichage** : Les miniatures YouTube défilent avec les autres affiches
2. **Hover** : Le bouton "S'inspirer" apparaît au survol
3. **Clic** :
   - Si **non connecté** → Redirige vers `/auth` (template stocké pour après login)
   - Si **connecté** → Redirige vers `/app` avec le template en état

---

## Avantages

1. **Visibilité** : Les visiteurs voient que la plateforme fait aussi des miniatures YouTube
2. **Cohérence UX** : Le bouton fonctionne partout (Marquee + Marketplace)
3. **Conversion** : Chaque image peut déclencher une inscription/connexion
4. **Réutilisation** : Même logique d'authentification que le reste de l'app
