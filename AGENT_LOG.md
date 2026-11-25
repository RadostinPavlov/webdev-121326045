# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-10-28 · First steps
- Goal: set up the codespace and Gemini CLI, start writing server.js
- Delegated: asked Gemini to list the files in the repo and explain what AGENTS.md is for
- Checkpoints: Gemini answered about my repository's files
- Went wrong: nothing; /stats was not recorded for this session
- Changed by hand: nothing

## 2026-11-18 · Debugging server.js
- Goal: get check.mjs to 12/12
- Delegated: asked why my server crashed on startup and why an unknown tool returned -32601; the agent explained, I wrote the fixes
- Checkpoints: check.mjs after each fix (2/8 → 9/12 → 11/12 → 12/12)
- Went wrong: duplicate `const fs` and `const lines` crashed the server; `name` was not defined; a missing lecture crashed instead of returning isError; unknown tool returned -32601 instead of -32602
- Changed by hand: removed the duplicate declarations; read `name` from `msg.params.name`; returned a result with `isError: true` for a missing lecture; returned -32602 for an unknown tool

## 2026-11-18 · Description experiment
- Goal: use the server from a real agent and see how a tool description affects tool choice
- Delegated: asked "What does lecture 5 cover?" twice, once with the original and once with a vague `find_lecture` description
- Checkpoints: /mcp showed my-project connected; both sessions made one successful tool call; check.mjs 12/12 after reverting
- Went wrong: nothing; the model still chose `find_lecture` with the vague description
- Changed by hand: changed and then reverted the `find_lecture` description; fixed the lecture range from 1–12 to 1–10

## 2026-11-19 · Usage limit
- Goal: check that the agent reads AGENTS.md ("Always ask before"), then plan Slice 1
- Delegated: asked what AGENTS.md says under "Always ask before"
- Checkpoints: none reached; the main model never answered
- Went wrong: hit the usage limit for the Pro models, switched to gemini-3-flash-preview, then hit the limit for gemini-3.8-flash; 20 requests to the main model were refused and no tool was called
- Changed by hand: nothing

## 2026-11-20 · Usage limit again
- Goal: check that the agent reads AGENTS.md ("Always ask before")
- Delegated: asked what AGENTS.md says under "Always ask before"
- Checkpoints: none reached
- Went wrong: the API key still had no quota for gemini-3.8-flash; 9 requests to the main model were refused, no tool was called
- Changed by hand: nothing; decided to switch from the API key to Google sign-in

## 2026-11-20 · AGENTS.md check
- Goal: confirm the agent reads AGENTS.md at the start of a session
- Delegated: asked what AGENTS.md says under "Always ask before"
- Checkpoints: the agent listed all nine lines correctly
- Went wrong: Auto mode picked models with no quota left (gemini-3.1-pro-preview, gemini-3.8-flash); switched manually to gemini-3-flash-preview
- Changed by hand: nothing

## 2026-11-20 · Slice 1: plan, schema, sign-in
- Goal: plan Slice 1 and build it in three steps (schema and seed, sign-in, events list)
- Delegated: the plan, then src/db (schema, seed, setup), auth routes and service, server.js and the login page
- Checkpoints: reviewed the plan and asked for a sessions table, a rerunnable db:setup, server-side protection of /events and src/server.js; after step 1 checked 3 events, a hashed password, a second db:setup run and check.mjs 12/12
- Went wrong: the agent tried to cat .env (would send its values to the model); wrote ES modules, which would break mcp-server/server.js (CommonJS); used psql, which is not installed; schema.sql had an ALTER TABLE that fails on a second run; ran db:setup before npm install; auth.service.js writes SQL directly (breaks the layering in AGENTS.md) and compares hashes with ===; hit the usage limit for every model before step 2 was checked
- Changed by hand: refused cat .env and the first db.js and package.json; asked for CommonJS, a Node setup script, an idempotent schema and npm install


## 2026-11-22 · Slice 1: auth fixes and events list
- Goal: fix the auth code from the last session and build step 3, the events list screen
- Delegated: move the users SQL to src/db/user.db.js, shared password helpers with timingSafeEqual, session regenerate on sign-in; then the events list (event.db.js, event.service.js, GET /api/events, src/views/events.html, sign-out button)
- Checkpoints: curl for sign-in (200 and Set-Cookie), wrong password (401), /events without a session (302 to /login), check.mjs 12/12; reviewed the events SQL; signed in in the browser and saw the three seeded events; deleted the Yoga event in the database and it disappeared on reload (AC-11)
- Went wrong: free_places came back as text because pg returns COUNT as a string; there was no route for /, so the app opened on "Cannot GET /"; db:setup kept old sessions while recreating users with new ids, so a signed-in browser pointed at a user that no longer existed; hit the usage limit for every model before the last fix
- Changed by hand: added AC-12 for the root URL to SPEC.md; after the usage limit, changed the TRUNCATE in seed.js to also clear "session" and RESTART IDENTITY

