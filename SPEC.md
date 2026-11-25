# ClubEvents
<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option
<!-- One line: lab booking, study groups, club events, or the own project the lecturer approved. -->
Club events

## Goals
- Provide a centralized event catalog.
- Allow users to register and authenticate securely.
- Allow members to register for and cancel participation in events.
- Allow organizers to create, edit, and cancel events.
- Enforce event capacity restrictions.
- Provide organizers with participant information.
- Integrate AI assistance for generating event descriptions and extracting event information from posters.
- Provide a responsive and accessible user interface.


## Non-goals
- No payments: every event is free.
- No email or push notifications: members check the site.
- No mobile app: one web UI that also works on a phone screen.
- No cancellation deadline: a member can cancel their registration any time before the event.

## Constraints
- Node with Express, PostgreSQL, plain HTML and JavaScript in the UI.
- Passwords are stored only as a hash, never as readable text.
- Capacity is never exceeded, even when two members register for the last place at the same time.

## The model feature
<!-- Which model, which modality, and what it does for a user.
     Name three things or the check fails: the input it receives, the output it produces,
     and what happens when the model is slow, rate-limited or wrong. -->
- Model: Google Gemini API, called only from the server with `GEMINI_API_KEY`.
- Input: For description drafts, the organizer's event title, date, time, venue, audience and notes. For poster extraction, the uploaded poster image.
- Output: A suggested event description or structured event details extracted from the poster. Validate the output's format and values, check dates and capacity against the event data, and require organizer confirmation before saving.
- When it fails: Use a 10-second timeout. If the provider times out, is rate-limited, or returns invalid data, show a clear message and keep the manual event form usable without an AI suggestion. Never save unconfirmed model output.

## Auth
<!-- Local sign-in plus at least one provider. Say how an account signing in both ways stays one account. -->
- Local: Members sign up and sign in with email and password. Store passwords only as salted hashes using Node's `scrypt`; never store or log readable passwords.
- Provider: Sign in with Google using OAuth 2.0. Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in environment variables and handle the callback on the server.
- Linking: A signed-in member can link Google from account settings after re-entering their password. Link the Google provider ID to that member's existing user ID only when Google reports a verified email. Never merge accounts based only on matching email addresses; reject an identity that is already linked to another account.

## MCP tools
<!-- At least three tools your own MCP server exposes over this project's data.
     Each tool calls the same service functions the HTTP API calls, so the same rules apply.
     A description shorter than 20 characters is not a description. -->
| Tool | What it does | Who may call it |
| --- | --- | --- |
|`list_upcoming_events` | Lists upcoming events with their dates and remaining places. | Signed-in members |
| `register_for_event` | Registers the signed-in member for an event if places are available. | Signed-in members |
| `cancel_registration` | Cancels the signed-in member's registration for an event. | Signed-in members |
| `create_event` | Creates an event with a title, date and capacity limit. | Organizers |
| `update_event` | Updates the details of an event managed by the organizer. | Organizer of that event |
| `cancel_event` | Cancels an event managed by the organizer. | Organizer of that event |
| `list_event_attendees` | Lists the members registered for an event managed by the organizer. | Organizer of that event |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
- Stack: Plain HTML, CSS and vanilla JavaScript served by Express, with the Express API backed by PostgreSQL.
- Screens:
  1. Sign in and sign up with email/password or Google.
  2. Event catalog showing upcoming events, dates and available places.
  3. Event details where members can register or cancel their registration.
  4. Organizer dashboard to create, edit or cancel events, view attendees, and use AI to draft descriptions or extract details from a poster.
- The screens work on phone and desktop sizes and support keyboard navigation, visible focus, labeled inputs and readable contrast.

## Architecture
<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->
     ### One request: a member presses Register

