
# Plan : Application des Règles aux Créations Libres + Téléchargement Multi-Format

## Contexte

L'utilisateur a demandé 3 améliorations :

1. **Appliquer toutes les règles aux créations libres** : Quand l'utilisateur n'a pas d'image de référence, le système sélectionne automatiquement un template. Les règles de détection contextuelle, remplacement de couleurs, suppression des objets hors contexte et adaptation du layout doivent s'appliquer à ces cas aussi.

2. **Améliorer la qualité des affiches sans template** : S'inspirer de tous les templates de la base pour créer des designs professionnels avec typographie stylisée et layouts bien designés.

3. **Téléchargement automatique avec formats multiples** : Le téléchargement doit être direct (pas d'ouverture dans un nouvel onglet) et proposer PNG, JPEG et PDF.

---

## Analyse Actuelle

### Ce qui fonctionne
- Le système sélectionne automatiquement un template si aucun n'est fourni (`isAutoSelectedTemplate = true`)
- Les templates auto-sélectionnés sont traités comme du clonage (`isCloneMode = true`)
- Le téléchargement est déjà automatique via blob (pas d'ouverture dans un nouvel onglet)

### Ce qui manque
- **Les Expert Skills ne sont PAS injectés en mode clone** : Les règles de typographie professionnelle, composition, et effets ne s'appliquent qu'en mode création libre pure
- **Pas de détection contextuelle pour les templates auto-sélectionnés** : Les règles de suppression d'objets/textes hors contexte ne sont pas appliquées
- **Pas de choix de format de téléchargement** : Seulement PNG actuellement
- **Pas de support PDF** : Nécessite une conversion côté client

---

## Solution Proposée

### Volet 1 : Injecter les Expert Skills en Mode Clone

Modifier `buildProfessionalPrompt` dans `generate-image/index.ts` pour :
- Injecter les compétences expertes (typographie, composition, effets) AUSSI en mode clone
- Appliquer les règles de qualité professionnelle à toutes les générations

```text
Actuel:
┌─────────────────────────────────────┐
│ MODE CLONE → Instructions clonage   │
│ MODE LIBRE → Instructions création  │
│              + Expert Skills        │
└─────────────────────────────────────┘

Nouveau:
┌─────────────────────────────────────┐
│ MODE CLONE → Instructions clonage   │
│              + Expert Skills TYPO   │
│ MODE LIBRE → Instructions création  │
│              + Expert Skills        │
└─────────────────────────────────────┘
```

### Volet 2 : Ajouter Menu de Téléchargement Multi-Format

Créer un composant `DownloadMenu` avec :
- Bouton principal qui ouvre un menu déroulant
- Options : PNG (haute qualité), JPEG (léger), PDF (impression)
- Conversion côté client pour PDF (canvas to PDF)

### Volet 3 : Améliorer les Instructions Clone pour Qualité Pro

Renforcer les instructions de clonage pour garantir :
- Typographie stylisée (pas de texte brut)
- Effets 3D, dégradés, glow sur les titres
- Layouts avec courbes et formes professionnelles

---

## Modifications Techniques

### Fichier 1 : `supabase/functions/generate-image/index.ts`

**Modification A** : Injecter les Expert Skills en mode clone aussi

```typescript
// Dans buildProfessionalPrompt, ligne ~196
if (isCloneMode || hasReferenceImage) {
  instructions.push("🚨 MODE ÉDITION: Tu MODIFIES l'image de référence...");
  // ... instructions clonage existantes ...
  
  // NOUVEAU: Injecter les compétences expertes AUSSI en mode clone
  // pour garantir une qualité typographique professionnelle
  const detectedDomain = detectDomainFromPrompt(userPrompt);
  console.log(`Expert skills (clone mode): Domain "${detectedDomain}"`);
  
  // Extraire seulement les règles de typographie et effets du profil expert
  const profile = getExpertProfileForDomain(detectedDomain);
  instructions.push("");
  instructions.push("━━━ 🎨 QUALITÉ TYPOGRAPHIQUE PROFESSIONNELLE ━━━");
  profile.typography.forEach(rule => instructions.push(`   • ${rule}`));
  instructions.push("");
  instructions.push("━━━ ✨ EFFETS & FINITIONS PREMIUM ━━━");
  profile.effects.slice(0, 5).forEach(rule => instructions.push(`   • ${rule}`));
  instructions.push("");
  instructions.push("⚠️ APPLIQUER ces règles au contenu de l'utilisateur, pas au template.");
}
```

**Modification B** : Ajouter des instructions spécifiques pour le rendu professionnel

```typescript
// Après les instructions de clonage
instructions.push("━━━ 🎯 RENDU PROFESSIONNEL OBLIGATOIRE ━━━");
instructions.push("TYPOGRAPHIE: Jamais de texte brut/basique. Toujours stylisé:");
instructions.push("   • Titres avec effets 3D, dégradés, ou glow");
instructions.push("   • Bordures/contours pour lisibilité");
instructions.push("   • Hiérarchie visuelle claire (tailles variées)");
instructions.push("LAYOUT: Formes organiques et courbes professionnelles:");
instructions.push("   • Bandeaux avec coins arrondis ou formes dynamiques");
instructions.push("   • Zones de texte avec fonds stylisés");
instructions.push("   • Éléments décoratifs (lignes, motifs, particules)");
```

### Fichier 2 : `src/pages/AppPage.tsx`

**Modification A** : Remplacer le bouton de téléchargement par un menu déroulant

```typescript
// Importer les composants nécessaires
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Nouvelle fonction handleDownloadWithFormat
const handleDownloadWithFormat = async (format: 'png' | 'jpeg' | 'pdf') => {
  const imageToDownload = generatedImage || selectedHistoryImage?.imageUrl;
  const imageId = feedbackImageId || selectedHistoryImage?.id;
  
  if (!imageToDownload) return;
  
  try {
    // Fetch the image as blob
    const response = await fetch(imageToDownload, { mode: 'cors' });
    const blob = await response.blob();
    
    if (format === 'pdf') {
      // Convert to PDF using canvas
      await downloadAsPdf(blob);
    } else if (format === 'jpeg') {
      // Convert PNG to JPEG for smaller file size
      await downloadAsJpeg(blob);
    } else {
      // Download as PNG (original quality)
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `graphiste-gpt-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }
    
    // Mark as downloaded
    if (imageId) {
      await markAsDownloaded({ id: imageId });
    }
    
    toast.success(`Image téléchargée en ${format.toUpperCase()} !`);
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Erreur lors du téléchargement");
  }
};

