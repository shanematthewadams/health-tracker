-- Inbound source preservation; device sync is deliberately not enabled here.
create table public.external_health_observations (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 source text not null check(source in ('apple_health','garmin_export')),
 source_id text not null check(length(source_id) between 1 and 200),
 kind text not null check(kind in ('workout','steps','distance','heart_rate','resting_heart_rate','hrv','sleep','active_energy','weight')),
 started_at timestamptz not null, ended_at timestamptz not null, time_zone text not null,
 observed_value numeric check(observed_value>=0 and observed_value<>'NaN'::numeric), original_unit text not null,
 provenance jsonb not null default '{}', reconciliation_status text not null default 'unreviewed' check(reconciliation_status in ('unreviewed','canonical','duplicate','conflict')),
 canonical_observation_id uuid,
 imported_at timestamptz not null default now(),
 unique(profile_id,source,source_id), unique(profile_id,id),
 foreign key(profile_id,canonical_observation_id) references public.external_health_observations(profile_id,id), check(ended_at>=started_at), check(canonical_observation_id is distinct from id)
);
create index external_observations_person_time on public.external_health_observations(profile_id,started_at);
create index external_observations_canonical on public.external_health_observations(canonical_observation_id);
alter table public.external_health_observations enable row level security;
revoke all on public.external_health_observations from anon,with_mcp;
grant select,insert,update,delete on public.external_health_observations to authenticated;
create policy own_external_observations on public.external_health_observations for all to authenticated using((select private.owns_profile(profile_id))) with check((select private.owns_profile(profile_id)));
-- No MCP grants: imported provider data is not automatically authorized for AI.
