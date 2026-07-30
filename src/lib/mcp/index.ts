import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyCreditsTool from "./tools/get-my-credits";
import listMyPostersTool from "./tools/list-my-posters";
import getPosterTool from "./tools/get-poster";
import searchTemplatesTool from "./tools/search-templates";
import getMyAccountTool from "./tools/get-my-account";
import generatePosterTool from "./tools/generate-poster";
import getJobStatusTool from "./tools/get-job-status";
import modifyPosterTool from "./tools/modify-poster";
import ratePosterTool from "./tools/rate-poster";
import adminListGenerationRequestsTool from "./tools/admin-list-generation-requests";
import adminGenerationStatsTool from "./tools/admin-generation-stats";
import adminListUsersTool from "./tools/admin-list-users";
import adminModerateShowcaseTool from "./tools/admin-moderate-showcase";
import adminSetSubscriptionTool from "./tools/admin-set-subscription";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "graphistegpt-mcp",
  title: "GraphisteGPT",
  version: "0.2.0",
  instructions:
    "Outils GraphisteGPT pour l'utilisateur connecté. Compte : get_my_account, get_my_credits. Création : generate_poster puis get_job_status en boucle jusqu'à completed ; modify_poster pour itérer gratuitement sur une affiche existante ; rate_poster pour noter le résultat. Catalogue : search_templates, list_my_posters, get_poster. Outils admin_* réservés aux administrateurs : journal des générations, statistiques d'échec, utilisateurs, modération de la vitrine et attribution d'abonnements.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyCreditsTool,
    getMyAccountTool,
    listMyPostersTool,
    getPosterTool,
    searchTemplatesTool,
    generatePosterTool,
    getJobStatusTool,
    modifyPosterTool,
    ratePosterTool,
    adminListGenerationRequestsTool,
    adminGenerationStatsTool,
    adminListUsersTool,
    adminModerateShowcaseTool,
    adminSetSubscriptionTool,
  ].map(withMcpGuard),
});

