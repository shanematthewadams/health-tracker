-- Administrative rollout metadata only; no health measurements are touched.
create table private.mcp_rollout_settings (
 singleton boolean primary key default true check(singleton),
 security_ready boolean not null default false,
 resource text not null check(resource='https://staging--shane-and-alli-health-tracker.netlify.app/mcp')
);
alter table private.mcp_rollout_settings enable row level security;
revoke all on private.mcp_rollout_settings from public,anon,authenticated,with_mcp;
grant all on private.mcp_rollout_settings to service_role;
insert into private.mcp_rollout_settings(singleton,security_ready,resource) values(true,false,'https://staging--shane-and-alli-health-tracker.netlify.app/mcp');
create function public.mcp_rollout_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('security_ready',security_ready,'resource',resource) from private.mcp_rollout_settings where singleton;
$$;
revoke all on function public.mcp_rollout_status() from public;
grant execute on function public.mcp_rollout_status() to anon,authenticated,service_role;
