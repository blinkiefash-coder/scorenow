import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | null = null;

const getFirebaseApp = () => {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    return null;
  }

  app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
  return app;
};

export const isFirebaseConfigured = () => getFirebaseApp() !== null;

export const verifyFirebaseIdToken = async (idToken: string) => {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    throw new Error("Firebase is not configured on this server.");
  }
  return getAuth(firebaseApp).verifyIdToken(idToken);
};
