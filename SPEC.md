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

## Constraints
- Node with Express, PostgreSQL, plain HTML and JavaScript in the UI.
- Passwords are stored only as a hash, never as readable text.

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

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->
- [AC-1] A member opens the details page of an event with no free places and presses **Register**, sees "This event is full", and no new row appears in `registrations`.
- [AC-2] A member opens the details page of an event with free places and presses **Register**, sees "You are registered", and a row for that member and event appears in `registrations`.
- [AC-3] A member who is already registered opens the event's details page and presses **Register** again, sees "You are already registered", and only one row for that member and event remains in `registrations`.
- [AC-4] An organizer creates an event with a title, date and capacity, sees it in the event list, and a matching row appears in `events`.
- [AC-5] An organizer opens the attendee list for their event, sees the registered members, and those members match the rows in `registrations` for that event.
- [AC-6] A member who is not an organizer sends a request to create an event, receives **403 Forbidden**, and no new row appears in `events`.
- [AC-7] A member creates an account with a password, sees confirmation that the account was created, and the database stores a hash rather than the readable password.
- [AC-8] A visitor who is not signed in tries to register for an event, is redirected to `/login`, and no new row appears in `registrations`.

### Slice 1: sign-in and event list
- [AC-9] A visitor who opens `/events` without signing in lands on `/login` instead.
- [AC-10] After signing in with a seeded account, `/events` shows the three seeded events, each with its title, date and number of free places.
- [AC-11] Deleting one event row in the database and reloading `/events` removes that event from the screen.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 |  |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
