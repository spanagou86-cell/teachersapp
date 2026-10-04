-- Country decides holidays, terms and wording (εφημερία / παιδονομία).
alter table public.profiles add column country text not null default 'gr' check (country in ('gr', 'cy'));

-- Late arrivals next to absences.
alter table public.attendance add column late_ids uuid[] not null default '{}';

-- Student card: notes and contacts with parents, one timeline per student.
create table public.student_notes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null,
  kind text not null default 'note' check (kind in ('note', 'parent')),
  date date not null default current_date,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (owner, student_id) references public.students (owner, id) on delete cascade
);
create index on public.student_notes (owner, student_id, date desc);
alter table public.student_notes enable row level security;
create policy "own rows" on public.student_notes for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on public.student_notes from anon;
grant select, insert, update, delete on public.student_notes to authenticated;
