const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const serverless = require('serverless-http');
const { signUp, signIn, signOut, getCurrentUser, db } = require("../auth.action");
console.log("🔥 Firestore db instance:", db ? "OK" : "MISSING");

const app = express();

const cors = require("cors");

const corsOptions = {
  origin: [
    'http://localhost:3001', // Local development
    'https://joel-aca-erp2025-quiz.vercel.app', // Production
  ],
  credentials: true, // Allow cookies to be sent
}

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
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

// Submit a quiz result
app.post('/api/submit-quiz', async (req, res) => {
  console.log("📝 /api/submit-quiz received:", req.body);
  const { userId, score, total, timestamp, message } = req.body;
  try {
    // Each user’s submissions live under /users/{uid}/submissions
    await db
      .collection('users')
      .doc(userId)
      .collection('submissions')
      .add({ score, total, timestamp, message });
    res.json({ success: true });
  } catch (err) {
    console.error('submit-quiz error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get the latest submission for the current user
app.get('/api/user-summary', async (req, res) => {
  // req.cookies.session → decoded in getCurrentUser
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ message: 'Not signed in' });

  try {
    const subsRef = db
      .collection('users')
      .doc(user.id)
      .collection('submissions')
      .orderBy('timestamp', 'desc')
      .limit(1);
    const snap = await subsRef.get();
    if (snap.empty) return res.json(null);
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('user-summary error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    // 1) Fetch all users
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2) For each user, get their best score
    const leaderboard = await Promise.all(users.map(async user => {
      const subs = await db
        .collection('users').doc(user.id)
        .collection('submissions')
        .orderBy('score', 'desc')
        .limit(1)
        .get();
      if (subs.empty) return null;
      const top = subs.docs[0].data();
      return {
        id: user.id,
        name: user.name,
        score: top.score
      };
    }));

    // 3) Filter out users with no submissions & sort descending
    const sorted = leaderboard
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    res.json(sorted);
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ message: 'Server error' });
  }
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
