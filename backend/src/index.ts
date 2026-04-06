import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailRoutes from './routes/email';
import authRoutes from './routes/auth';
import passport from './services/passport';
import session from 'express-session';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/emails', emailRoutes);
app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.send('Scheduler backend API is up');
});

app.listen(PORT, () => {
  console.log(`Express API listening on port ${PORT}`);
});
