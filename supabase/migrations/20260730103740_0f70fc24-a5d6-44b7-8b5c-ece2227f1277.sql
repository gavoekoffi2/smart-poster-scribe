
INSERT INTO public.platform_settings (key, value)
VALUES ('mcp_access', '{"enabled": true, "mode": "all", "disabled_tools": [], "agents": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mcp_check_access(_user_id uuid, _tool text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg jsonb;
  agent jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Non authentifié.');
  END IF;

  SELECT value INTO cfg FROM public.platform_settings WHERE key = 'mcp_access';
  IF cfg IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', null);
  END IF;

  IF COALESCE((cfg->>'enabled')::boolean, true) = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Les intégrations agents (MCP) sont désactivées par l''administrateur.');
  END IF;

  IF cfg->'disabled_tools' ? _tool THEN
    RETURN jsonb_build_object('allowed', false, 'reason', format('Outil « %s » désactivé par l''administrateur.', _tool));
  END IF;

  SELECT a INTO agent
  FROM jsonb_array_elements(COALESCE(cfg->'agents', '[]'::jsonb)) a
  WHERE (a->>'user_id')::uuid = _user_id
  LIMIT 1;

  IF agent IS NULL THEN
    IF COALESCE(cfg->>'mode', 'all') = 'allowlist' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Ce compte n''est pas autorisé à utiliser le serveur MCP. Contactez l''administrateur.');
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', null);
  END IF;

  IF COALESCE((agent->>'enabled')::boolean, true) = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', format('L''agent « %s » est désautorisé.', COALESCE(agent->>'label', 'inconnu')));
  END IF;

  IF agent->'disabled_tools' ? _tool THEN
    RETURN jsonb_build_object('allowed', false, 'reason', format('Outil « %s » non autorisé pour cet agent.', _tool));
  END IF;

  IF _tool LIKE 'admin\_%' AND COALESCE((agent->>'allow_admin_tools')::boolean, false) = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Les outils d''administration ne sont pas autorisés pour cet agent.');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_check_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mcp_check_access(uuid, text) TO authenticated, service_role;
