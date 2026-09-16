alter table public.fasting_entries
  add column if not exists goal_minutes integer,
  add column if not exists duration_minutes integer,
  add column if not exists goal_reached boolean;

alter table public.fasting_entries
  drop constraint if exists fasting_goal_minutes_positive,
  add constraint fasting_goal_minutes_positive
    check (goal_minutes is null or goal_minutes > 0),
  drop constraint if exists fasting_duration_minutes_nonnegative,
  add constraint fasting_duration_minutes_nonnegative
    check (duration_minutes is null or duration_minutes >= 0);

create or replace function private.sync_fasting_summary_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ended_at is null then
    new.duration_minutes := null;
    new.goal_reached := null;
  else
    new.duration_minutes := greatest(0, floor(extract(epoch from (new.ended_at - new.started_at)) / 60)::integer);
    new.goal_reached := case
      when new.goal_minutes is null then null
      else new.duration_minutes >= new.goal_minutes
    end;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_fasting_summary_fields() from public;
revoke all on function private.sync_fasting_summary_fields() from anon;
revoke all on function private.sync_fasting_summary_fields() from authenticated;
grant execute on function private.sync_fasting_summary_fields() to service_role;

drop trigger if exists fasting_entries_sync_summary on public.fasting_entries;
create trigger fasting_entries_sync_summary
before insert or update of started_at, ended_at, goal_minutes
on public.fasting_entries
for each row execute function private.sync_fasting_summary_fields();

update public.fasting_entries
set started_at = started_at;
