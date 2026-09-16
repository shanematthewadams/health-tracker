create or replace function public.with_sync_updated_saved_food_to_global()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  update public.global_foods gf
  set
    name = new.name,
    calories = new.calories,
    protein = new.protein,
    carbs = new.carbs,
    fat = new.fat,
    fiber = new.fiber,
    serving_label = coalesce(nullif(trim(new.serving_label), ''), '1 serving'),
    serving_description = coalesce(nullif(trim(new.serving_label), ''), '1 serving'),
    default_meal = new.default_meal,
    updated_at = now()
  from public.saved_food_global_map m
  where m.saved_food_id = new.id
    and gf.id = m.global_food_id
    and gf.source_type = 'user';

  return new;
end;
$function$;

drop trigger if exists with_sync_updated_saved_food_to_global on public.saved_foods;

create trigger with_sync_updated_saved_food_to_global
after update of name, calories, protein, carbs, fat, fiber, serving_label, default_meal
on public.saved_foods
for each row
execute function public.with_sync_updated_saved_food_to_global();

revoke all on function public.with_sync_updated_saved_food_to_global() from public;
revoke execute on function public.with_sync_updated_saved_food_to_global() from anon, authenticated;
