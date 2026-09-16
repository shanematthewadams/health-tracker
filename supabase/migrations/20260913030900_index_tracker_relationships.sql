create index custom_metric_entries_metric_profile_idx
  on public.custom_metric_entries(metric_id, profile_id);
create index custom_metric_withs_household_idx
  on public.custom_metric_withs(household_id);
create index profile_metric_withs_household_idx
  on public.profile_metric_withs(household_id);
