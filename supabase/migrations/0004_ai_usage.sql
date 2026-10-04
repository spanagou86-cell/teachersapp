-- Daily AI allowance per teacher. Only the security-definer function writes to it,
-- so a teacher can't reset their own counter through the API.
create table public.ai_usage (
  owner uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (owner, day)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage: read own" on public.ai_usage
  for select to authenticated using (owner = (select auth.uid()));

/** Takes one AI request from today's allowance (Athens time). Returns false when it is used up. */
create or replace function public.ai_take(daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Athens')::date;
  used integer;
begin
  if uid is null then
    return false;
  end if;
  insert into public.ai_usage as u (owner, day, count)
  values (uid, today, 1)
  on conflict (owner, day) do update set count = u.count + 1
  returning count into used;
  if used > daily_limit then
    update public.ai_usage set count = count - 1 where owner = uid and day = today;
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.ai_take(integer) from public, anon;
grant execute on function public.ai_take(integer) to authenticated;