## 2026-11-23 · Refusal questions for event registration
- Goal: find refusal cases I missed before writing the Slice 2 criteria
- Delegated: asked the agent to read SPEC.md and ask up to five questions, without writing criteria or changing files
- Checkpoints: the agent only read SPEC.md and asked five questions
- Went wrong: nothing
- Changed by hand: decided to refuse past events with 409, to put a cancellation deadline under Non-goals, to allow organizers to register, to leave cancelled events for the organizer slice, and to add a Constraint that capacity is never exceeded under concurrent requests

## 2026-11-23 · Autonomy and checkpoints for Exercise 3
- Goal: decide before any code how far the agent may go alone in this feature
- Delegated: nothing yet; this entry sets the rules for the next sessions
- Checkpoints:
  - The agent may read any file and propose plans without asking.
  - It writes one step at a time and stops after each: migration, service with its rule test, endpoints with API tests, authorization, UI.
  - After every step I run npm test, read git diff --staged and commit myself; the agent never commits or pushes.
  - It stops and asks before anything in "Always ask before" in AGENTS.md, and before running db:setup (it wipes all data).
  - It never reads .env and never changes a test so that the code passes.
- Went wrong: –
- Changed by hand: –

## 2026-11-23 · Always-ask test (blocked)
- Goal: check that the agent stops before installing a dependency
- Delegated: asked the agent to install dayjs
- Checkpoints: none reached
- Went wrong: the API key had no quota left for gemini-3-flash-preview or the Pro models; the request never reached the main model
- Changed by hand: added four feature-specific lines to "Always ask before" in AGENTS.md; kept the nine template lines because checks/ex2.mjs and the CI spec job check them

## 2026-11-23 · Always-ask test (Copilot)
- Goal: check that the agent stops before installing a dependency
- Delegated: switched to GitHub Copilot (agent mode, manual permissions) because Gemini had no quota left; asked it what AGENTS.md says under "Always ask before", then to install dayjs
- Checkpoints: it listed all 13 lines; before installing it stopped and quoted AGENTS.md ("ask before installing dependencies"); I answered No and dayjs is not in package.json
- Went wrong: nothing
- Changed by hand: nothing


## 2026-11-23 · Plan for Slice 2: event registration (Copilot)
- Goal: a one-page plan before any code
- Delegated: the plan only, no file changes
- Checkpoints: reviewed that the rules live in the service, that 401 is in the route before the service and 403 comes from the service, and that nothing unrequested slipped in

### Final plan
Updated Slice 2 plan. Grounded in SPEC.md and AGENTS.md. No files changed.

1. Migrations and seed
   * Move src/db/schema.sql to src/db/migrations/001_init.sql.
   * Add 002_event_registration.sql to add CHECK (capacity > 0) on events, add registrations.created_at TIMESTAMPTZ NOT NULL DEFAULT now(), and add an index on registrations(event_id). Keep the existing unique (event_id, user_id) constraint.
   * Add a migration runner and npm run db:migrate to package.json. Track applied migrations and run numbered files in order, transactionally. Keep db:setup as the migration-then-seed command; its existing seed truncates tables, so it remains destructive.
   * Extend src/db/seed.js with a second member and one organizer, storing password hashes.
2. Data layer, service, and routes
   * Keep all SQL and transactions in src/db/. Provide withEventLock(eventId, fn): it starts a transaction, locks the event row, and supplies the locked event and transaction-scoped data operations to fn. The service checks event existence, date, duplicate registration, and capacity inside that callback before inserting. Concurrent attempts for one event serialize; the unique constraint also prevents duplicate rows.
   * Refactor src/services/event.service.js to accept injected data functions. It exposes listUpcomingEvents(userId), registerForEvent(eventId, userId), and cancelRegistration(registrationId, userId). Listing includes each member's registration state. Registration returns 404 for a missing event; 409 for a past event ("This event has already started"), an existing registration ("You are already registered"), or full capacity ("This event is full"); success returns "You are registered." Check duplicate registration before capacity. Cancellation returns 404 if missing; the service checks ownership and reports forbidden (mapped to 403 by the route) before deleting.
   * POST /api/events/:eventId/registrations: 201, 400 invalid ID, 401 no session, 404, 409, 500. DELETE /api/registrations/:registrationId: 200, 400, 401, 403, 404, 500. Session checks happen before the service; unauthenticated requests return JSON 401 without data changes. GET /api/events: 200, 401, 500. /events: 200 signed in, 302 redirect to /login otherwise; a registration attempt receiving API 401 redirects the UI to /login (AC-8).
