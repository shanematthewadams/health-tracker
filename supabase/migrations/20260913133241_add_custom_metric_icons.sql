alter table public.custom_metrics
  add column if not exists icon_key text not null default 'sparkles'
  check (icon_key in (
    'sparkles','heart','brain','book_open','leaf','moon','sun','smile','flame','coffee','dumbbell','footprints','droplet','timer','star'
  ));
