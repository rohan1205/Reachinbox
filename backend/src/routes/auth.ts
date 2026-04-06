import { Router } from 'express';
import passport from 'passport';

const router = Router();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initiate google login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    accessType: 'offline', // needed to get refresh token
    prompt: 'consent' // ensures refresh token is given every time
  })
);

// Callback after google has authenticated the user
router.get(
  '/google/callback', // Note: this will be mapped onto /auth/google/callback in index.ts
  passport.authenticate('google', {
    failureRedirect: `${frontendUrl}/?error=auth_failed`,
  }),
  (req, res) => {
    res.redirect(`${frontendUrl}/dashboard`);
  }
);

// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(frontendUrl);
  });
});

// Status check (useful for frontend to see who is logged in)
router.get('/status', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user,
    });
  } else {
    res.json({
      isAuthenticated: false,
      user: null,
    });
  }
});

export default router;
