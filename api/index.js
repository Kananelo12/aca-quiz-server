const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http');
const { signUp, signIn, signOut, getCurrentUser } = require("../auth.action");

const app = express();

// ─── MANUAL CORS MIDDLEWARE ──────────────────────────────────────
// This will echo back the request's Origin header on every response
// and handle OPTIONS preflight in one shot.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow your production front‑end and localhost dev
  if (origin === 'https://joel-aca-erp2025-quiz.vercel.app' ||
      origin === 'http://localhost:3001') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    // OPTIONS preflight: respond immediately
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Define your endpoints
app.post('/api/signup', async (req, res) => {
  const result = await signUp(req.body);
  res.json(result);
});


app.post('/api/signin', async (req, res) => {
  const { email, idToken } = req.body;
  const sessionCookie = await signIn({ email, idToken });
  // set the cookie via Express
  res.cookie('session', sessionCookie, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true });
});

app.post('/api/signout', async (_req, res) => {
  await signOut();
  res.sendStatus(204);
});

app.get('/api/me', async (req, res) => {
  const user = await getCurrentUser(req);
  res.json(user);
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!', data: [1, 2, 3, 4, 5] });
});

app.get('/', (req, res) => {
  res.send('Welcome to the ACA Quiz API!');
});

// If running directly (not via Vercel), start a normal HTTP server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`▶️  Server listening at http://localhost:${PORT}`);
  });
}

// Wrap in serverless for Vercel
module.exports = serverless(app);
