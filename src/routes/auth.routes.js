const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await authService.login(email, password);
        if (user) {
            return req.session.regenerate((err) => {
                if (err) {
                    console.error('Session regeneration error:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                req.session.user = user;
                return res.json({ message: 'Logged in successfully', user });
            });
        } else {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.clearCookie('connect.sid');
        return res.json({ message: 'Logged out successfully' });
    });
});

router.get('/me', (req, res) => {
    if (req.session.user) {
        return res.json({ user: req.session.user });
    } else {
        return res.status(401).json({ error: 'Not signed in' });
    }
});

module.exports = router;
