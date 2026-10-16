-- PolyClash Arena: run once in Supabase > SQL Editor (free plan is enough).
-- Also: Authentication > Providers > Email > turn OFF "Confirm email".
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check(username ~ '^[A-Za-z0-9_]{3,16}$'),
 coins int not null default 500, wins int not null default 0, kills int not null default 0, xp int not null default 0,
 data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.admin_roles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in('owner','admin')), powers jsonb not null default '{}'::jsonb);
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_roles where user_id=auth.uid() and role='owner') $$;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id=auth.uid() or public.is_owner()) with check (id=auth.uid() or public.is_owner());
drop policy if exists "roles read" on public.admin_roles;
create policy "roles read" on public.admin_roles for select using (user_id=auth.uid() or public.is_owner());
drop policy if exists "roles owner write" on public.admin_roles;
create policy "roles owner write" on public.admin_roles for all using (public.is_owner()) with check (public.is_owner());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public
as $$ begin
 insert into public.profiles(id,username) values(new.id, coalesce(new.raw_user_meta_data->>'username','Player_'||substr(new.id::text,1,6)));
 if lower(coalesce(new.raw_user_meta_data->>'username',''))='landon2' and not exists(select 1 from public.admin_roles where role='owner') then insert into public.admin_roles(user_id,role) values(new.id,'owner') on conflict do nothing; end if;
 return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Mega admin is AUTOMATIC: whoever registers the username Landon2 first becomes owner (see trigger above).
-- Create that account BEFORE sharing the link. Manual fallback for another username (edit the email):
-- insert into public.admin_roles(user_id,role) select id,'owner' from auth.users where email='boss@polyclash-players.com';

-- Live settings (announcement, coin/bag/bot multipliers) editable from the Mega Admin page.
create table if not exists public.game_config(key text primary key, value jsonb not null default '{}'::jsonb);
alter table public.game_config enable row level security;
drop policy if exists "cfg read" on public.game_config;
create policy "cfg read" on public.game_config for select using (true);
drop policy if exists "cfg owner write" on public.game_config;
create policy "cfg owner write" on public.game_config for all using (public.is_owner()) with check (public.is_owner());
