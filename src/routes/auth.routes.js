const express = require('express');
const authService = require('../services/auth.service');

function createAuthRouter(injectedAuthService = authService) {
    const router = express.Router();

    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await injectedAuthService.login(email, password);
            if (user) {
                return req.session.regenerate((err) => {
                    if (err) {
                        console.error('Session regeneration error:', err);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    req.session.user = user;
                    return res.json({ message: 'Logged in successfully', user });
                });
            }
            return res.status(401).json({ error: 'Invalid email or password' });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/signup', async (req, res) => {
        const { email, password } = req.body;
        if (
            typeof email !== 'string' ||
            !email.trim() ||
            typeof password !== 'string' ||
            !password
        ) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await injectedAuthService.signup(email.trim(), password);
            return res.status(201).json({ message: 'Account created', user });
        } catch (error) {
            if (error.code === 'EMAIL_TAKEN') {
                return res.status(409).json({ error: error.message });
            }
            console.error('Signup error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/logout', (req, res) => {
        req.session.destroy((error) => {
            if (error) {
                console.error('Logout error:', error);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.clearCookie('connect.sid');
            return res.json({ message: 'Logged out successfully' });
        });
    });

    router.get('/me', (req, res) => {
        if (req.session.user) {
            return res.json({ user: req.session.user });
        }
        return res.status(401).json({ error: 'Not signed in' });
    });

    return router;
}

module.exports = { createAuthRouter };
