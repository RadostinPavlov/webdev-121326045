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
    function createEventsPage({ fetch, render, redirect }) {
        let events = [];

        function present(state) {
            render(state);
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
            } catch (error) {
                console.error('Could not load events:', error);
                present({ status: 'error', events: [], message });
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
            loadEvents,
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
        const logoutButton = document.getElementById('logoutBtn');
        const page = createEventsPage({
            fetch: root.fetch.bind(root),
            render(state) {
                container.innerHTML = root.EventsView.render(state);
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

        page.loadEvents();
    }

    return { createEventsPage, mount };
}));
