import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../prisma';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || '',
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error('No email found from Google profile'), false);
        }

        const existingUser = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (existingUser) {
          // Update tokens and user info
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              accessToken,
              refreshToken: refreshToken || existingUser.refreshToken, // keep old if not provided
              name: profile.displayName,
              email: email,
            },
          });
          return done(null, updatedUser);
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            googleId: profile.id,
            email: email,
            name: profile.displayName,
            accessToken,
            refreshToken,
          },
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;
