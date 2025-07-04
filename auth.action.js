const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin once
const apps = getApps();
if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: "aca-quiz-app",
      clientEmail: "firebase-adminsdk-fbsvc@aca-quiz-app.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDWBwroObok/Zn9\nkWfP0M+CkAcGuAiX3z0J1QxymzugO+g/soYkbMMowox2SFoE5yTUq2v8Z1SUo6cu\nQXK4IHgG9fYD2b7zejLrNzZjaeKwKgXOavy+iD/a47B7Jyilnikt6EBpkrUyCOuT\nlaw2A7lRnFPSy/j/abPvfW513AKMAbNpcIXFi2JcagjSgH7BVVY3/lakq9aRnoCa\nPMZRmvAEKiaReY/z1K5ys7K2hfQcsqMDp8g3HWC93wHxdsxpqL2HA2H4nzj94NDS\nQKUDZS8kytLB/zi1MAbhTshqP2s6N/iV7cMa99H0Rs9pgcIzrnanezq98YuYg3sv\nMiaK/v5rAgMBAAECggEASwEm0mFAmawCJjmpzstXnWLKA5HE+SwzoNl3xkYebDXy\nWzg+CE/RSNx9Cwqp+WPjpV/5tPelTX3Ynb4z7ND8HzxdHdZWM89UPtgXiFlYJvJj\nHIaj0kW/Uv9OHqqHdRrrRXpJ8HWIaGN14z+lnTxK2o3VVl9DAIdTlo83gbg7cEKX\ny3d54SK5SLq6OMA0Ul1QQnWrColJsJX6NhoBKMceP0BQsZqttUDPIz7Y0zRy3pp4\nvf31UzUrzDn6EBtazw3u0Kqa8it6gJ3CWRWI97EIFUlD2sP/vMtZ1fdfP3c7OGkD\n0W+uk2LQb7DhNf6j5LIEsVOrg2WRABpKKYn/WPJdwQKBgQD8hQOTd1iJzNoeiJmi\nunYy7HguOZ9pf88mspAv+V8jKnEU+kKZyA+p771Jbz2rY3XCvFBybBXv/XT3LVhJ\nwjzzHc1M7fGgeP5otDJ4QJEf+5o5GRKOeCfpLaworX+2CC986YbYfEnzt8ypzBfa\nMkHB6hsxncFfBiV05AO5Pfa0iwKBgQDY+ja80W4P7mJ7nyI/MLVPPJxmi8sHBoLd\n3dzndasQRWb8rk5SL3ybJ6mOS489zKxhj5h7gsAGdHFUHqsIyRjoQ/0YRtSlNrvf\nuGa4s7EHTJNsQpc7sMC/48vw/x7Ylt9LZKtPkoC/1ZS4mq86JqeZcw7QO87iN7XM\nvEVvN/25oQKBgFTKfTbpHiu3Q455I82GeuYCjSBIbQTJy88cqlnRjGaMe8gleHOW\nv9u6Cn88ASMplIM9JG4naP5axwmwijLKLBkeaq9oPng56INT7pZ+Z7yriU+e4aJB\nKnWbxnEqQPXorblt2L+cjGBv2SMyyteThI0OhO8WH7Y+pBkp7y4mZk6dAoGBANcm\nXQqj/KgNcFg2toXELbTRXCCO85YWzcNkkPxugF6VAwcBbCYwcjWDgazYncPg5Pmk\nosWuI+0Cn7GS63O9vFXrvNbKvWbJvEedmTYC8EJVm0VZTo7guHBOWFazEwofqHEg\n9IHluob+KQdYUvKti7ksDv9Knt1P8pR+B7e95HihAoGBAMNrX+sTT3WRyy8TXKCB\nuUo+RaqKYJ9expYtjYmE4ct112ls+OG3DGhSAmPzUESRo9tZpvz4TqvG2YnAbscK\nz3i1imvaTatH1H2RrRh7t8eHuyGI6FfKNiW+jZEzBl8fL00N+VAEbIG3uh36gyhm\nbBT6euPH7701d2le/0ztejQI\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

// Sign up logic
async function signUp({ uid, name, email }) {
  const userDoc = db.collection('users').doc(uid);
  const snapshot = await userDoc.get();
  if (snapshot.exists) {
    return { success: false, message: 'User already exists. Please sign in instead.' };
  }
  await userDoc.set({ name, email });
  return { success: true, message: 'Account created successfully. Please sign in.' };
}

// Create session cookie
async function setSessionCookie(idToken) {
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: 7 * 24 * 60 * 60 * 1000 });
  return sessionCookie;
}

// Sign in logic
async function signIn({ email, idToken }) {
  // verify user exists
  await auth.getUserByEmail(email);
  return setSessionCookie(idToken);
}

// Sign out — no-op (cookie removal happens in Express handler via cookie-parser)
async function signOut() {
  return;
}

// Get current user data
async function getCurrentUser(req) {
  const sessionCookie = req.cookies.session;
  if (!sessionCookie) return null;

  try {
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return null;
    return { id: userDoc.id, ...userDoc.data() };
  } catch {
    return null;
  }
}

module.exports = { signUp, signIn, signOut, getCurrentUser, db };
