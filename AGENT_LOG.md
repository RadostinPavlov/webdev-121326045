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