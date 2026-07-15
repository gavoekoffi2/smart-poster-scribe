import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyCreditsTool from "./tools/get-my-credits";
import listMyPostersTool from "./tools/list-my-posters";
import getPosterTool from "./tools/get-poster";
import searchTemplatesTool from "./tools/search-templates";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "graphistegpt-mcp",
  title: "GraphisteGPT",
  version: "0.1.0",
  instructions:
    "Outils GraphisteGPT pour l'utilisateur connecté : consulter son solde de crédits, lister ses affiches générées, obtenir les détails d'une affiche, et rechercher dans le catalogue public de modèles.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyCreditsTool, listMyPostersTool, getPosterTool, searchTemplatesTool],
});
