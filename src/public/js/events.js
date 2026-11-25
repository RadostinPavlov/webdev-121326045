(function (root, factory) {
    const page = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = page;
    } else {
        root.EventsPage = page;
    }

    if (typeof document !== 'undefined') {
        page.mount(document, root);
    }
}(globalThis, function () {
    function createEventsPage({ fetch, render, redirect, renderOrganizer = () => {} }) {
        let events = [];
        let currentUser = null;
        let organizerState = { visible: false };

        function present(state) {
            render(state);
        }

        function presentOrganizer(state) {
            organizerState = state;
            renderOrganizer(state);
        }

        async function loadAttendees(organizerEvents, message) {
            const attendees = Object.fromEntries(
                organizerEvents.map((event) => [event.id, { status: 'loading' }])
            );
            presentOrganizer({
                visible: true,
                events: organizerEvents,
                attendees,
                message
            });

            await Promise.all(organizerEvents.map(async (event) => {
                try {
                    const response = await fetch(
                        `/api/events/${encodeURIComponent(event.id)}/attendees`
                    );
                    if (response.status === 401) {
                        redirect('/login');
                        return;
                    }
                    if (!response.ok) {
                        let message = 'Could not load attendees. Please try again.';
                        try {
                            const result = await response.json();
                            message = result.error || message;
                        } catch {
                            // Keep the readable fallback when the error response is not JSON.
                        }
                        attendees[event.id] = { status: 'error', message };
                    } else {
                        const result = await response.json();
                        if (!Array.isArray(result)) {
                            throw new TypeError('The attendee response must be an array');
                        }
                        attendees[event.id] = {
                            status: result.length ? 'list' : 'empty',
                            attendees: result
                        };
                    }
                } catch (error) {
                    console.error('Could not load event attendees:', error);
                    attendees[event.id] = {
                        status: 'error',
                        message: 'Could not load attendees. Please try again.'
                    };
                }
                presentOrganizer({
                    visible: true,
                    events: organizerEvents,
                    attendees,
                    message
                });
            }));
        }

        async function loadEvents(message = '') {
            present({ status: 'loading', events, message });

            try {
                const response = await fetch('/api/events');
                if (response.status === 401) {
                    redirect('/login');
                    return;
                }
                if (!response.ok) {
                    present({ status: 'error', events: [], message });
                    return;
                }

                const result = await response.json();
                if (!Array.isArray(result)) {
                    throw new TypeError('The event catalog response must be an array');
                }

                events = result;
                present({
                    status: events.length ? 'list' : 'empty',
                    events,
                    message
                });
                if (currentUser?.role === 'organizer') {
                    const organizerEvents = events.filter(
                        (event) => event.organizerId === currentUser.id
                    );
                    await loadAttendees(organizerEvents, message);
                } else {
                    presentOrganizer({ visible: false });
                }
            } catch (error) {
                console.error('Could not load events:', error);
                present({ status: 'error', events: [], message });
                if (currentUser?.role === 'organizer') {
                    presentOrganizer({
                        visible: true,
                        status: 'error',
                        events: [],
                        attendees: {},
                        message: 'Could not load organizer events. Please try again.'
                    });
                }
            }
        }

        async function sendRegistrationRequest(url, method) {
            try {
                const response = await fetch(url, { method });
                if (response.status === 401) {
                    redirect('/login');
                    return;
                }

                const result = await response.json();
                const message = result.message || result.error;
                if (!response.ok) {
                    if (typeof message !== 'string') {
                        throw new TypeError('The registration response must include a message');
                    }
                    present({
                        status: events.length ? 'list' : 'empty',
                        events,
                        message
                    });
                    return;
                }
                if (typeof result.message !== 'string') {
                    throw new TypeError('A successful registration response must include a message');
                }

                await loadEvents(result.message);
            } catch (error) {
                console.error('Could not update event registration:', error);
                present({
                    status: events.length ? 'list' : 'empty',
                    events,
                    message: 'Could not complete the request. Please try again.'
                });
            }
        }

        return {
            async loadEvents(user = currentUser) {
                currentUser = user;
                await loadEvents();
            },
            async createEvent(event) {
                try {
                    const response = await fetch('/api/events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(event)
                    });
                    if (response.status === 401) {
                        redirect('/login');
                        return;
                    }

                    const result = await response.json();
                    if (!response.ok) {
                        presentOrganizer({
                            ...organizerState,
                            message: result.error || 'Could not create event.'
                        });
                        return;
                    }

                    await loadEvents(result.message || 'Event created');
                } catch (error) {
                    console.error('Could not create event:', error);
                    presentOrganizer({
                        ...organizerState,
                        message: 'Could not create event. Please try again.'
                    });
                }
            },
            register(eventId) {
                return sendRegistrationRequest(
                    `/api/events/${encodeURIComponent(eventId)}/registrations`,
                    'POST'
                );
            },
            cancel(registrationId) {
                return sendRegistrationRequest(
                    `/api/registrations/${encodeURIComponent(registrationId)}`,
                    'DELETE'
                );
            }
        };
    }

    function mount(document, root) {
        const container = document.getElementById('eventsList');
        const organizerContainer = document.getElementById('organizerSection');
        const logoutButton = document.getElementById('logoutBtn');
        const page = createEventsPage({
            fetch: root.fetch.bind(root),
            render(state) {
                container.innerHTML = root.EventsView.render(state);
            },
            renderOrganizer(state) {
                organizerContainer.innerHTML = root.OrganizerView.render(state);
                organizerContainer.hidden = state.visible !== true;
            },
            redirect(path) {
                root.location.href = path;
            }
        });

        container.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }
            if (button.dataset.action === 'register') {
                page.register(button.dataset.eventId);
            } else if (button.dataset.action === 'cancel') {
                page.cancel(button.dataset.registrationId);
            }
        });

        organizerContainer.addEventListener('submit', (event) => {
            if (event.target.matches('form[data-form="create-event"]')) {
                event.preventDefault();
                const formData = new FormData(event.target);
                page.createEvent({
                    title: formData.get('title'),
                    date: new Date(formData.get('date')).toISOString(),
                    capacity: Number(formData.get('capacity'))
                });
            }
        });

        logoutButton.addEventListener('click', async () => {
            try {
                const response = await root.fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                    root.location.href = '/login';
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });

        root.fetch('/api/auth/me')
            .then(async (response) => {
                if (response.status === 401) {
                    root.location.href = '/login';
                    return null;
                }
                if (!response.ok) {
                    throw new Error('Could not load the signed-in user');
                }
                const result = await response.json();
                return result.user;
            })
            .then((user) => {
                if (user) {
                    page.loadEvents(user);
                }
            })
            .catch((error) => {
                console.error('Could not load the signed-in user:', error);
                page.loadEvents();
            });
    }

    return { createEventsPage, mount };
}));
