import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { initSchema, getUserByUsername, createUser, upsertBestScore, getUserScores } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const token = req.cookies['auth_token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function validateSignup(body) {
  const errors = {};
  const { firstName, lastName, username, password } = body;

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2 || firstName.trim().length > 50) {
    errors.firstName = 'First name must be 2-50 characters';
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 2 || lastName.trim().length > 50) {
    errors.lastName = 'Last name must be 2-50 characters';
  }
  const uname = (username || '').trim();
  if (!uname || uname.length < 4 || uname.length > 20 || !/^[a-zA-Z0-9]+$/.test(uname)) {
    errors.username = 'Username must be 4-20 alphanumeric characters';
  }
  const pw = password || '';
  const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
  if (!complexity.test(pw)) {
    errors.password = 'Password must be 8+ chars including upper, lower, number, symbol';
  }
  return errors;
}

app.post('/api/auth/signup', async (req, res) => {
  const errors = validateSignup(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const username = req.body.username.trim();
  const existing = await getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ errors: { username: 'Username already taken' } });
  }

  const hash = await bcrypt.hash(req.body.password, 12);
  await createUser({
    firstName: req.body.firstName.trim(),
    lastName: req.body.lastName.trim(),
    username,
    passwordHash: hash,
  });
  return res.status(201).json({ message: 'Signup successful' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  const user = await getUserByUsername(String(username).trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken({ id: user.id, username: user.username, firstName: user.first_name, lastName: user.last_name });
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return res.json({ message: 'Login successful', user: { username: user.username, firstName: user.first_name, lastName: user.last_name } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

// Scores API
app.get('/api/scores/me', authMiddleware, async (req, res) => {
  try {
    const scores = await getUserScores(req.user.id);
    return res.json({ scores });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

app.post('/api/scores/update', authMiddleware, async (req, res) => {
  const { mode, score } = req.body || {};
  const validModes = ['beginner', 'intermediate', 'professional'];
  if (!validModes.includes(mode)) return res.status(400).json({ error: 'Invalid mode' });
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0) return res.status(400).json({ error: 'Invalid score' });
  try {
    const result = await upsertBestScore(req.user.id, req.user.username, mode, numericScore);
    return res.json({ bestScore: result.best_score });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update score' });
  }
});

let server;
// Initialize database schema in all environments
initSchema().catch(err => console.error('Database initialization failed', err));
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Auth server running at http://localhost:${PORT}`);
  });
}

export { app, server };

module.exports = app;