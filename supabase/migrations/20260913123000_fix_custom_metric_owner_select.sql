drop policy if exists "permitted people can view custom metrics" on public.custom_metrics;

create policy "permitted people can view custom metrics"
  on public.custom_metrics for select
  using (
    (select private.owns_profile(profile_id))
    or (select private.can_view_custom_metric(id))
  );
