-- Push reminders: «Σε 5′ έχεις παιδονομία». Each device the teacher turns reminders on
-- for is a subscription; once a minute the database picks the duties starting in about
-- five minutes and hands the messages to the app's /api/push/send, which signs them.

create table public.push_subscriptions (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  duty boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (owner, endpoint)
);
alter table public.push_subscriptions enable row level security;
create policy "own rows" on public.push_subscriptions for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Nothing here is reachable through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Where to send, and the shared secret the app checks (filled in once, outside migrations).
create table private.push_config (
  id smallint primary key default 1 check (id = 1),
  url text not null,
  secret text not null
);
-- Locked as well: only the job below (running as the owner) reads it.
alter table private.push_config enable row level security;

-- One reminder per duty, however often the job runs.
create table private.push_log (
  owner uuid not null,
  slot_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (owner, slot_id)
);
alter table private.push_log enable row level security;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.send_duty_reminders() returns void
language plpgsql security definer set search_path = '' as $fn$
declare
  cfg record;
  msgs jsonb;
  -- Schools in Cyprus and Greece share one clock.
  t timestamp := now() at time zone 'Europe/Athens';
begin
  select url, secret into cfg from private.push_config where id = 1;
  if cfg is null then
    return;
  end if;
  delete from private.push_log where sent_at < now() - interval '2 days';

  with due as (
    select s.owner, s.id as slot_id, s.start_time, s.topic, coalesce(p.country, 'gr') as country
    from public.lesson_slots s
    left join public.profiles p on p.id = s.owner
    where s.kind = 'duty'
      and not s.cancelled
      and s.date = t::date
      and s.start_time > t::time + interval '3 minutes'
      and s.start_time <= t::time + interval '6 minutes'
  ),
  fresh as (
    insert into private.push_log (owner, slot_id)
    select owner, slot_id from due
    on conflict do nothing
    returning owner, slot_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'endpoint', sub.endpoint,
      'p256dh', sub.p256dh,
      'auth', sub.auth,
      'title', case when d.country = 'cy' then 'Παιδονομία σε 5′' else 'Εφημερία σε 5′' end,
      'body', to_char(d.start_time, 'HH24:MI') || case when d.topic <> '' then ' · ' || d.topic else '' end,
      'tag', 'duty-' || d.slot_id,
      'url', '/'
    )), '[]'::jsonb)
  into msgs
  from fresh f
  join due d on d.owner = f.owner and d.slot_id = f.slot_id
  join public.push_subscriptions sub on sub.owner = d.owner and sub.duty;

  if jsonb_array_length(msgs) > 0 then
    perform net.http_post(
      url := cfg.url,
      body := jsonb_build_object('messages', msgs),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || cfg.secret),
      timeout_milliseconds := 10000
    );
  end if;
end;
$fn$;
revoke all on function private.send_duty_reminders() from public, anon, authenticated;

select cron.schedule('taxi-duty-reminders', '* * * * *', 'select private.send_duty_reminders()');