3. App, UI, and tests
   * Split src/server.js: src/app.js builds the Express app with injected services and session configuration; server.js configures production dependencies and listens.
   * Set npm test to Node's built-in test runner. CI has no database: service tests use in-memory data fakes, while route tests send real HTTP requests to the app with fake data and an in-memory session store.
   * Put event-list state presentation (loading, event list and buttons, empty, error) in pure src/public/js/events-view.js; test it directly with node:test, with no DOM library or added dependency. The page uses that module and retains loading, "No upcoming events yet. Check back later.", and "Could not load events. Please try again." as distinct states.
   * test/services/event.service.test.js: AC-1, AC-2, AC-3, AC-13, AC-14, AC-16, AC-17; include a concurrent-capacity case. A fake can test service coordination, but only a PostgreSQL run can verify the actual row lock.
   * test/routes/event.routes.test.js: AC-1, AC-2, AC-3, AC-8, AC-9, AC-10, AC-11, AC-12, AC-14, AC-15, AC-16, AC-17. Use signed-in and visitor sessions; cover page redirects, the three-event fixture, fresh catalog data after a fake deletion, registration responses, and unchanged data on failure.
   * test/ui/events.test.js: AC-2, AC-8, AC-13, AC-18, AC-19. Assert registration/cancellation feedback, login redirect behavior, and the exact empty/error messages. Every test title names its AC.
- Went wrong: the first plan would have needed a DOM library for UI tests and left the transaction placement unclear
- Changed by hand: –


## 2026-11-23 · Slice 2: build (Copilot)
- Goal: build event registration step by step, committing after each working step
- Delegated: step 1, migrations (001_init.sql, 002_event_registration.sql, runner, npm run db:migrate, extra seed users); step 2, service tests first, then the service and data functions
- Checkpoints:
  - step 1: db:migrate ran twice on a fresh empty database without errors; schema_migrations lists 001 and 002; registrations has created_at, the event_id index and UNIQUE (event_id, user_id); db:setup seeds 3 users and 3 events; check.mjs 12/12, ex2 32/32; committed
  - step 2: after the service, npm test pass 7, fail 0; service has no SQL; BEGIN and FOR UPDATE are in src/db/event.db.js; tests unchanged; committed
- Went wrong: the plan promised a concurrent-capacity test in the service tests, but none was written (a fake cannot prove the row lock anyway; FOR UPDATE is in src/db/event.db.js)
- Changed by hand: –

## 2026-11-25 · Slice 2: API, UI, MCP and organizer start (Copilot)
- Goal: finish event registration (steps 3 to 9 of Exercise 3), expose it through MCP, and start the organizer features and sign-up (AC-4 to AC-7)
- Delegated: src/app.js and src/server.js split; POST /api/events/:eventId/registrations and DELETE /api/registrations/:registrationId with HTTP tests; the authorization tests; the events page with events-view.js and its tests; the three MCP tools with a hashed MCP_TOKEN lookup; the organizer plan and migration 004
- Checkpoints:
  - step 3: listen only in src/server.js; the route checks the session first (401), parses ids (400), calls the service and maps error codes to 403/404/409, with no rules of its own; npm test pass 22, fail 0; npm start works; committed
  - step 4: AC-15 now uses a spy service and asserts it is never called without a session; AC-14 asserts the 403 comes from the service's forbidden error; routes and service unchanged; npm test pass 22, fail 0; committed
  - step 5: events-view.js is a pure module (no fetch, document or window); events.html stays in src/views/; npm test pass 28, fail 0; in the browser: registered and cancelled with the API messages and updated free places; blocked /api/events in DevTools and saw "Could not load events. Please try again." (AC-19); deleted all events and saw "No upcoming events yet. Check back later." (AC-18); committed
  - step 6: commented out the capacity rule in event.service.js; npm test failed exactly the two AC-1 tests (route: 201 instead of 409; service: missing EVENT_FULL rejection), the other 26 passed; restored with git restore, npm test pass 28; pushed; CI test, mcp and spec jobs green, coverage red as expected until Exercise 4
  - step 7: by hand with curl, two users, cookies in /tmp (deleted afterwards), the Yoga event set to capacity 1: A registers 201; B on the full event 409 "This event is full"; no cookie 401; B cancels A's registration 403; no cookie on cancel 401
  - step 8: wrote the architecture note in SPEC.md; then asked Copilot only to check the named files; it found one wrong sentence (the UNIQUE constraint comes from migration 001, not 002), which I corrected; no files changed by the agent
  - step 9: read the whole feature diff since ab22335 (git diff --stat and git diff): 21 files, 1535 insertions, 134 deletions; summary in "Какво направи агентът без моя поръчка" below
  - MCP: three tools list_upcoming_events, register_for_event, cancel_registration call event.service.js; caller found by a SHA-256 hash of MCP_TOKEN (migration 003); a real run against the database listed the three events, a wrong argument and a missing token returned isError results; check.mjs 12/12; committed
  - organizer and sign-up plan (AC-4 to AC-7): migration 004 for events.organizer_id, createEvent and listAttendees in event.service.js with role and ownership checks, signup in auth.service.js with the existing hashPassword. Променено при прегледа: the data layer maps a duplicate email to EMAIL_TAKEN so the service never sees PostgreSQL error codes; createEvent validates title, capacity and a future date in the service and returns 400 instead of a database error
  - organizer and sign-up, step 1: migration 004 adds events.organizer_id, backfills it and then sets NOT NULL; on a fresh empty database all four migrations applied in order; db:setup gives all three seeded events organizer@example.com; committed
  - organizer and sign-up, step 2: service tests for AC-4 to AC-7 written first, 6 new tests failed (createEvent, listEventAttendees, createAuthService missing) while the old ones passed; then the service and data functions: npm test pass 47, fail 0; no SQL or PostgreSQL codes in the services; user.db.js maps 23505 to EMAIL_TAKEN; signup uses hashPassword; tests unchanged; committed
  - organizer and sign-up, step 3: POST /api/events, GET /api/events/:eventId/attendees and POST /api/auth/signup with HTTP tests for AC-4 to AC-7; npm test pass 53, fail 0; no role or organizer checks in the routes; login still regenerates the session; by hand with curl: sign-in 200, sign-up 201, the same email again 409, the password stored as a hash; committed