**Browser**
1. View: `src/views/events.html` loads `src/public/js/events-view.js` and `src/public/js/events.js`. `events-view.js` is a pure module: given a state (loading, list, empty, error) it returns what to show, with no fetch and no DOM access.
2. State and REST call: `src/public/js/events.js` handles the click and sends `POST /api/events/:eventId/registrations` with the session cookie. ⚠️

**Server**
3. App: `src/app.js` builds the Express app, attaches the session from the PostgreSQL `session` table (connect-pg-simple), and mounts the routers.
4. Route: `src/routes/event.routes.js` checks `req.session.user` first and returns 401 without calling the service. It parses the event id (400 if invalid), calls `registerForEvent(eventId, userId)` and maps the service's error codes to status codes: EVENT_NOT_FOUND → 404, EVENT_STARTED, ALREADY_REGISTERED and EVENT_FULL → 409, otherwise 500. It holds no rule of its own.
5. Service: `src/services/event.service.js` holds the rules. Inside `withEventLock` it checks, in order, that the event exists, has not started, that the member is not already registered, and that a place is free; only then does it ask for the row to be inserted. It knows nothing about HTTP or SQL.
6. Data: `src/db/event.db.js` is the only layer with SQL. `withEventLock` opens a transaction, locks the event row with `SELECT … FOR UPDATE`, gives the service the locked event and the registration queries, and commits, or rolls back on any error. Two members asking for the last place are served one after the other.
7. Database: `events` and `registrations`. `UNIQUE (event_id, user_id)` (migration 001) and `CHECK (capacity > 0)` (migration 002) still hold if the code has a bug.

**Back to the browser**
The route answers 201 `{"message":"You are registered"}` or the error with its status. `events.js` shows the message, goes to `/login` on 401, and reloads the list so free places and the Register/Cancel button are current. ⚠️

### Where the code does not follow the layering
`src/db/seed.js` belongs to the data layer but imports `hashPassword` from `src/services/password.js`, so the data layer depends on the service layer, the opposite of the intended direction. I left it because the seed is a development script, not part of the request path; the right fix is to move the password helpers to a shared module such as `src/lib/password.js`.

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->
- [AC-1] A member opens the details page of an event with no free places and presses **Register**, receives 409 and sees "This event is full", and no new row appears in `registrations`.
- [AC-2] A member opens the details page of an event with free places and presses **Register**, sees "You are registered", and a row for that member and event appears in `registrations`.
- [AC-3] A member who is already registered opens the event's details page and presses **Register** again, receives 409 and sees "You are already registered", and only one row for that member and event remains in `registrations`.
- [AC-4] An organizer creates an event with a title, date and capacity, sees it in the event list, and a matching row appears in `events`.
- [AC-5] An organizer opens the attendee list for their event, sees the registered members, and those members match the rows in `registrations` for that event.
- [AC-6] A member who is not an organizer sends a request to create an event, receives **403 Forbidden**, and no new row appears in `events`.
- [AC-7] A member creates an account with a password, sees confirmation that the account was created, and the database stores a hash rather than the readable password.
- [AC-8] A visitor who is not signed in tries to register for an event, is redirected to `/login`, and no new row appears in `registrations`.

### Slice 1: sign-in and event list
- [AC-9] A visitor who opens `/events` without signing in lands on `/login` instead.
- [AC-10] After signing in with a seeded account, `/events` shows the three seeded events, each with its title, date and number of free places.
- [AC-11] Deleting one event row in the database and reloading `/events` removes that event from the screen.
- [AC-12] A visitor who opens the app's root URL `/` is sent to `/events`, and from there to `/login` when not signed in.

