-- τάξη: initial schema. Every row belongs to one teacher (owner) and is only
-- visible to them. Child tables use composite (owner, id) foreign keys so a row
-- can never point at another teacher's data.

-- Profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  school_name text not null default '' check (char_length(school_name) <= 120),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Classes & students ---------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  grade text not null default '' check (char_length(grade) <= 60),
  room text not null default '' check (char_length(room) <= 60),
  created_at timestamptz not null default now(),
  unique (owner, id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id uuid not null,
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  sort integer not null default 0,
  unique (owner, id),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade
);

-- Weekly timetable template and the concrete lessons it produces ---------------
create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  start_time time not null,
  end_time time not null,
  kind text not null default 'lesson' check (kind in ('lesson', 'duty', 'free', 'meeting')),
  class_id uuid,
  subject_id text check (subject_id in ('glossa', 'math', 'meleti', 'eikastika')),
  label text not null default '' check (char_length(label) <= 80),
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (kind <> 'lesson' or (class_id is not null and subject_id is not null)),
  unique (owner, id),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade
);

create table public.lesson_slots (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  kind text not null default 'lesson' check (kind in ('lesson', 'duty', 'free', 'meeting')),
  class_id uuid,
  subject_id text check (subject_id in ('glossa', 'math', 'meleti', 'eikastika')),
  topic text not null default '' check (char_length(topic) <= 200),
  status text not null default 'planned' check (status in ('planned', 'done', 'partial', 'skipped')),
  taught_note text not null default '' check (char_length(taught_note) <= 2000),
  carried_from_id uuid,
  carried_to_id uuid,
  template_id uuid,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (owner, id),
  unique (owner, template_id, date),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade,
  foreign key (owner, carried_from_id) references public.lesson_slots (owner, id) on delete set null (carried_from_id),
  foreign key (owner, carried_to_id) references public.lesson_slots (owner, id) on delete set null (carried_to_id),
  foreign key (owner, template_id) references public.timetable_entries (owner, id) on delete set null (template_id)
);

-- Materials, their history and lesson links ------------------------------------
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  class_id uuid not null,
  subject_id text not null check (subject_id in ('glossa', 'math', 'meleti', 'eikastika')),
  kind text not null check (kind in ('worksheet', 'plan', 'quiz', 'summary', 'file')),
  level text not null default 'standard' check (level in ('basic', 'standard', 'advanced')),
  with_solutions boolean not null default true,
  black_and_white boolean not null default false,
  file jsonb,
  original_blocks jsonb not null default '[]',
  blocks jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, id),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade
);

create table public.material_versions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  material_id uuid not null,
  label text not null default '' check (char_length(label) <= 200),
  blocks jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (owner, material_id) references public.materials (owner, id) on delete cascade
);

create table public.slot_materials (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slot_id uuid not null,
  material_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (slot_id, material_id),
  foreign key (owner, slot_id) references public.lesson_slots (owner, id) on delete cascade,
  foreign key (owner, material_id) references public.materials (owner, id) on delete cascade
);

-- Attendance, tasks, notes -----------------------------------------------------
create table public.attendance (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id uuid not null,
  date date not null,
  absent_ids uuid[] not null default '{}',
  recorded_at timestamptz not null default now(),
  primary key (owner, class_id, date),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  time time,
  detail text not null default '' check (char_length(detail) <= 200),
  created_at timestamptz not null default now()
);

create table public.class_notes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id uuid not null,
  date date not null default current_date,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (owner, class_id) references public.classes (owner, id) on delete cascade
);

-- Indexes for the foreign keys and the common "my rows" queries -----------------
create index on public.classes (owner);
create index on public.students (owner, class_id);
create index on public.timetable_entries (owner, class_id);
create index on public.lesson_slots (owner, date);
create index on public.lesson_slots (owner, class_id);
create index on public.lesson_slots (owner, carried_from_id);
create index on public.lesson_slots (owner, carried_to_id);
create index on public.materials (owner, class_id);
create index on public.material_versions (owner, material_id, created_at desc);
create index on public.slot_materials (owner, material_id);
create index on public.slot_materials (owner, slot_id);
create index on public.attendance (owner, class_id);
create index on public.tasks (owner, date);
create index on public.class_notes (owner, class_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger materials_touch before update on public.materials
  for each row execute function public.touch_updated_at();

-- Row level security -----------------------------------------------------------
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['classes', 'students', 'timetable_entries', 'lesson_slots', 'materials',
                           'material_versions', 'slot_materials', 'attendance', 'tasks', 'class_notes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- File storage: private bucket, one folder per teacher -------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 26214400, array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text'
]);

create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = (select auth.uid())::text);
