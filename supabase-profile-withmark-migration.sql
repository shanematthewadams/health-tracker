-- WITH: personal Withmark
-- Non-destructive. Existing profiles are unchanged.

alter table public.profiles
  add column if not exists profile_withmark text;

alter table public.profiles
  drop constraint if exists profiles_profile_withmark_length;

alter table public.profiles
  add constraint profiles_profile_withmark_length
  check (
    profile_withmark is null
    or char_length(profile_withmark) <= 32
  );
