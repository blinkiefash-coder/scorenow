# Scorenow mobile (Expo / React Native)

Android + iOS app for customers and admins. It talks to the same backend as the web app.

## Run

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

The API URL defaults to the dev machine's IP on port 3000. Override it with `EXPO_PUBLIC_API_URL`, for example `EXPO_PUBLIC_API_URL=https://api.example.com npx expo start`. The backend must be running.

Expo Go is enough for email/password login, the dashboard, reports, support and the admin panel. Admin sign-in is under "Admin sign in" on the login screen.

## Phone OTP and Google sign-in (development build)

These use native Firebase, so they need a development build instead of Expo Go.

1. In the Firebase project `bharatshop-3eff7`, add an Android app (`in.scorenow.app`) and an iOS app (`in.scorenow.app`).
2. Download `google-services.json` and `GoogleService-Info.plist` into `mobile/` (both are gitignored). `app.config.ts` enables the Firebase and Google plugins when these files exist.
3. Add your debug and release SHA-1/SHA-256 fingerprints to the Android app in Firebase.
4. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the project's Web client ID.
5. Build and run:

```bash
npx expo prebuild
npx expo run:android   # or: npx expo run:ios
```

For store builds use `eas build`.

## Current limits

- Payments: demo mode and simulated payments work. With real Razorpay keys the app asks the user to buy on the web.
- Not yet in the app: FD and credit-card pages, the chat assistant and the credit guides.
