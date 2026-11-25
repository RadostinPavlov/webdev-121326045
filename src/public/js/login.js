(function (root, factory) {
    const page = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = page;
    } else {
        root.LoginPage = page;
    }

    if (typeof document !== 'undefined') {
        page.mount(document, root);
    }
}(globalThis, function () {
    function createLoginPage({ fetch, redirect, showLoginMessage, showSignupMessage }) {
        async function login(email, password) {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();

                if (!response.ok) {
                    showLoginMessage(result.error || 'Login failed');
                    return;
                }
                redirect('/events');
            } catch (error) {
                console.error('Login request failed:', error);
                showLoginMessage('An error occurred. Please try again.');
            }
        }

        async function signup(email, password) {
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();

                if (!response.ok) {
                    showSignupMessage(result.error || 'Sign-up failed');
                    return;
                }
                showSignupMessage(result.message || 'Account created');
            } catch (error) {
                console.error('Sign-up request failed:', error);
                showSignupMessage('An error occurred. Please try again.');
            }
        }

        return { login, signup };
    }

    function mount(document, root) {
        const loginMessage = document.getElementById('loginMessage');
        const signupMessage = document.getElementById('signupMessage');
        const page = createLoginPage({
            fetch: root.fetch.bind(root),
            redirect(path) {
                root.location.href = path;
            },
            showLoginMessage(message) {
                loginMessage.textContent = message;
            },
            showSignupMessage(message) {
                signupMessage.textContent = message;
            }
        });

        document.getElementById('loginForm').addEventListener('submit', (event) => {
            event.preventDefault();
            page.login(
                document.getElementById('loginEmail').value,
                document.getElementById('loginPassword').value
            );
        });

        document.getElementById('signupForm').addEventListener('submit', (event) => {
            event.preventDefault();
            page.signup(
                document.getElementById('signupEmail').value,
                document.getElementById('signupPassword').value
            );
        });
    }

    return { createLoginPage, mount };
}));
