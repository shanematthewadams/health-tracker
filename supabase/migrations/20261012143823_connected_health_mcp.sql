-- V3 foundation. NOT applied automatically: staging and production share a DB.
-- Apply only after isolated SQL tests and a review of the PUBLIC function grants.
create role with_mcp nologin noinherit;
grant with_mcp to authenticator;
grant usage on schema public, private, auth to with_mcp;
grant execute on function auth.uid(), auth.jwt() to with_mcp;

create table public.connected_ai_apps (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (length(client_id) between 1 and 200),
  client_name text not null check (length(client_name) between 1 and 160),
  resource text not null check (resource ~ '^https://[^?#]+/mcp$'),
  permissions text[] not null default array['health:read'] check (permissions <@ array['health:read','health:write']::text[] and 'health:read'=any(permissions)),
  categories text[] not null check (categories <@ array['profile','weight','nutrition','activity','strength','wellness','preferences']::text[] and cardinality(categories)>0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '90 days',
  revoked_at timestamptz,
  primary key(user_id,client_id)
);
alter table public.connected_ai_apps enable row level security;
grant select, insert, update on public.connected_ai_apps to authenticated;
grant select on public.connected_ai_apps to with_mcp;
create policy own_ai_connections on public.connected_ai_apps for all to authenticated using(user_id=(select auth.uid()) and (select auth.jwt()->>'client_id') is null) with check(user_id=(select auth.uid()) and (select auth.jwt()->>'client_id') is null);
create policy ai_can_read_own_grant on public.connected_ai_apps for select to with_mcp using(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id'));

-- This helper exposes only a boolean. It reads private authorization state,
-- never returns health data, and checks live consent + active Auth session.
create function private.mcp_allowed(pid uuid, permission text, category text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.connected_ai_apps c on c.user_id=p.user_id
  where p.id=pid and p.user_id=auth.uid() and c.client_id=auth.jwt()->>'client_id'
   and c.resource=auth.jwt()->>'aud' and c.revoked_at is null and c.expires_at>now()
   and permission=any(c.permissions) and category=any(c.categories)
   and exists(select 1 from auth.sessions s where s.user_id=p.user_id and s.id::text=auth.jwt()->>'session_id'));
$$;
revoke all on function private.mcp_allowed(uuid,text,text) from public,anon,authenticated;
grant execute on function private.mcp_allowed(uuid,text,text) to with_mcp;
-- Existing preference policies call this already-hardened ownership helper.
grant execute on function private.owns_profile(uuid) to with_mcp;

create table public.workout_sessions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 activity_entry_id uuid unique references public.activity_entries(id) on delete set null,
 entry_date date not null, name text not null check(length(name) between 1 and 160),
 activity_type text not null check(activity_type in ('strength','run','walk','cycling','pilates','f3','conditioning','other')),
 time_zone text not null, started_at timestamptz,
 duration_seconds numeric check(duration_seconds between 0 and 604800),
 distance numeric check(distance between 0 and 1000000), distance_unit text check(distance_unit in ('mi','km','m')),
 average_heart_rate numeric check(average_heart_rate between 0 and 300), max_heart_rate numeric check(max_heart_rate between 0 and 300),
 session_rpe numeric check(session_rpe between 0 and 10), training_load numeric check(training_load between 0 and 100000),
 calories_burned numeric check(calories_burned between 0 and 20000),
 sets jsonb not null default '[]' check(jsonb_typeof(sets)='array' and jsonb_array_length(sets)<=200),
 notes text check(length(notes)<=1000), source text not null default 'with_mcp', source_id text,
 provenance jsonb not null default '{}', created_at timestamptz not null default now(),
 check(distance is null or distance_unit is not null), unique(profile_id,source,source_id)
);
create index workout_person_date on public.workout_sessions(profile_id,entry_date);
create table public.wellness_entries (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 entry_date date not null, time_zone text not null,
 sleep_minutes numeric check(sleep_minutes between 0 and 1440), resting_heart_rate numeric check(resting_heart_rate between 0 and 300),
 hrv_ms numeric check(hrv_ms between 0 and 1000), energy numeric check(energy between 0 and 10),
 fatigue numeric check(fatigue between 0 and 10), soreness numeric check(soreness between 0 and 10), notes text check(length(notes)<=1000),
 source text not null default 'with_mcp', source_id text, provenance jsonb not null default '{}', created_at timestamptz not null default now(),
 unique(profile_id,source,source_id)
);
create index wellness_person_date on public.wellness_entries(profile_id,entry_date);
create table public.mcp_write_receipts (
 user_id uuid not null references auth.users(id) on delete cascade, client_id text not null, submission_id uuid not null,
 operation text not null, payload_fingerprint text not null, result jsonb not null,
 recorded_at timestamptz not null default now(), primary key(user_id,client_id,submission_id)
);
alter table public.mcp_write_receipts enable row level security;
grant select,insert on public.mcp_write_receipts to with_mcp;
grant select on public.mcp_write_receipts to authenticated;
create policy own_receipts_read on public.mcp_write_receipts for select to authenticated,with_mcp using(user_id=(select auth.uid()) and (current_user<>'with_mcp' or client_id=(select auth.jwt()->>'client_id')));
create policy own_receipts_insert on public.mcp_write_receipts for insert to with_mcp with check(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id') and current_setting('with.mcp_write',true)='yes');

-- Separate role: no With membership, administrative RPC or unrelated table access.
-- Remove implicit PUBLIC execute only on existing security-definer routines;
-- preserve the effective access of the existing browser/backend roles.
do $$ declare f record; r text; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef and exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') loop
  foreach r in array array['anon','authenticated','service_role'] loop
   execute format('grant execute on function %s to %I',f.signature,r);
  end loop;
  execute format('revoke execute on function %s from public',f.signature);
 end loop;
end $$;

-- Old policies stay intact. New policies apply only to the dedicated AI role.
do $$ declare t text; cat text; begin
 for t,cat in select * from (values ('profiles','profile'),('weight_entries','weight'),('food_entries','nutrition'),('activity_entries','activity'),('profile_metric_preferences','preferences'),('workout_sessions','strength'),('wellness_entries','wellness')) as mapping(t,c) loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update on public.%I to with_mcp',t);
  execute format('create policy mcp_read on public.%I for select to with_mcp using(private.mcp_allowed(%I, %L, %L))',t,case when t='profiles' then 'id' else 'profile_id' end,'health:read',cat);
  execute format('create policy mcp_write_insert on public.%I for insert to with_mcp with check(current_setting(%L,true)=%L and private.mcp_allowed(%I,%L,%L))',t,'with.mcp_write','yes',case when t='profiles' then 'id' else 'profile_id' end,'health:write',cat);
  execute format('create policy mcp_write_update on public.%I for update to with_mcp using(current_setting(%L,true)=%L and private.mcp_allowed(%I,%L,%L)) with check(current_setting(%L,true)=%L and private.mcp_allowed(%I,%L,%L))',t,'with.mcp_write','yes',case when t='profiles' then 'id' else 'profile_id' end,'health:write',cat,'with.mcp_write','yes',case when t='profiles' then 'id' else 'profile_id' end,'health:write',cat);
  -- Restrictive gates also constrain older policies whose role was PUBLIC.
  execute format('create policy mcp_boundary on public.%I as restrictive for all to with_mcp using(private.mcp_allowed(%I,%L,%L)) with check(current_setting(%L,true)=%L and private.mcp_allowed(%I,%L,%L))',t,case when t='profiles' then 'id' else 'profile_id' end,'health:read',cat,'with.mcp_write','yes',case when t='profiles' then 'id' else 'profile_id' end,'health:write',cat);
 end loop;
end $$;
grant select,insert,update,delete on public.workout_sessions,public.wellness_entries to authenticated;
create policy own_workouts on public.workout_sessions for all to authenticated using((select private.owns_profile(profile_id))) with check((select private.owns_profile(profile_id)));
create policy own_wellness on public.wellness_entries for all to authenticated using((select private.owns_profile(profile_id))) with check((select private.owns_profile(profile_id)));

-- Supabase Custom Access Token Hook. Enable only together with OAuth Server.
-- Normal With login tokens are unchanged. OAuth clients get the restricted role.
create function public.with_mcp_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare claims jsonb:=event->'claims'; cid text:=coalesce(event->>'client_id',event->'claims'->>'client_id'); target text;
begin
 if cid is null then return event; end if;
 select resource into target from public.connected_ai_apps where user_id=(event->>'user_id')::uuid and client_id=cid and revoked_at is null and expires_at>now();
 if target is null then raise exception 'AI app authorization is missing or revoked'; end if;
 claims:=jsonb_set(jsonb_set(jsonb_set(claims,'{role}','"with_mcp"'),'{aud}',to_jsonb(target)),'{client_id}',to_jsonb(cid));
 return jsonb_set(event,'{claims}',claims);
end $$;
revoke all on function public.with_mcp_access_token_hook(jsonb) from public,anon,authenticated,with_mcp;
grant execute on function public.with_mcp_access_token_hook(jsonb) to supabase_auth_admin;

create function private.mcp_profile() returns uuid language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then min(p.id::text)::uuid else null end from public.profiles p where p.user_id=auth.uid() and exists(select 1 from public.connected_ai_apps c where c.user_id=p.user_id and c.client_id=auth.jwt()->>'client_id' and c.resource=auth.jwt()->>'aud' and c.revoked_at is null and c.expires_at>now() and exists(select 1 from auth.sessions s where s.user_id=p.user_id and s.id::text=auth.jwt()->>'session_id'));
$$;
revoke all on function private.mcp_profile() from public,anon,authenticated;
grant execute on function private.mcp_profile() to with_mcp;
create function public.mcp_identity() returns uuid language sql stable security invoker set search_path='' as $$ select private.mcp_profile(); $$;
revoke all on function public.mcp_identity() from public,anon,authenticated;
grant execute on function public.mcp_identity() to with_mcp;

create table public.health_record_provenance (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 record_type text not null, record_id uuid not null, source text not null,
 time_zone text, original_units jsonb not null default '{}', created_at timestamptz not null default now(),
 primary key(profile_id,record_type,record_id)
);
alter table public.health_record_provenance enable row level security;
grant select on public.health_record_provenance to authenticated,with_mcp;
grant insert on public.health_record_provenance to with_mcp;
create policy own_origins on public.health_record_provenance for select to authenticated using((select private.owns_profile(profile_id)));
create policy mcp_origins_read on public.health_record_provenance for select to with_mcp using(private.mcp_allowed(profile_id,'health:read',case record_type when 'food' then 'nutrition' when 'workout' then 'strength' else record_type end));
create policy mcp_origins_insert on public.health_record_provenance for insert to with_mcp with check(current_setting('with.mcp_write',true)='yes' and private.mcp_allowed(profile_id,'health:write',case record_type when 'food' then 'nutrition' when 'workout' then 'strength' else record_type end));

create table public.connected_ai_change_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 client_id text not null, submission_id uuid not null, operation text not null check(operation in ('goals','correction')),
 payload jsonb not null, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '10 minutes',
 approved_at timestamptz, rejected_at timestamptz, consumed_at timestamptz,
 unique(user_id,client_id,submission_id)
);
alter table public.connected_ai_change_reviews enable row level security;
grant select on public.connected_ai_change_reviews to with_mcp;
grant insert(user_id,client_id,submission_id,operation,payload) on public.connected_ai_change_reviews to with_mcp;
grant update(consumed_at) on public.connected_ai_change_reviews to with_mcp;
grant select on public.connected_ai_change_reviews to authenticated;
grant update(approved_at,rejected_at) on public.connected_ai_change_reviews to authenticated;
create policy human_review on public.connected_ai_change_reviews for all to authenticated using(user_id=(select auth.uid()) and (select auth.jwt()->>'client_id') is null) with check(user_id=(select auth.uid()) and (select auth.jwt()->>'client_id') is null);
create policy mcp_review_read on public.connected_ai_change_reviews for select to with_mcp using(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id'));
create policy mcp_review_insert on public.connected_ai_change_reviews for insert to with_mcp with check(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id') and current_setting('with.mcp_write',true)='yes');
create policy mcp_review_consume on public.connected_ai_change_reviews for update to with_mcp using(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id') and current_setting('with.mcp_write',true)='yes') with check(user_id=(select auth.uid()) and client_id=(select auth.jwt()->>'client_id') and current_setting('with.mcp_write',true)='yes');
create function public.mcp_prepare_change(p_operation text,p_submission_id uuid,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare pid uuid:=private.mcp_profile(); cid text:=auth.jwt()->>'client_id'; review public.connected_ai_change_reviews; category text;
begin
 category:=case p_operation when 'goals' then 'profile' when 'correction' then case p_payload->>'record_type' when 'food' then 'nutrition' else p_payload->>'record_type' end end;
 if current_user<>'with_mcp' or pid is null or category is null or not private.mcp_allowed(pid,'health:write',category) or p_submission_id is null then raise exception 'Not authorized'; end if;
 if jsonb_typeof(p_payload->'changes') is distinct from 'object' or jsonb_typeof(p_payload->'expected_values') is distinct from 'object' then raise exception 'Changes and expected values required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||cid||p_submission_id::text,0));
 select * into review from public.connected_ai_change_reviews where user_id=auth.uid() and client_id=cid and submission_id=p_submission_id;
 if found then
  if review.operation<>p_operation or review.payload<>p_payload then raise exception 'Submission ID already used'; end if;
 else
  perform set_config('with.mcp_write','yes',true);
  insert into public.connected_ai_change_reviews(user_id,client_id,submission_id,operation,payload) values(auth.uid(),cid,p_submission_id,p_operation,p_payload) returning * into review;
  perform set_config('with.mcp_write','',true);
 end if;
 return jsonb_build_object('approval_id',review.id,'expires_at',review.expires_at,'approved',review.approved_at is not null and review.rejected_at is null);
end $$;
revoke all on function public.mcp_prepare_change(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mcp_prepare_change(text,uuid,jsonb) to with_mcp;

create function public.mcp_apply_write(p_operation text,p_submission_id uuid,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare pid uuid:=private.mcp_profile(); cid text:=auth.jwt()->>'client_id'; category text; allowed text[]; key text;
 review public.connected_ai_change_reviews; receipt public.mcp_write_receipts; fingerprint text:=encode(sha256(convert_to(p_operation||p_payload::text,'UTF8')),'hex'); rid uuid; aid uuid;
 v_payload jsonb:=p_payload; rec jsonb; item jsonb; output jsonb; tbl text; val numeric;
begin
 if current_user<>'with_mcp' or pid is null or p_submission_id is null or jsonb_typeof(v_payload)<>'object' then raise exception 'Unauthorized or invalid request'; end if;
 category:=case p_operation when 'weight' then 'weight' when 'food' then 'nutrition' when 'workout' then 'strength' when 'wellness' then 'wellness' when 'goals' then 'profile' when 'preference' then 'preferences' when 'correction' then case v_payload->>'record_type' when 'food' then 'nutrition' else v_payload->>'record_type' end end;
 if category is null or not private.mcp_allowed(pid,'health:write',category) then raise exception 'Not authorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||cid||p_submission_id::text,0));
 select * into receipt from public.mcp_write_receipts where user_id=auth.uid() and client_id=cid and submission_id=p_submission_id;
 if found then
  if receipt.payload_fingerprint<>fingerprint then raise exception 'Submission ID already used for different input'; end if;
  return receipt.result||jsonb_build_object('duplicate',true);
 end if;
 allowed:=case p_operation
 when 'weight' then array['entry_date','time_zone','weight','unit']
 when 'food' then array['entry_date','time_zone','name','calories','protein','carbs','fat','fiber','meal','notes']
 when 'workout' then array['entry_date','time_zone','name','activity_type','started_at','duration_seconds','distance','distance_unit','average_heart_rate','max_heart_rate','session_rpe','training_load','calories_burned','sets','notes']
 when 'wellness' then array['entry_date','time_zone','sleep_minutes','resting_heart_rate','hrv_ms','energy','fatigue','soreness','notes']
 when 'goals' then array['approval_id','confirmed','expected_values','changes']
 when 'correction' then array['approval_id','confirmed','record_type','record_id','expected_values','changes']
 when 'preference' then array['metric_type','enabled'] end;
 if exists(select 1 from jsonb_object_keys(v_payload) k where not k=any(allowed)) then raise exception 'Unexpected field'; end if;
 if p_operation in ('weight','food','workout','wellness') then
  if v_payload->>'entry_date' is null or v_payload->>'entry_date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if;
  perform (v_payload->>'entry_date')::date;
  if not exists(select 1 from pg_timezone_names where name=v_payload->>'time_zone') then raise exception 'Invalid time zone'; end if;
 end if;
 foreach key in array array['weight','calories','protein','carbs','fat','fiber','duration_seconds','distance','average_heart_rate','max_heart_rate','session_rpe','training_load','calories_burned','sleep_minutes','resting_heart_rate','hrv_ms','energy','fatigue','soreness'] loop
  if v_payload ? key and v_payload->key<>'null'::jsonb then
   if jsonb_typeof(v_payload->key)<>'number' then raise exception 'Invalid numeric type'; end if;
   val:=(v_payload->>key)::numeric;
   if val<0 or val>(case key when 'weight' then 2000 when 'protein' then 2000 when 'carbs' then 5000 when 'fat' then 2000 when 'fiber' then 1000 else 1000000 end) then raise exception 'Invalid measurement'; end if;
  end if;
 end loop;
 perform set_config('with.mcp_write','yes',true);
 if p_operation='weight' then
  if v_payload->>'unit' not in ('lb','kg') or v_payload->>'unit' is null or (v_payload->>'weight')::numeric<=0 or v_payload->>'weight' is null then raise exception 'Weight and unit required'; end if;
  insert into public.weight_entries(profile_id,entry_date,weight) values(pid,(v_payload->>'entry_date')::date,(v_payload->>'weight')::numeric*case v_payload->>'unit' when 'kg' then 2.2046226218487757 else 1 end) returning id into rid;
 elsif p_operation='food' then
  if v_payload->>'name' is null or length(trim(v_payload->>'name')) not between 1 and 160 or length(v_payload->>'notes')>1000 or (v_payload ? 'meal' and v_payload->>'meal' not in ('Breakfast','Lunch','Dinner','Snack')) then raise exception 'Invalid food'; end if;
  insert into public.food_entries(profile_id,entry_date,name,calories,protein,carbs,fat,fiber,meal,notes) values(pid,(v_payload->>'entry_date')::date,trim(v_payload->>'name'),(v_payload->>'calories')::numeric,(v_payload->>'protein')::numeric,(v_payload->>'carbs')::numeric,(v_payload->>'fat')::numeric,(v_payload->>'fiber')::numeric,v_payload->>'meal',v_payload->>'notes') returning id into rid;
 elsif p_operation='workout' then
  if jsonb_typeof(coalesce(v_payload->'sets','[]'))<>'array' or jsonb_array_length(coalesce(v_payload->'sets','[]'))>200 then raise exception 'Invalid sets'; end if;
  for item in select value from jsonb_array_elements(coalesce(v_payload->'sets','[]')) loop
   if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k not in ('exercise','muscle_groups','equipment','reps','weight','weight_unit','load_basis','rpe','rir')) then raise exception 'Invalid set fields'; end if;
   if length(trim(item->>'exercise')) not between 1 and 100 or item->>'exercise' is null or jsonb_typeof(item->'reps')<>'number' or item->>'reps' is null or (item->>'reps')::numeric not between 1 and 1000 or (item->>'reps')::numeric<>trunc((item->>'reps')::numeric) then raise exception 'Invalid exercise or reps'; end if;
   if item->>'weight' is not null and (jsonb_typeof(item->'weight')<>'number' or (item->>'weight')::numeric not between 0 and 5000 or item->>'weight_unit' is null) then raise exception 'Invalid set weight'; end if;
   if item ? 'weight_unit' and item->>'weight_unit' not in ('lb','kg') then raise exception 'Invalid set unit'; end if;
   if item ? 'load_basis' and item->>'load_basis' not in ('per_hand','total','bodyweight','assisted') then raise exception 'Invalid load basis'; end if;
   if item->>'rpe' is not null and (item->>'rpe')::numeric not between 1 and 10 then raise exception 'Invalid effort'; end if;
   if item->>'rir' is not null and ((item->>'rir')::numeric not between 0 and 20 or (item->>'rir')::numeric<>trunc((item->>'rir')::numeric)) then raise exception 'Invalid RIR'; end if;
  end loop;
  -- Keep the existing Activity UI working. This bridge is not another workout.
  -- Require activity permission as well; otherwise no partial write is committed.
  if not private.mcp_allowed(pid,'health:write','activity') then raise exception 'Activity permission required'; end if;
  insert into public.activity_entries(profile_id,entry_date,name,calories_burned) values(pid,(v_payload->>'entry_date')::date,v_payload->>'name',(v_payload->>'calories_burned')::numeric) returning id into aid;
  insert into public.workout_sessions select (jsonb_populate_record(null::public.workout_sessions, v_payload||jsonb_build_object('id',gen_random_uuid(),'profile_id',pid,'activity_entry_id',aid,'sets',coalesce(v_payload->'sets','[]'::jsonb),'source','with_mcp','source_id',p_submission_id,'provenance',jsonb_build_object('client_id',cid),'created_at',now()))).* returning id into rid;
 elsif p_operation='wellness' then
  if not exists(select 1 from jsonb_each(v_payload) e where e.key not in ('entry_date','time_zone') and e.value<>'null'::jsonb) then raise exception 'A measurement or note is required'; end if;
  insert into public.wellness_entries select (jsonb_populate_record(null::public.wellness_entries,v_payload||jsonb_build_object('id',gen_random_uuid(),'profile_id',pid,'source','with_mcp','source_id',p_submission_id,'provenance',jsonb_build_object('client_id',cid),'created_at',now()))).* returning id into rid;
 elsif p_operation in ('goals','correction') then
  if v_payload->'confirmed' is distinct from 'true'::jsonb or jsonb_typeof(v_payload->'changes') is distinct from 'object' or jsonb_typeof(v_payload->'expected_values') is distinct from 'object' or v_payload->'changes'='{}' then raise exception 'Confirmed changes and expected values required'; end if;
  select r.* into review from public.connected_ai_change_reviews r where r.id=(v_payload->>'approval_id')::uuid and r.user_id=auth.uid() and r.client_id=cid and r.submission_id=p_submission_id for update;
  if not found or review.operation<>p_operation or review.payload<>(v_payload-'approval_id') or review.approved_at is null or review.rejected_at is not null or review.consumed_at is not null or review.expires_at<=now() then raise exception 'Human approval is required or has expired'; end if;
  if p_operation='goals' then tbl:='profiles';rid:=pid;allowed:=array['goal_statement','goal_weight','goal_date','calories','protein','carbs','fat'];
  else
   tbl:=case v_payload->>'record_type' when 'weight' then 'weight_entries' when 'food' then 'food_entries' when 'activity' then 'activity_entries' end;
   if tbl is null then raise exception 'Unsupported record type'; end if;
   rid:=(v_payload->>'record_id')::uuid;
   allowed:=case tbl when 'weight_entries' then array['weight'] when 'food_entries' then array['name','calories','protein','carbs','fat','fiber','meal','notes'] else array['name','calories_burned'] end;
  end if;
  if exists(select 1 from jsonb_object_keys(v_payload->'changes') k where not k=any(allowed) or not (v_payload->'expected_values')?k) then raise exception 'Unexpected change or missing expected value'; end if;
  execute format('select to_jsonb(t) from public.%I t where id=$1 and %I=$2 for update',tbl,case tbl when 'profiles' then 'id' else 'profile_id' end) into rec using rid,pid;
  if rec is null then raise exception 'Record unavailable'; end if;
  for key,item in select * from jsonb_each(v_payload->'changes') loop
   if rec->key is distinct from v_payload->'expected_values'->key then raise exception 'Record changed; review before correcting'; end if;
   if key in ('weight','goal_weight','calories','protein','carbs','fat','fiber','calories_burned') and item<>'null' then
    if jsonb_typeof(item)<>'number' or (item::text)::numeric<0 or (item::text)::numeric>20000 or (key in ('weight','goal_weight') and ((item::text)::numeric<=0 or (item::text)::numeric>2000)) then raise exception 'Invalid correction value'; end if;
   end if;
   if key='weight' and item='null' then raise exception 'Weight required'; end if;
   if key in ('name','notes','goal_statement') and length(item#>>'{}')>1000 then raise exception 'Text too long'; end if;
  end loop;
  -- One UPDATE statement, typed values, whitelisted column identifiers.
  execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1)) where id=$2 and %I=$3',tbl,(select string_agg(format('%I',k),',') from jsonb_object_keys(v_payload->'changes') k),(select string_agg(format('%I',k),',') from jsonb_object_keys(v_payload->'changes') k),tbl,case tbl when 'profiles' then 'id' else 'profile_id' end) using rec||(v_payload->'changes'),rid,pid;
 elsif p_operation='preference' then
  if v_payload->>'metric_type' not in ('weight','food','activity','water','steps','fasting') or v_payload->>'metric_type' is null or jsonb_typeof(v_payload->'enabled') is distinct from 'boolean' then raise exception 'Invalid preference'; end if;
  insert into public.profile_metric_preferences(profile_id,metric_type,enabled) values(pid,v_payload->>'metric_type',(v_payload->>'enabled')::boolean) on conflict(profile_id,metric_type) do update set enabled=excluded.enabled;
  rid:=pid;
 end if;
 if p_operation in ('weight','food','workout','wellness') then
  insert into public.health_record_provenance(profile_id,record_type,record_id,source,time_zone,original_units) values(pid,p_operation,rid,'with_mcp',v_payload->>'time_zone',case when p_operation='weight' then jsonb_build_object('weight',v_payload->'weight','unit',v_payload->>'unit') else '{}'::jsonb end);
 end if;
 if p_operation in ('goals','correction') then update public.connected_ai_change_reviews set consumed_at=now() where id=review.id; end if;
 output:=jsonb_build_object('record_id',rid,'activity_entry_id',aid,'operation',p_operation,'duplicate',false);
 insert into public.mcp_write_receipts(user_id,client_id,submission_id,operation,payload_fingerprint,result) values(auth.uid(),cid,p_submission_id,p_operation,fingerprint,output);
 perform set_config('with.mcp_write','',true);
 return output;
end $$;
revoke all on function public.mcp_apply_write(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mcp_apply_write(text,uuid,jsonb) to with_mcp;