- Went wrong: Copilot also filled the Traceability table in SPEC.md, which I did not ask for and which listed only the route tests; the test for cancelling an owned registration has no AC-13 in its title; in step 5 it changed one assertion in the AC-10 route test (from fetch('/api/events') in events.html to loading events-view.js and events.js, because the fetch moved as the plan required; the other AC-10 assertions are unchanged) and added a service test I did not ask for; a real MCP run with the database showed "MCP_TOKEN is not set" because the MCP server never loaded .env, which the fake-service tests could not catch, so it now loads .env with dotenv in quiet mode and nothing reaches stdout; ex3.mjs flagged "MCP writes its own queries" because the data-layer file src/db/mcp-token.db.js had "mcp" in its name, so it was renamed to caller-token.db.js (mcp-server/ has no SQL)
- Changed by hand: undid the Traceability change in SPEC.md; wrote the architecture note in SPEC.md; ran the step 7 checks with curl; added MCP_TOKEN to .env myself (the agent never read .env)

## Какво направи агентът без моя поръчка (What the agent did unasked)
Read with `git diff --stat ab22335 HEAD` and `git diff ab22335 HEAD` (ab22335 is the last Exercise 2 commit): 21 files changed, 1535 insertions, 134 deletions; every file is one the plan named.

- Extra files: none. `src/db/schema.sql` was moved to `src/db/migrations/001_init.sql` (git shows it as a rename with 4 changed lines, the removed `WITH (OIDS=FALSE)` among them); I first misread the editor's view of the move as a leftover file.
- Extra test: in step 5 Copilot added a service test, "listUpcomingEvents passes the member id through to the data layer", that I did not ask for. Kept, because it checks that the Cancel button gets the right member's registration.
- Changed tests: in step 4 it strengthened the existing AC-15 route test with a spy service instead of adding a new test (kept, because it only adds the check that the service is never called); in step 5 it replaced one assertion in the AC-10 route test, from "events.html contains fetch('/api/events')" to "the page loads events-view.js and events.js", because the fetch moved into events.js as the plan required (kept; the other AC-10 assertions are unchanged).
- Unasked spec change: in step 3 it filled the Traceability table in `SPEC.md` with only the route test file. Removed with Undo; I fill the table myself.
- Missing work: the plan promised a concurrent-capacity test in the service tests, but none was written. Not added: a fake cannot prove the row lock; the lock is `SELECT … FOR UPDATE` in `src/db/event.db.js`.
- Additions approved in the plan: 400 for an invalid id, and each event's `registrationId` for the signed-in member so the page knows what Cancel deletes. Kept.
- Dependencies: none added; `package.json` only got the `db:migrate` and `test` scripts I asked for.