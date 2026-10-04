# τάξη — Η τάξη σου. Μαζί σου.

Interactive prototype of a workspace for Greek primary teachers: schedule, students and teaching material in one place.

**Main flow:** upload material → adapt it → link it to a lesson → record what was taught (and carry over what wasn't).

## What works for real
- Upload PDF / Word / images (camera on mobile); files stored in the browser (IndexedDB)
- Material library per class and subject, search and filters
- Worksheet editor: edit, reorder, delete blocks, undo/redo, solutions sheet, print / save as PDF
- Version history with restore (including back to the original)
- Link material to specific lessons; lesson log (status + "what was taught")
- Carry over an unfinished lesson with time-conflict detection and undo
- Attendance per day, absence totals, subject progress, class notes, daily checklist
- Search (⌘K) across material, lessons and students

## What is mocked
- **AI adaptation** (`lib/ai/mock.ts`): deterministic; understands simpler/harder, exercise N, solutions, more space, A/B version, black & white. It does not read file contents yet.
- Fixed demo clock: Monday 5 October 2026, 09:05 (`lib/dates.ts`).
- Plans/payments not connected. Data lives in localStorage (no accounts or sync).

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Zustand (persisted) · lucide-react · Vitest · Playwright.

Domain logic is pure and tested (`lib/schedule.ts`, `lib/materials.ts`, `lib/ai/*`); the store (`lib/store`) is the only place to swap for a backend.

## Scripts
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run lint && npm run typecheck
npm run build && npm start
BASE=http://localhost:3000 npm run e2e   # full flow on mobile + desktop viewports
```

## Next steps
1. Supabase: auth, Postgres (classes, students, slots, materials, versions), Storage for files
2. Claude API for reading uploads and adapting material (replace `adaptMaterial`)
3. Timetable / roster import
4. Stripe subscriptions
