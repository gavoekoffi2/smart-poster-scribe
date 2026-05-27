## Objectif

Garantir que chaque affiche utilise uniquement un template correspondant au domaine réel de la demande utilisateur. Exemple : une demande de formation doit choisir un template `formation` ou, à défaut, un template très proche comme `education/service`, mais jamais `restaurant`.

## Plan de correction

### 1. Utiliser un seul domaine de référence

Dans `supabase/functions/generate-image/index.ts`, remplacer la détection locale de domaine utilisée pour choisir le template par la même logique que celle utilisée dans le prompt de génération : `detectDomainFromPrompt(userPrompt)`.

Résultat attendu : le domaine détecté pour les consignes IA et le domaine utilisé pour choisir le template seront toujours alignés.

### 2. Supprimer les fallbacks hors contexte

Modifier la sélection automatique de templates pour respecter ces règles :

- chercher d’abord uniquement les templates du domaine détecté ;
- si aucun template exact n’existe, chercher seulement dans une famille proche du domaine ;
- ne jamais utiliser `restaurant` comme fallback pour `formation`, `education`, `service`, `technology`, etc. ;
- si aucun template pertinent n’existe, générer en mode libre au lieu de cloner un template d’un autre domaine.

Exemple de familles proches :

```text
formation -> education, service, event
education -> formation, service, event
restaurant -> ecommerce, event
church -> event
sport -> event
technology -> service, education
```

### 3. Renforcer les mots-clés ambigus

Retirer ou durcir les mots-clés trop génériques qui peuvent déclencher `restaurant` par erreur, comme `menu`, `plat`, `buffet`, `food`.

Ils ne compteront comme restaurant que si le contexte contient aussi un signal fort : `restaurant`, `chef`, `cuisine`, `traiteur`, `maquis`, etc.

### 4. Ajouter un garde-fou dans le prompt de clonage

Quand un template proche mais non identique est utilisé, ajouter une consigne explicite :

- supprimer tout élément visuel appartenant au domaine du template source ;
- remplacer par des éléments du domaine cible ;
- refuser toute ambiance visuelle qui évoque un autre domaine.

Exemple : si la cible est `formation`, interdire les assiettes, plats, couverts, ambiance menu/restaurant, et imposer des signes visuels liés à la formation : ordinateur, tableau, cahier, apprenants, certificat uniquement si demandé.

### 5. Ajouter des logs de diagnostic

Ajouter des logs clairs dans la fonction de génération :

```text
detectedDomain
selectedTemplateDomain
isAutoSelectedTemplate
fallbackFamilyUsed
```

Cela permettra de vérifier rapidement, dans les prochains signalements, si le bon domaine a été détecté et quel template a été choisi.

## Fichier concerné

- `supabase/functions/generate-image/index.ts`

Aucune migration de base de données, aucun changement UI, aucune nouvelle fonction backend.