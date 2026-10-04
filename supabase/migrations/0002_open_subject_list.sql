-- Real timetables have many subjects (Ιστορία, Αγγλικά, Φυσική Αγωγή…). The list lives in the app;
-- the database only checks the id is a short slug.
alter table public.timetable_entries drop constraint timetable_entries_subject_id_check;
alter table public.lesson_slots drop constraint lesson_slots_subject_id_check;
alter table public.materials drop constraint materials_subject_id_check;
alter table public.timetable_entries add constraint timetable_entries_subject_id_check check (subject_id ~ '^[a-z_]{2,30}$');
alter table public.lesson_slots add constraint lesson_slots_subject_id_check check (subject_id ~ '^[a-z_]{2,30}$');
alter table public.materials add constraint materials_subject_id_check check (subject_id ~ '^[a-z_]{2,30}$');
