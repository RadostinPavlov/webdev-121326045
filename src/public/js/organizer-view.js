(function (root, factory) {
    const view = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = view;
    } else {
        root.OrganizerView = view;
    }
}(globalThis, function () {
    const escapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => escapes[character]);
    }

    function renderAttendees(event, attendeeState) {
        if (!attendeeState || attendeeState.status === 'loading') {
            return '<p role="status">Loading attendees...</p>';
        }
        if (attendeeState.status === 'empty') {
            return '<p role="status">No attendees registered yet.</p>';
        }
        if (attendeeState.status === 'error') {
            return `<p role="alert">${escapeHtml(attendeeState.message || 'Could not load attendees. Please try again.')}</p>`;
        }

        return `<ul>${attendeeState.attendees.map((attendee) =>
            `<li>${escapeHtml(attendee.email)}</li>`
        ).join('')}</ul>`;
    }

    function render(state) {
        if (!state || state.visible !== true) {
            return '';
        }

        const message = state.message
            ? `<p role="status">${escapeHtml(state.message)}</p>`
            : '';
        const events = state.events ?? [];

        return `<h2 id="organizerHeading">Organizer</h2>
            ${message}
            <form data-form="create-event">
                <h3>Create event</h3>
                <label for="eventTitle">Title</label>
                <input id="eventTitle" name="title" type="text" required>
                <label for="eventDate">Date and time</label>
                <input id="eventDate" name="date" type="datetime-local" required>
                <label for="eventCapacity">Capacity</label>
                <input id="eventCapacity" name="capacity" type="number" min="1" step="1" required>
                <button type="submit">Create event</button>
            </form>
            <div class="organizer-events">
                ${events.length === 0
                    ? '<p>No events to manage yet.</p>'
                    : events.map((event) => {
                        const attendeeState = state.attendees?.[event.id];
                        return `<article class="organizer-event">
                            <h3>${escapeHtml(event.title)}</h3>
                            <h4>Attendees</h4>
                            <div class="attendee-list" data-event-id="${escapeHtml(event.id)}">
                                ${renderAttendees(event, attendeeState)}
                            </div>
                        </article>`;
                    }).join('')}
            </div>`;
    }

    return { render };
}));
