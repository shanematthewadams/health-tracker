alter table public.profile_quick_add_items
  drop constraint if exists profile_quick_add_items_standard_type_check;

alter table public.profile_quick_add_items
  add constraint profile_quick_add_items_standard_type_check
  check (
    standard_metric_type is null
    or standard_metric_type = any (array['food'::text, 'weight'::text, 'activity'::text, 'water'::text, 'steps'::text, 'fasting'::text])
  );
