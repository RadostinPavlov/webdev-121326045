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

    function createAssistantState() {
        return {
            form: {
                title: '',
                date: '',
                time: '',
                capacity: '',
                description: '',
                venue: '',
                audience: '',
                notes: ''
            },
            description: { status: 'idle', message: '' },
            poster: { status: 'idle', message: '' }
        };
    }

    function transitionAssistantState(state, action) {
        const current = state ?? createAssistantState();
        switch (action.type) {
            case 'form-values':
                return {
                    ...current,
                    form: { ...current.form, ...action.values }
                };
            case 'description-loading':
                return {
                    ...current,
                    description: { status: 'loading', message: '' }
                };
            case 'description-result':
                return {
                    ...current,
                    form: { ...current.form, description: action.description },
                    description: {
                        status: 'idle',
                        message: action.message || ''
                    }
                };
            case 'description-error':
                return {
                    ...current,
                    description: {
                        status: 'error',
                        message: action.message
                    }
                };
            case 'poster-loading':
                return {
                    ...current,
                    poster: { status: 'loading', message: '' }
                };
            case 'poster-result':
                return {
                    ...current,
                    form: {
                        ...current.form,
                        title: action.fields.title,
                        date: action.fields.date,
                        time: action.fields.time,
                        capacity: action.fields.capacity === ''
                            ? ''
                            : String(action.fields.capacity),
                        venue: action.fields.venue
                    },
                    poster: {
                        status: 'idle',
                        message: action.message || ''
                    }
                };
            case 'poster-error':
                return {
                    ...current,
                    poster: {
                        status: 'error',
                        message: action.message
                    }
                };
            default:
                return current;
        }
    }

    function render(state) {
        if (!state || state.visible !== true) {
            return '';
        }

        const assistant = state.assistant ?? createAssistantState();
        const form = assistant.form;
        const message = state.message
            ? `<p role="status">${escapeHtml(state.message)}</p>`
            : '';
        const descriptionMessage = assistant.description.message
            ? `<p role="${assistant.description.status === 'error' ? 'alert' : 'status'}">${escapeHtml(assistant.description.message)}</p>`
            : '';
        const posterMessage = assistant.poster.message
            ? `<p role="${assistant.poster.status === 'error' ? 'alert' : 'status'}">${escapeHtml(assistant.poster.message)}</p>`
            : '';
        const events = state.events ?? [];

        return `<h2 id="organizerHeading">Organizer</h2>
            ${message}
            <form data-form="create-event">
                <h3>Create event</h3>
                <label for="eventTitle">Title</label>
                <input id="eventTitle" name="title" type="text" value="${escapeHtml(form.title)}" required>
                <label for="eventDate">Date</label>
                <input id="eventDate" name="date" type="date" value="${escapeHtml(form.date)}" required>
                <label for="eventTime">Time</label>
                <input id="eventTime" name="time" type="time" value="${escapeHtml(form.time)}">
                <label for="eventCapacity">Capacity</label>
                <input id="eventCapacity" name="capacity" type="number" min="1" step="1" value="${escapeHtml(form.capacity)}" required>
                <label for="eventVenue">Venue</label>
                <input id="eventVenue" name="venue" type="text" value="${escapeHtml(form.venue)}">
                <label for="eventAudience">Audience</label>
                <input id="eventAudience" name="audience" type="text" value="${escapeHtml(form.audience)}">
                <label for="eventNotes">Notes</label>
                <textarea id="eventNotes" name="notes">${escapeHtml(form.notes)}</textarea>
                <label for="eventDescription">Description suggestion (AI-assisted; review and edit before creating)</label>
                <textarea id="eventDescription" name="description">${escapeHtml(form.description)}</textarea>
                <button type="button" data-action="suggest-description"${assistant.description.status === 'loading' ? ' disabled' : ''}>
                    ${assistant.description.status === 'loading' ? 'Suggesting description...' : 'Suggest description'}
                </button>
                ${descriptionMessage}
                <label for="eventPoster">Poster (PNG or JPEG)</label>
                <input id="eventPoster" name="poster" type="file" accept="image/png,image/jpeg">
                <button type="button" data-action="extract-poster"${assistant.poster.status === 'loading' ? ' disabled' : ''}>
                    ${assistant.poster.status === 'loading' ? 'Extracting poster...' : 'Extract from poster'}
                </button>
                ${posterMessage}
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

    return { createAssistantState, transitionAssistantState, render };
}));
