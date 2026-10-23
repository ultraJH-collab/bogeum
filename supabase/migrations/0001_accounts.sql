-- 보금 — 아이디/비밀번호 계정, 세션, 사용자 상태 동기화, AI 사용량
-- 테이블은 API로 노출되지 않는 private 스키마에 두고, public의 SECURITY DEFINER 함수로만 접근한다.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.members (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique check (username ~ '^[a-z0-9_]{4,20}$'),
  pw_hash       text not null,
  failed_count  int not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now()
);

create table private.sessions (
  token_hash  text primary key,
  member_id   uuid not null references private.members(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index on private.sessions (member_id);

create table private.member_state (
  member_id   uuid not null references private.members(id) on delete cascade,
  key         text not null check (key in ('favs','unlocked','freeUsed','care','ct','vault','chat')),
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (member_id, key)
);

create table private.ai_usage (
  member_id  uuid not null references private.members(id) on delete cascade,
  day        date not null default (now() at time zone 'Asia/Seoul')::date,
  count      int not null default 0,
  primary key (member_id, day)
);

alter table private.members      enable row level security;
alter table private.sessions     enable row level security;
alter table private.member_state enable row level security;
alter table private.ai_usage     enable row level security;

-- 토큰 → 회원 id (만료·무효면 null)
create or replace function private.member_of(p_token text)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.member_id from private.sessions s
  where s.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and s.expires_at > now();
$$;

create or replace function private.new_session(p_member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from private.sessions where member_id = p_member and expires_at < now();
  insert into private.sessions (token_hash, member_id, expires_at)
  values (encode(extensions.digest(t, 'sha256'), 'hex'), p_member, now() + interval '30 days');
  return t;
end $$;

-- 회원가입: 아이디 4~20자(영소문자·숫자·_), 비밀번호 8자 이상
create or replace function public.bg_signup(p_username text, p_password text)
returns json language plpgsql security definer set search_path = '' as $$
declare u text := lower(trim(p_username)); m uuid;
begin
  if u !~ '^[a-z0-9_]{4,20}$' then raise exception 'BAD_USERNAME' using errcode = 'P0001'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'BAD_PASSWORD' using errcode = 'P0001'; end if;
  if exists (select 1 from private.members where username = u) then raise exception 'USERNAME_TAKEN' using errcode = 'P0001'; end if;
  insert into private.members (username, pw_hash) values (u, extensions.crypt(p_password, extensions.gen_salt('bf', 10))) returning id into m;
  return json_build_object('token', private.new_session(m), 'username', u);
end $$;

-- 로그인: 5회 연속 실패 시 10분 잠금
create or replace function public.bg_login(p_username text, p_password text)
returns json language plpgsql security definer set search_path = '' as $$
declare u text := lower(trim(p_username)); r private.members;
begin
  select * into r from private.members where username = u;
  if not found then raise exception 'BAD_CREDENTIALS' using errcode = 'P0001'; end if;
  if r.locked_until is not null and r.locked_until > now() then raise exception 'LOCKED' using errcode = 'P0001'; end if;
  if r.pw_hash <> extensions.crypt(coalesce(p_password, ''), r.pw_hash) then
    update private.members set failed_count = failed_count + 1,
      locked_until = case when failed_count + 1 >= 5 then now() + interval '10 minutes' else null end
    where id = r.id;
    raise exception 'BAD_CREDENTIALS' using errcode = 'P0001';
  end if;
  update private.members set failed_count = 0, locked_until = null where id = r.id;
  return json_build_object('token', private.new_session(r.id), 'username', r.username);
end $$;

create or replace function public.bg_logout(p_token text)
returns void language sql security definer set search_path = '' as $$
  delete from private.sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.bg_me(p_token text)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('username', m.username, 'since', m.created_at)
  from private.members m where m.id = private.member_of(p_token);
$$;

create or replace function public.bg_state_get(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m uuid := private.member_of(p_token);
begin
  if m is null then raise exception 'UNAUTHORIZED' using errcode = 'P0001'; end if;
  return coalesce((select jsonb_object_agg(key, value) from private.member_state where member_id = m), '{}'::jsonb);
end $$;

create or replace function public.bg_state_put(p_token text, p_key text, p_value jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare m uuid := private.member_of(p_token); t timestamptz := now();
begin
  if m is null then raise exception 'UNAUTHORIZED' using errcode = 'P0001'; end if;
  if octet_length(p_value::text) > 4000000 then raise exception 'TOO_LARGE' using errcode = 'P0001'; end if;
  insert into private.member_state (member_id, key, value, updated_at) values (m, p_key, p_value, t)
  on conflict (member_id, key) do update set value = excluded.value, updated_at = t;
  return t;
end $$;

create or replace function public.bg_state_clear(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := private.member_of(p_token);
begin
  if m is null then raise exception 'UNAUTHORIZED' using errcode = 'P0001'; end if;
  delete from private.member_state where member_id = m;
end $$;

-- AI 호출 1회 차감 (회원당 하루 60회). 서버 함수(api/chat)가 OpenAI 호출 전에 부른다.
create or replace function public.bg_ai_use(p_token text)
returns json language plpgsql security definer set search_path = '' as $$
declare m uuid := private.member_of(p_token); d date := (now() at time zone 'Asia/Seoul')::date; n int;
begin
  if m is null then return json_build_object('ok', false, 'reason', 'UNAUTHORIZED'); end if;
  insert into private.ai_usage (member_id, day, count) values (m, d, 1)
  on conflict (member_id, day) do update set count = private.ai_usage.count + 1
  returning count into n;
  if n > 60 then return json_build_object('ok', false, 'reason', 'QUOTA'); end if;
  return json_build_object('ok', true, 'remaining', 60 - n);
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.bg_signup(text, text), public.bg_login(text, text), public.bg_logout(text), public.bg_me(text),
  public.bg_state_get(text), public.bg_state_put(text, text, jsonb), public.bg_state_clear(text), public.bg_ai_use(text) from public;
grant execute on function public.bg_signup(text, text), public.bg_login(text, text), public.bg_logout(text), public.bg_me(text),
  public.bg_state_get(text), public.bg_state_put(text, text, jsonb), public.bg_state_clear(text), public.bg_ai_use(text) to anon, authenticated;
