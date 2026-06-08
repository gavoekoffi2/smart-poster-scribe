
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_api_key(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.match_reference_template(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_reference_template(text, text) TO service_role;
