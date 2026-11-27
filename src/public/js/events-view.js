(function (root, factory) {
    const view = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = view;
    } else {
        root.EventsView = view;
    }
}(globalThis, function () {
    const emptyMessage = 'No upcoming events yet. Check back later.';
    const errorMessage = 'Could not load events. Please try again.';
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => htmlEscapes[character]);
    }

    function renderFeedback(message) {
        return message
            ? `<p class="feedback" role="status">${escapeHtml(message)}</p>`
            : '';
    }

    function renderEvent(event) {
        const registered = event.registration_id !== null &&
            event.registration_id !== undefined;
        const action = registered ? 'cancel' : 'register';
        const identifier = registered ? event.registration_id : event.id;
        const identifierName = registered ? 'registration' : 'event';
        const date = String(event.date ?? '');
        const parsedDate = new Date(date);
        const displayDate = Number.isNaN(parsedDate.getTime())
            ? date
            : parsedDate.toLocaleString();
        const buttonLabel = registered ? 'Cancel registration' : 'Register';

        return `<article class="event-card">
            <h2 class="event-title">${escapeHtml(event.title)}</h2>
            <p class="event-details">
                <time datetime="${escapeHtml(date)}">${escapeHtml(displayDate)}</time><br>
                Free places: ${escapeHtml(event.free_places)} / ${escapeHtml(event.capacity)}
            </p>
            <button type="button" data-action="${action}" data-${identifierName}-id="${escapeHtml(identifier)}">${buttonLabel}</button>
        </article>`;
    }

    function render(state) {
        if (!state || typeof state.status !== 'string') {
            throw new TypeError('An event view state is required');
        }

        const feedback = renderFeedback(state.message);

        switch (state.status) {
            case 'loading':
                return `${feedback}<p role="status">Loading events...</p>`;
            case 'empty':
                return `${feedback}<p role="status">${emptyMessage}</p>`;
            case 'error':
                return `${feedback}<p role="alert">${errorMessage}</p>`;
            case 'list':
                if (!Array.isArray(state.events)) {
                    throw new TypeError('Event list state requires an events array');
                }
                if (state.events.length === 0) {
                    return `${feedback}<p role="status">${emptyMessage}</p>`;
                }
                return `${feedback}<div class="event-grid">${state.events.map(renderEvent).join('')}</div>`;
            default:
                throw new TypeError(`Unsupported event view state: ${state.status}`);
        }
    }

    return { render };
}));
