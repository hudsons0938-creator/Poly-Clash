-- PolyClash admin tools (run AFTER supabase.sql). Already applied to the live project.
-- Bans, timed grants (exclusive items, powers, titles) and an admin action log.
-- Every admin action is a SECURITY DEFINER function that checks the caller's role/powers on the server.
create schema if not exists private;
create table public.bans(user_id uuid primary key references auth.users(id) on delete cascade, until timestamptz, reason text not null default '', by_name text, created_at timestamptz not null default now());
create table public.grants(id bigserial primary key, user_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind in('char','weapon','power','title','kit')), item text not null, until timestamptz, by_name text, created_at timestamptz not null default now());
create index grants_user_idx on public.grants(user_id);
create table public.admin_log(id bigserial primary key, at timestamptz not null default now(), admin_name text, target_name text, action text not null, detail jsonb not null default '{}'::jsonb);
alter table public.bans enable row level security;
alter table public.grants enable row level security;
alter table public.admin_log enable row level security;
create function public.is_staff(p text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_roles where user_id=auth.uid() and (role='owner' or p is null or coalesce((powers->>p)::boolean,false))) $$;
create function public.is_banned(uid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.bans where user_id=uid and (until is null or until>now())) $$;
create policy "grants read" on public.grants for select using (true);
create policy "bans read" on public.bans for select using (user_id=auth.uid() or public.is_staff('mod'));
create policy "log read" on public.admin_log for select using (public.is_staff(null));
create policy "no banned updates" on public.profiles as restrictive for update using (not public.is_banned(auth.uid()) or public.is_owner());
create function private.me_name() returns text language sql stable security definer set search_path=public as $$ select coalesce((select username from public.profiles where id=auth.uid()),'?') $$;
create function private.guard(target uuid, p text) returns text language plpgsql security definer set search_path=public as $$
declare trole text; tname text;
begin
 if not public.is_staff(p) then raise exception 'Not allowed'; end if;
 select username into tname from public.profiles where id=target; if tname is null then raise exception 'Player not found'; end if;
 select role into trole from public.admin_roles where user_id=target;
 if trole='owner' and target<>auth.uid() then raise exception 'The Mega Admin cannot be changed'; end if;
 if trole is not null and target<>auth.uid() and not public.is_owner() then raise exception 'Only the Mega Admin can change other admins'; end if;
 return tname;
end $$;
create function private.log(act text, tname text, d jsonb) returns void language sql security definer set search_path=public as $$
 insert into public.admin_log(admin_name,target_name,action,detail) values(private.me_name(),tname,act,coalesce(d,'{}'::jsonb)) $$;
create function public.admin_find(q text) returns table(id uuid, username text, coins int, role text, banned boolean) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_staff(null) then raise exception 'Not allowed'; end if;
 return query select p.id,p.username,p.coins,coalesce(r.role,'player'),public.is_banned(p.id) from public.profiles p left join public.admin_roles r on r.user_id=p.id
  where q is null or q='' or p.username ilike '%'||q||'%' order by p.created_at desc limit 100;
end $$;
create function public.admin_inspect(target uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare res jsonb;
begin
 if not public.is_staff(null) then raise exception 'Not allowed'; end if;
 select jsonb_build_object('id',p.id,'username',p.username,'coins',p.coins,'wins',p.wins,'kills',p.kills,'xp',p.xp,'data',p.data,'created',p.created_at,
  'role',coalesce(r.role,'player'),'powers',coalesce(r.powers,'{}'::jsonb),
  'ban',(select to_jsonb(b) from public.bans b where b.user_id=p.id and (b.until is null or b.until>now())),
  'grants',coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at desc) from public.grants g where g.user_id=p.id and (g.until is null or g.until>now())),'[]'::jsonb))
 into res from public.profiles p left join public.admin_roles r on r.user_id=p.id where p.id=target;
 return res;
