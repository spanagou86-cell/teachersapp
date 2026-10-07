-- What a lesson aims at, written before it happens: objectives and activities for the
-- weekly programme the principal or inspector can ask for (Κ.Δ.Π. 168/2024, άρθρο 39).
alter table public.lesson_slots add column plan text not null default '' check (char_length(plan) <= 2000);

-- Absences can be justified; the progress report counts justified and unjustified days apart.
alter table public.attendance add column excused_ids uuid[] not null default '{}';

-- Σχολική Έκθεση Προόδου: one per pupil per τετράμηνο. Ratings use the Ministry's 1–4
-- scales; texts are the teacher's strengths / areas of growth / remarks.
create table public.progress_reports (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null,
  year integer not null check (year between 2000 and 2100),
  term smallint not null check (term in (1, 2)),
  ratings jsonb not null default '{}',
  texts jsonb not null default '{}',
  reviewed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner, student_id, year, term),
  foreign key (owner, student_id) references public.students (owner, id) on delete cascade,
  check (pg_column_size(ratings) + pg_column_size(texts) < 32000)
);
alter table public.progress_reports enable row level security;
create policy "own rows" on public.progress_reports for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on public.progress_reports from anon;
grant select, insert, update, delete on public.progress_reports to authenticated;
