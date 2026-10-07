-- How each pupil did in a lesson (✓ understood · ~ partly · ✗ struggled), ticked after it.
-- Kept with the lesson; the pupils' ids only, never names. Run in the SQL editor: "Run without RLS".
alter table public.lesson_slots
  add column if not exists checks jsonb not null default '{}'::jsonb
  check (jsonb_typeof(checks) = 'object');