// Fonction pour télécharger en JPEG
const downloadAsJpeg = async (pngBlob: Blob) => {
  const img = new Image();
  const blobUrl = URL.createObjectURL(pngBlob);
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Fill with white background (JPEG doesn't support transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((jpegBlob) => {
          if (jpegBlob) {
            const jpegUrl = URL.createObjectURL(jpegBlob);
            const link = document.createElement('a');
            link.href = jpegUrl;
            link.download = `graphiste-gpt-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(jpegUrl);
            resolve();
          } else {
            reject(new Error("Failed to convert to JPEG"));
          }
        }, 'image/jpeg', 0.92);
      }
      
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = blobUrl;
  });
};

// Fonction pour télécharger en PDF
const downloadAsPdf = async (imageBlob: Blob) => {
  const img = new Image();
  const blobUrl = URL.createObjectURL(imageBlob);
  
  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      // Créer un canvas à la taille de l'image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        // Créer le PDF en utilisant une approche simple
        // Calculer les dimensions en mm (A4 = 210x297mm, A3 = 297x420mm)
        const aspectRatio = img.width / img.height;
        let pageWidth = 210; // A4 width in mm
        let pageHeight = pageWidth / aspectRatio;
        
        // Si trop haut, inverser la logique
        if (pageHeight > 297) {
          pageHeight = 297;
          pageWidth = pageHeight * aspectRatio;
        }
        
        // Utiliser jsPDF-like approach avec dataURL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        // Créer un PDF simple en utilisant une iframe pour l'impression
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Graphiste GPT - Affiche</title>
              <style>
                @page { size: auto; margin: 0; }
                body { margin: 0; padding: 0; }
                img { 
                  width: 100%; 
                  height: auto; 
                  max-width: 100vw;
                  max-height: 100vh;
                  object-fit: contain;
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" />
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 100);
                }
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
        }
        
        resolve();
      }
      
      URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = blobUrl;
  });
};
```

**Modification B** : Remplacer le bouton par un DropdownMenu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 font-medium glow-gold">
      <Download className="w-4 h-4 mr-2" />
      Télécharger
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuItem onClick={() => handleDownloadWithFormat('png')}>
      <FileImage className="w-4 h-4 mr-2" />
      PNG (Haute qualité)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDownloadWithFormat('jpeg')}>
      <FileImage className="w-4 h-4 mr-2" />
      JPEG (Fichier léger)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDownloadWithFormat('pdf')}>
      <FileText className="w-4 h-4 mr-2" />
      PDF (Impression)
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Fichier 3 : `supabase/functions/generate-image/expertSkills.ts`

**Modification** : Exporter la fonction `getExpertProfileForDomain` pour l'utiliser dans index.ts

```typescript
// La fonction existe déjà, juste s'assurer qu'elle est exportée
export function getExpertProfileForDomain(domain: string): ExpertSkillProfile {
  // ... code existant ...
}
```

---

## Flux Amélioré

```
Utilisateur sans image de référence:

1. Écrit: "Affiche pour mon restaurant La Saveur, promo poulet 3000 FCFA"

2. Système DÉTECTE:
   - Domaine: restaurant
   - Éléments: titre, prix, contact (si fourni)

3. Système SÉLECTIONNE automatiquement un template restaurant
   → isAutoSelectedTemplate = true
   → isCloneMode = true

4. GÉNÉRATION avec:
   ✅ Instructions de clonage (garder layout, remplacer contenu)
   ✅ Compétences Expert Restaurant (typographie élégante, effets vapeur...)
   ✅ Détection contextuelle (si template mal adapté)
   ✅ Règle 60-30-10 pour les couleurs
   ✅ Zéro espace vide
   ✅ Rendu professionnel obligatoire

5. Téléchargement:
   - Clic sur "Télécharger"
   - Menu: PNG | JPEG | PDF
   - Téléchargement direct (pas d'ouverture dans un onglet)
```

---

## Résumé des Modifications

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `generate-image/index.ts` | Injecter Expert Skills en mode clone | Qualité pro pour toutes les générations |
| `generate-image/expertSkills.ts` | Export de `getExpertProfileForDomain` | Accès aux profils depuis index.ts |
| `AppPage.tsx` | Menu de téléchargement multi-format | PNG, JPEG, PDF disponibles |
| `AppPage.tsx` | Fonctions de conversion | JPEG (via canvas), PDF (via print) |

---

## Considération Technique : PDF

Pour le PDF, deux approches sont possibles :

1. **Approche Print (implémentée)** : Ouvre une fenêtre avec l'image et déclenche l'impression. L'utilisateur peut "enregistrer en PDF" via le système d'impression.

2. **Approche jsPDF (alternative)** : Nécessite l'ajout d'une dépendance `jspdf`. Plus propre mais ajoute ~200KB au bundle.

L'approche Print est proposée car elle ne nécessite pas de dépendance supplémentaire et fonctionne sur tous les navigateurs.

---

## Impact Attendu

### Qualité des Affiches
- Typographie stylisée même en mode clone (effets 3D, glow, dégradés)
- Layouts professionnels avec courbes et formes organiques
- Compétences expertes appliquées à TOUTES les générations

### Téléchargement
- Téléchargement direct et automatique (pas d'ouverture d'onglet)
- Choix du format : PNG, JPEG ou PDF
- Conversion côté client (pas de charge serveur)
