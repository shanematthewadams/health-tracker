revoke all on function public.can_view_profile_metric(uuid, text) from public;
revoke all on function public.can_view_profile_metric(uuid, text) from anon;
revoke all on function public.can_view_profile_metric(uuid, text) from authenticated;
grant execute on function public.can_view_profile_metric(uuid, text) to service_role;
