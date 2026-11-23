# Instructions for the agent

Read this file at the start of every session. Keep it short and correct; update it when the project changes.

## Project
<!-- One or two sentences: what the app does and for whom. Link SPEC.md. -->
ClubEvents is a web app for club members to discover events, register for or cancel attendance, and get AI-assisted event information. Organizers use it to create and manage events and track capacity and attendees; see `SPEC.md` for goals, non-goals and acceptance criteria.

## Commands
<!-- How to install, run, test. Keep these exact and working. -->
- Install: npm install
- Run: npm start
- Test: npm test
- Database migrations: npm run db:migrate
- Database setup (migrates, then truncates and reseeds): npm run db:setup
- Coverage:
- MCP server: npm run --silent mcp

## Conventions
- Code lives in `src/`: `routes/` reads requests and returns status codes, `services/` holds all business rules (capacity, roles, ownership), `db/` is the only place with SQL, and `public/` holds the HTML, CSS and JS for the UI.
- Errors go to the client as JSON `{ "error": "message" }` with the matching status code: 400 bad input, 401 not signed in, 403 not allowed, 404 not found, 409 conflict (for example an event that is full).

## Layers
<!-- Fill in the file or folder for each layer. -->
Requests arrive two ways and both end in the same place:

- HTTP route handler → service → data access → database
- MCP tool → **the same service** → data access → database

A route handler reads the request and turns a result into a status code. A service holds the
rules and knows nothing about HTTP or about MCP. Only the data layer writes SQL. An MCP tool
that talks to the database directly is a second, unguarded way into your data: never add one.

## The model feature
<!-- Provider, env var, and the call site. -->
- The provider is named in exactly one file:
- The key comes from an environment variable and is never committed or logged.
- Every call has a timeout and a deterministic fallback, so the app still works when the provider is down or rate-limited.
- The model's output is re-checked against real data before anything is saved or shown.
- Tests never call the provider: they pass in a fake client.

## The MCP server
<!-- Where it lives and how it authenticates. -->
- Lives in `mcp-server/`, grew out of Exercise 1.
- Every tool calls a service function; none touches the data layer or the database directly.
- It carries a user, and enforces exactly the same authorization rules as the HTTP API.
- Adding a tool means adding a row to the table in `SPEC.md` too.

## Tests and coverage
- Every acceptance criterion in `SPEC.md` has an id like `AC-3`, and a test whose title contains that id.
- The coverage gate runs in CI: 100% of the service layer, 80% overall.
- A test is evidence. Changing a test so the code passes destroys the evidence.

## Always ask before
- deleting files or folders
- editing a migration that has already run
- installing or removing dependencies
- pushing, tagging or changing CI
- anything that touches secrets or `.env`
- changing an authentication or authorization rule
- adding, renaming or removing an MCP tool
- changing a coverage threshold
- sending user data to a third-party model
- running `npm run db:setup` (it empties and reseeds every table)
- changing the capacity, double-registration or past-event rule in the registration service
- changing what a route returns for 401, 403, 404 or 409
- adding a new table or column outside a new numbered migration file

## Never
- commit secrets, passwords, API keys or an OAuth client secret
- weaken or delete a test to make it pass
- lower a coverage threshold or switch off a CI job to make the build green
- add an MCP tool that reaches past the service layer
- log a prompt that contains somebody's personal data
