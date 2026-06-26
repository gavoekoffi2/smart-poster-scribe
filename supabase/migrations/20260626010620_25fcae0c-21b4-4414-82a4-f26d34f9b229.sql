GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(uuid) TO anon, authenticated;