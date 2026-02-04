
# Plan : Ajout de la Saisie Vocale avec Bytez (Whisper)

## Objectif

Ajouter un bouton microphone à côté du champ de saisie permettant aux utilisateurs de **parler au lieu de taper**. L'audio sera envoyé à l'API Bytez qui utilise Whisper pour transcrire.

## Flux Utilisateur

```text
[Clic sur 🎤] → [Permission micro] → [Enregistrement] → [Clic pour arrêter] → [Envoi à Bytez] → [Texte transcrit dans le champ]
```

## Architecture Technique

```text
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Navigateur)                                          │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ VoiceInputButton │───▶│ Enregistre audio via MediaRecorder│  │
│  │     (🎤)         │    │ Convertit en base64               │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│            │                                                    │
│            ▼                                                    │
│  ┌──────────────────┐                                          │
│  │ Appel Edge Func  │                                          │
│  │ transcribe-audio │                                          │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION (transcribe-audio)                               │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Reçoit base64    │───▶│ Appelle API Bytez               │  │
│  │ audio            │    │ POST https://api.bytez.com/...  │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                    │                            │
│                                    ▼                            │
│                          ┌──────────────────────────────────┐  │
│                          │ Retourne transcription text      │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  API BYTEZ                                                      │
│                                                                  │
│  Endpoint: https://api.bytez.com/models/v2/openai/whisper-large-v3│
│  Headers: Authorization: 3cc20df1aa1aa401ea5ea270e3b1bdba      │
│  Body: { "base64": "data:audio/webm;base64,..." }              │
│                                                                  │
│  Response: { "output": "Texte transcrit ici..." }              │
└─────────────────────────────────────────────────────────────────┘
```

## Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/transcribe-audio/index.ts` | **Créer** | Edge Function qui appelle l'API Bytez |
| `src/components/chat/VoiceInputButton.tsx` | **Créer** | Composant bouton microphone |
| `src/pages/AppPage.tsx` | **Modifier** | Intégrer le bouton dans la zone de saisie |
| Secrets | **Ajouter** | `BYTEZ_API_KEY` |

---

## Détails Techniques

### 1. Edge Function : `transcribe-audio/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64 } = await req.json();
    const BYTEZ_API_KEY = Deno.env.get("BYTEZ_API_KEY");
    
    if (!BYTEZ_API_KEY) {
      throw new Error("BYTEZ_API_KEY not configured");
    }

    console.log("Sending audio to Bytez Whisper API...");

    const response = await fetch(
      "https://api.bytez.com/models/v2/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          "Authorization": BYTEZ_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64: audioBase64,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Bytez API error:", response.status, errorText);
      throw new Error(`Bytez API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Transcription result:", data.output);

    return new Response(
      JSON.stringify({ text: data.output }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2. Composant : `VoiceInputButton.tsx`

```typescript
// États du bouton
type RecordingState = "idle" | "recording" | "processing";

// Fonctionnalités
- Demande permission microphone au premier clic
- Enregistre l'audio via MediaRecorder API (format webm)
- Affiche états visuels (🎤 gris → 🎤 rouge pulsant → ⏳ chargement)
- Convertit l'audio en base64
- Appelle l'Edge Function
- Transmet le texte transcrit au parent via onTranscript callback
```

### 3. Modification AppPage.tsx (lignes ~697-713)

```tsx
// Avant
<div className="flex gap-3">
  <Input ... />
  <Button onClick={handleSend} ...>
    <Send className="w-4 h-4" />
  </Button>
</div>

// Après
<div className="flex gap-3">
  <Input ... />
  <VoiceInputButton
    onTranscript={(text) => setInputValue(prev => 
      prev ? `${prev} ${text}` : text
    )}
    disabled={isProcessing}
  />
  <Button onClick={handleSend} ...>
    <Send className="w-4 h-4" />
  </Button>
</div>
```

---

## Comportement UX

| État | Icône | Couleur | Action |
|------|-------|---------|--------|
| Inactif | 🎤 Mic | Gris | Clic démarre l'enregistrement |
| Enregistrement | 🎤 Mic | Rouge pulsant | Clic arrête et envoie |
| Traitement | ⏳ Loader | Orange | Attente transcription |
| Succès | 🎤 Mic | Vert flash | Texte ajouté au champ |
| Erreur | 🎤 Mic | Rouge | Toast d'erreur affiché |

---

## Gestion des Erreurs

| Erreur | Message utilisateur |
|--------|---------------------|
| Permission micro refusée | "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur" |
| Échec API Bytez | "Erreur de transcription. Veuillez réessayer." |
| Audio trop court | "L'enregistrement est trop court. Parlez plus longtemps." |
| Navigateur non supporté | "Votre navigateur ne supporte pas l'enregistrement audio" |

---

## Configuration Secret

Le secret `BYTEZ_API_KEY` sera ajouté avec la valeur :
```
3cc20df1aa1aa401ea5ea270e3b1bdba
```

---

## Avantages de cette approche

| Aspect | Détail |
|--------|--------|
| Simplicité | Pas de bibliothèque externe côté client |
| Sécurité | Clé API stockée côté serveur uniquement |
| Compatibilité | MediaRecorder supporté par tous les navigateurs modernes |
| Qualité | Whisper Large V3 = excellente précision française |
| Coût | Via votre compte Bytez existant |
