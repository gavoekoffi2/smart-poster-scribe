
## Plan : Integration des prompts systeme experts dans le moteur de generation

### Objectif
Fusionner intelligemment les deux prompts systeme fournis par l'utilisateur dans la fonction `buildProfessionalPrompt` du fichier `supabase/functions/generate-image/index.ts`, pour renforcer la qualite des generations (clone et libre).

### Analyse de l'existant
Le prompt actuel (lignes 180-248) a deja une bonne base mais manque de precision sur :
- La **suppression intelligente** des elements non fournis (dates, telephones, etc.)
- L'**adaptation de domaine** quand le template est d'un domaine different de celui de l'utilisateur
- La **diversite par defaut** (personnes d'origine africaine)
- La **touche creative subtile** sans denaturer la structure
- Le **processus de secours** (Cas A / B / C) pour la creation libre

### Changements prevus

**Fichier : `supabase/functions/generate-image/index.ts`**

Remplacement de la fonction `buildProfessionalPrompt` (lignes 180-248) avec un prompt fusionne qui integre les deux prompts systeme :

#### Mode Clone (avec reference ou template auto-selectionne)
Le prompt sera restructure pour inclure les regles suivantes, de facon concise pour respecter la limite de tokens :

1. **Role** : Expert en Design Graphique specialise dans la personnalisation d'affiches
2. **Fidelite 95%** : Conserver rigoureusement structure, composition, courbes, effets
3. **Suppression intelligente** : Si une info du template n'est pas fournie par l'utilisateur, supprimer l'element ET ses icones/decorations associees. Zero espace vide, zero texte par defaut
4. **Adaptation de domaine** : Si le domaine du template differe de celui de l'utilisateur, adapter les icones/visuels thematiques (ex: livre vers fourchette) tout en gardant la structure
5. **Diversite par defaut** : Toutes les personnes representees doivent etre d'origine africaine sauf mention contraire explicite
6. **Touche personnelle subtile** : Ajouter de legers effets (lumiere, textures, finitions premium) pour rendre l'affiche unique sans briser la structure
7. **Rendu texte** : Texte 100% lisible, sans fautes, typographie adaptee au secteur
8. **Zero info inventee** : Jamais de noms/dates/prix fictifs

#### Mode Libre (sans reference, fallback)
Le prompt integrera la hierarchie de reference :
- Cas B : Template thematique le plus proche (deja implemente via auto-selection)
- Cas C : Si aucun template ne correspond, synthese d'un design unique inspire des standards esthetiques de la base
- Memes regles de suppression, diversite et touche creative

### Details techniques

La fonction passera de ~70 lignes a environ le meme volume, mais avec un contenu beaucoup plus cible et professionnel. Le prompt restera sous 3000 caracteres pour eviter les erreurs 500 de l'API Kie AI.

Regles condensees dans le prompt clone :
```text
ROLE: Expert Design Graphique - Personnalisation d'affiches professionnelles.
FIDELITE: 95% identique a la reference (layout, courbes, effets, profondeur).
REMPLACER: texte → donnees client | photos → photos client | logos → logos client.
SUPPRIMER: tout element dont l'info n'est PAS fournie (date, telephone, email, site web, adresse) + icones/decorations associees. Aucun espace vide, aucun texte par defaut.
ADAPTATION DOMAINE: si domaine template ≠ domaine client, adapter icones thematiques (ex: livre→fourchette) en gardant la structure.
DIVERSITE: personnes d'origine africaine par defaut sauf mention contraire.
TOUCHE CREATIVE: effets de lumiere subtils, textures fines, finitions premium. Ne pas denaturer la structure.
TEXTE: 100% lisible, zero faute, typographie adaptee au secteur.
COULEURS: palette client en 60-30-10 si fournie, sinon garder couleurs originales.
FOND: preferer blanc/neutre. Si fond colore, respecter regles de design.
ZERO INFO INVENTEE: jamais de noms/dates/prix/contacts fictifs.
```

### Deploiement
La fonction `generate-image` sera redeployee automatiquement apres modification.
