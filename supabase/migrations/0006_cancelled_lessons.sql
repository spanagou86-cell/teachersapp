-- A lesson the teacher deleted or moved stays as a "cancelled" row, so filling the school
-- year from the timetable (same template and date) never brings it back.
alter table public.lesson_slots add column cancelled boolean not null default false;
create index lesson_slots_owner_cancelled_date_idx on public.lesson_slots (owner, date) where not cancelled;
