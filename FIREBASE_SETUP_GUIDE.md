# Pulse Dial: Complete Firebase Integration & Setup Guide

This guide details everything required on your end to connect **Pulse Dial** to your real Firebase project for global database synchronization and authentication across the **Hospital Web Portal (Vercel)** and the **Citizen Donor Android App**.

---

## Step 1: Create Your Firebase Project

1. Open your browser and navigate to **[Firebase Console](https://console.firebase.google.com/)**.
2. Click **"Add project"** (or **"Create a project"**).
3. Enter Project Name: `pulse-dial-emergency` (or any name you prefer).
4. (Optional) Disable Google Analytics or leave default, then click **"Create project"**.

---

## Step 2: Enable Firebase Authentication

The system uses **Email/Password** for Hospital Staff and **Phone Number (SMS / OTP)** for Citizen Donors:

1. In the left sidebar of the Firebase Console, go to **Build** &rarr; **Authentication**.
2. Click **"Get started"**.
3. Under the **"Sign-in method"** tab:
   - Click on **Email/Password** &rarr; Enable the switch &rarr; Click **Save**.
   - Click on **Phone** &rarr; Enable the switch &rarr; Click **Save**.
   - *(Optional for testing)*: Under Phone, expand **"Phone numbers for testing"** and add:
     - Phone: `+91 9900000001`, Verification Code: `123456`

---

## Step 3: Create Cloud Firestore Database

1. In the left sidebar, click **Build** &rarr; **Firestore Database**.
2. Click **"Create database"**.
3. Choose a Location close to your users (e.g. `asia-south1` or `us-central1`).
4. Select **"Start in production mode"** (or test mode for quick prototyping) &rarr; Click **Create**.
5. Go to the **"Rules"** tab and update the rules to allow read/write for verified medical dispatches:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Hospitals collection: readable by all, writable only by admins
    match /hospitals/{hospitalId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Citizen Donors collection: donors can read & manage their profile
    match /donors/{donorId} {
      allow read: if true;
      allow create, update: if true;
    }

    // Emergency Requests: hospitals create, donors listen & update
    match /emergency_requests/{requestId} {
      allow read, write: if true;
    }

    // Assignments: real-time dispatch tracking
    match /dispatch_assignments/{assignmentId} {
      allow read, write: if true;
    }
  }
}
```
Click **"Publish"**.

---

## Step 4: Register the Web App (For Vercel Hospital Portal)

1. Go to **Project Settings** (gear icon ⚙️ at top-left).
2. Under the **"General"** tab, scroll down to **"Your apps"** &rarr; Click the **Web icon `</>`**.
3. App nickname: `Pulse Dial Hospital Portal` &rarr; Click **"Register app"**.
4. Firebase will display your `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyA...",
  authDomain: "pulse-dial-xxxx.firebaseapp.com",
  projectId: "pulse-dial-xxxx",
  storageBucket: "pulse-dial-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

5. In your project directory, open `frontend/.env` (or copy from `frontend/.env.example`):
```env
VITE_FIREBASE_API_KEY=AIzaSyA...
VITE_FIREBASE_AUTH_DOMAIN=pulse-dial-xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pulse-dial-xxxx
VITE_FIREBASE_STORAGE_BUCKET=pulse-dial-xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef...
```

> **For Vercel Deployment**:
> When importing the repository on [Vercel.com](https://vercel.com), add these exact environment variables under **Project Settings &rarr; Environment Variables** so the live hosted portal connects to your Firebase database!

---

## Step 5: Register the Android App (For Mobile Users)

1. In Firebase Console **Project Settings** &rarr; **"Your apps"** &rarr; Click **"Add app"** &rarr; Select the **Android icon**.
2. **Android package name**: `org.pulsedial.pulse_dial_app` *(Must match the Android package name)*.
3. App nickname: `Pulse Dial Donor`.
4. Click **"Register app"**.
5. Click **"Download google-services.json"**.
6. Place the downloaded `google-services.json` file into:
   ```
   mobile-client/pulse_dial_app/android/app/google-services.json
   ```

---

## Step 6: Automatically Seed Initial Sample Data into Firestore

We have provided an automated database seeder that populates pre-verified hospitals and sample citizen donors with full medical profiles:

Run in PowerShell:
```powershell
$env:FIREBASE_PROJECT_ID="your-firebase-project-id"
node scripts/seedFirebase.js
```

This immediately creates the documents in Firestore:
- `hospitals/h1111111-1111-1111-1111-111111111111` (Apollo Trauma Center)
- `hospitals/h2222222-2222-2222-2222-222222222222` (Metropolitan Memorial)
- `hospitals/h3333333-3333-3333-3333-333333333333` (City Emergency General)
- `donors/d001-tier1-o-neg` (Arjun Menon - O-)
- `donors/d004-tier1-o-neg` (Rahul Verma - O-)
- Plus all other multi-tier sample donors with full medical profiles!

---

## Summary: What Works Automatically

- **Hospital Login**: Pre-configured credentials (`apollo.admin@apollohealth.org` / `ApolloTrauma@2026`) work immediately.
- **Donor Registration**: Donors can register new profiles on the mobile app or web, which syncs to Firestore in real time.
- **Emergency Dispatch**: When an SOS is triggered, active emergency records update in Firestore and push alerts directly to matching donors.
- **Vercel Hosting**: The hospital portal is decoupled and configured with `vercel.json` for 1-click global deployment.
