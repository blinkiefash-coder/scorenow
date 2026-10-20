import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const getFirebaseAdminApp = () => {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY)
        return null;
    return getApps()[0] ?? initializeApp({
        credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
};
export const verifyFirebasePhoneToken = async (idToken) => {
    const app = getFirebaseAdminApp();
    if (!app)
        throw new Error('Firebase Admin is not configured on this server.');
    const token = await getAuth(app).verifyIdToken(idToken);
    if (!token.phone_number)
        throw new Error('This Firebase account has no verified phone number.');
    return token;
};