### Slice 2: event registration
- [AC-13] A member presses **Cancel registration** on an event they are registered for, sees "Registration cancelled", and their row for that event is gone from `registrations`.
- [AC-14] A signed-in member sends a request to cancel another member's registration, receives 403, and that registration row stays in `registrations`.
- [AC-15] A request to register or cancel without a session receives 401, and `registrations` does not change.
- [AC-16] A member sends a request to register for an event id that does not exist, receives 404, and no new row appears in `registrations`.
- [AC-17] A member sends a request to register for an event whose date has passed, receives 409 with "This event has already started", and no new row appears in `registrations`.
- [AC-18] A signed-in member opens `/events` when there are no upcoming events and sees "No upcoming events yet. Check back later."
- [AC-19] A signed-in member opens `/events` while the API is down and sees "Could not load events. Please try again." instead of an empty list.

### Slice 3: model feature
- [AC-20] An organizer fills in title, date and venue, presses **Suggest description**, and sees a draft in the description field that they can edit; no row changes in `events` until they press **Create**.
- [AC-21] When the model is unavailable (no key, timeout or rate limit), an organizer who presses **Suggest description** sees a template description and the note "Suggested without the model", and can still create the event by hand.
- [AC-22] An organizer uploads a PNG or JPEG poster and sees the extracted title, date, venue and capacity in the create form, ready to edit; no row changes in `events` until they press **Create**.
- [AC-23] When the poster gives a past date or a capacity that is not a positive whole number, that field stays empty in the form and the organizer sees which fields to fill in by hand.
- [AC-24] A member who is not an organizer sends a request for a description draft or a poster extraction and receives 403; a request without a session receives 401.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-2 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js`, `test/ui/events.test.js` |
| AC-3 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-4 | `test/routes/event.routes.test.js`, `test/services/event.service.test.js`, `test/ui/organizer.test.js` |
| AC-5 | `test/routes/event.routes.test.js`, `test/services/event.service.test.js`, `test/ui/organizer.test.js` |
| AC-6 | `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-7 | `test/routes/event.routes.test.js`, `test/services/auth.service.test.js`, `test/ui/login.test.js` |
| AC-8 | `test/routes/event.routes.test.js`, `test/ui/events.test.js` |
| AC-9 | `test/routes/event.routes.test.js` |
| AC-10 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js` |
| AC-11 | `test/routes/event.routes.test.js` |
| AC-12 | `test/routes/event.routes.test.js` |
| AC-13 | `test/mcp-server/server.test.js`, `test/services/event.service.test.js`, `test/ui/events.test.js` |
| AC-14 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-15 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/auth.service.test.js` |
| AC-16 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-17 | `test/mcp-server/server.test.js`, `test/routes/event.routes.test.js`, `test/services/event.service.test.js` |
| AC-18 | `test/ui/events.test.js` |
| AC-19 | `test/ui/events.test.js` |
| AC-20 | `test/routes/event.routes.test.js`, `test/services/model-assistance.service.test.js`, `test/ui/organizer.test.js` |
| AC-21 | `test/routes/event.routes.test.js`, `test/services/model-assistance.service.test.js`, `test/ui/organizer.test.js` |
| AC-22 | `test/routes/event.routes.test.js`, `test/services/model-assistance.service.test.js`, `test/ui/organizer.test.js` |
| AC-23 | `test/routes/event.routes.test.js`, `test/services/model-assistance.service.test.js`, `test/ui/organizer.test.js` |
| AC-24 | `test/routes/event.routes.test.js`, `test/services/model-assistance.service.test.js` |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
- AC-9 passed: `/events` without a session returns 302 to `/login`.
- AC-10 passed: after signing in, `/events` shows the three seeded events with title, date and free places.
- AC-11 passed: deleting the Yoga event in the database removed it from the page on reload.
- Missed: the agent added no route for `/`, so the app opened on "Cannot GET /". I added AC-12 to this spec, and the agent added the redirect.
- Found while checking AC-11: db:setup kept old sessions while recreating users with new ids, so a signed-in browser pointed at a user that no longer existed. The seed now also clears sessions and restarts ids.
- Reinterpreted: `npm run db:setup` empties and reseeds all tables instead of only adding missing rows, so it must never run against real data.
