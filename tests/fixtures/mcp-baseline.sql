create role anon; create role authenticated; create role service_role bypassrls; create role authenticator; create role supabase_auth_admin;
create schema auth; create schema private;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
create table auth.users(id uuid primary key);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
create table public.profiles(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),name text not null,goal_weight numeric,goal_date date,goal_statement text,bmr numeric,calories numeric,protein numeric,carbs numeric,fat numeric,fiber_min numeric,fiber_max numeric,steps_target integer,water_target numeric);
create table public.weight_entries(id uuid primary key default gen_random_uuid(),profile_id uuid not null references profiles(id),household_id uuid,entry_date date not null,weight numeric not null,created_at timestamptz default now(),unique(profile_id,entry_date));
create table public.food_entries(id uuid primary key default gen_random_uuid(),profile_id uuid not null references profiles(id),household_id uuid,entry_date date not null,name text not null,calories numeric default 0,protein numeric default 0,carbs numeric default 0,fat numeric default 0,fiber numeric default 0,meal text,notes text,created_at timestamptz default now());
create table public.activity_entries(id uuid primary key default gen_random_uuid(),profile_id uuid not null references profiles(id),household_id uuid,entry_date date not null,name text not null,calories_burned numeric default 0,created_at timestamptz default now());
create table public.profile_metric_preferences(profile_id uuid references profiles(id),metric_type text,enabled boolean default true,visibility text default 'all_withs',logging_reminder_enabled boolean default false,primary key(profile_id,metric_type));
create function private.owns_profile(pid uuid) returns boolean language sql security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=pid and user_id=auth.uid()); $$;
revoke all on function private.owns_profile(uuid) from public; grant usage on schema private,auth to authenticated; grant execute on function private.owns_profile(uuid) to authenticated;
-- Deliberately broad shared-With reads for the browser; AI must not inherit them.
do $$declare t text;begin foreach t in array array['profiles','weight_entries','food_entries','activity_entries','profile_metric_preferences'] loop
 execute format('alter table %I enable row level security',t);
 execute format('grant select,insert,update,delete on %I to authenticated',t);
 execute format('create policy existing_shared_read on %I for select to authenticated using(true)',t);
 execute format('create policy existing_own_write on %I for all to authenticated using(private.owns_profile(%I)) with check(private.owns_profile(%I))',t,case t when 'profiles' then 'id' else 'profile_id' end,case t when 'profiles' then 'id' else 'profile_id' end);
end loop;end$$;
create function public.legacy_admin_rpc() returns text language sql security definer as $$select 'admin'$$;
