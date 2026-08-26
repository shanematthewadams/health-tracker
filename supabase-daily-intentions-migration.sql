-- WITH: daily intentions
-- Visible to everyone in the household through the existing profile read policy.
-- Editable only by the profile owner through the existing profile update policy.

alter table public.profiles
  add column if not exists current_intention text,
  add column if not exists intention_date date;

alter table public.profiles
  drop constraint if exists profiles_current_intention_length;

alter table public.profiles
  add constraint profiles_current_intention_length
  check (current_intention is null or char_length(current_intention) <= 280);
