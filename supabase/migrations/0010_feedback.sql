-- «Στείλε μας σχόλιο»: what teachers write from inside the app. Each can send, nobody can read
-- through the API (we read them in the dashboard). Run in the SQL editor: "Run without RLS".
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  page text not null default '' check (char_length(page) <= 200),
  reply boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "send own" on public.feedback;
create policy "send own" on public.feedback for insert to authenticated with check (owner = (select auth.uid()));
revoke all on public.feedback from anon;
grant insert on public.feedback to authenticated;
