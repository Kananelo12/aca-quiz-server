const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http');
const { signUp, signIn, signOut, getCurrentUser } = require('./auth.action');

const app = express();
const cors = require("cors");

// Simplified CORS: whitelist both dev and prod origins
// app.use(cors({
//   origin: [
//     'http://localhost:3001',                // CRA dev
//     'https://joel-aca-erp2025-quiz.vercel.app' // prod CRA
//   ],
//   methods: ['GET','POST','OPTIONS'],
//   allowedHeaders: ['Content-Type'],
//   credentials: true
// }));

app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow cookies to be sent
}))

// Ensure preflight (OPTIONS) requests are handled
// app.options('*', cors({
//   origin: [
//     'http://localhost:3001',
//     'https://joel-aca-erp2025-quiz.vercel.app'
//   ],
//   credentials: true
// }));

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

// Wrap in serverless for Vercel
module.exports = serverless(app);
