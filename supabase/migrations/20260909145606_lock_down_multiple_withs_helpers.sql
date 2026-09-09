-- Relationship helpers are intended for RLS/internal composition, not as public RPC endpoints.

revoke execute on function public.shares_with_profile(uuid) from public, anon, authenticated;
revoke execute on function public.can_view_profile(uuid) from public, anon, authenticated;
revoke execute on function public.can_view_profile_metric(uuid, text) from public, anon, authenticated;