end $$;
create function public.admin_coins(target uuid, delta int) returns int language plpgsql security definer set search_path=public as $$
declare n text; c int;
begin
 if target=auth.uid() and public.is_staff('coins') then n:=private.me_name(); else n:=private.guard(target,'give'); end if;
 update public.profiles set coins=greatest(0,coins+delta) where id=target returning coins into c;
 perform private.log(case when delta>=0 then 'add coins' else 'remove coins' end,n,jsonb_build_object('amount',delta,'now',c));
 return c;
end $$;
create function public.admin_set_data(target uuid, k text, val jsonb) returns void language plpgsql security definer set search_path=public as $$
declare n text;
begin
 if k not in('chars','weapons','skins','lv') then raise exception 'Bad field'; end if;
 if target=auth.uid() and public.is_staff('unlock') then n:=private.me_name(); else n:=private.guard(target,'give'); end if;
 update public.profiles set data=jsonb_set(coalesce(data,'{}'::jsonb),array[k],val,true) where id=target;
 perform private.log('edit '||k,n,jsonb_build_object('count',case when jsonb_typeof(val)='array' then jsonb_array_length(val) else null end));
end $$;
create function public.admin_grant(target uuid, k text, item text, minutes int) returns bigint language plpgsql security definer set search_path=public as $$
declare n text; gid bigint;
begin
 n:=private.guard(target,'grant');
 insert into public.grants(user_id,kind,item,until,by_name) values(target,k,item,case when minutes is null or minutes<=0 then null else now()+make_interval(mins=>minutes) end,private.me_name()) returning id into gid;
 perform private.log('grant '||k,n,jsonb_build_object('item',item,'minutes',minutes));
 return gid;
end $$;
create function public.admin_revoke(gid bigint) returns void language plpgsql security definer set search_path=public as $$
declare n text; t uuid; k text; it text;
begin
 select user_id,kind,item into t,k,it from public.grants where id=gid; if t is null then raise exception 'Grant not found'; end if;
 n:=private.guard(t,'grant');
 update public.grants set until=now()-interval '1 second' where id=gid;
 perform private.log('revoke '||k,n,jsonb_build_object('item',it));
end $$;
create function public.admin_ban(target uuid, minutes int, why text) returns void language plpgsql security definer set search_path=public as $$
declare n text;
begin
 if target=auth.uid() then raise exception 'You cannot ban yourself'; end if;
 n:=private.guard(target,'mod');
 insert into public.bans(user_id,until,reason,by_name) values(target,case when minutes is null or minutes<=0 then null else now()+make_interval(mins=>minutes) end,coalesce(why,''),private.me_name())
  on conflict(user_id) do update set until=excluded.until,reason=excluded.reason,by_name=excluded.by_name,created_at=now();
 perform private.log(case when minutes is null or minutes<=0 then 'ban' else 'timeout' end,n,jsonb_build_object('minutes',minutes,'reason',why));
end $$;
create function public.admin_unban(target uuid) returns void language plpgsql security definer set search_path=public as $$
declare n text;
begin
 n:=private.guard(target,'mod');
 update public.bans set until=now()-interval '1 second' where user_id=target;
 perform private.log('unban',n,'{}'::jsonb);
end $$;
create function public.my_status() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'ban',(select jsonb_build_object('until',b.until,'reason',b.reason) from public.bans b where b.user_id=auth.uid() and (b.until is null or b.until>now())),
  'grants',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'kind',g.kind,'item',g.item,'until',g.until)) from public.grants g where g.user_id=auth.uid() and (g.until is null or g.until>now())),'[]'::jsonb)) $$;
create function public.titles_for(names text[]) returns table(username text, title text) language sql stable security definer set search_path=public as $$
 select distinct on (p.username) p.username,g.item from public.grants g join public.profiles p on p.id=g.user_id
 where g.kind='title' and (g.until is null or g.until>now()) and p.username=any(names) order by p.username,g.created_at desc $$;
