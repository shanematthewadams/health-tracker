create index profile_quick_add_items_custom_metric_profile_idx
  on public.profile_quick_add_items(custom_metric_id, profile_id)
  where custom_metric_id is not null;
