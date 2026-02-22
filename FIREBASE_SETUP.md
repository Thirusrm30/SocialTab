# Firebase Authentication Setup Guide

To fully enable Real Firebase Authentication (with both Google Sign-In and Manual Email/Password methods), you need to configure your real Firebase project and set up your environment variables. 

By default, the application uses a mocked local storage testing implementation when Firebase credentials are missing. 

## 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project** (or add a project).
3. Follow the steps to name your project and finish setup.

## 2. Enable Authentication Providers
1. In the left-hand menu of the Firebase Console, navigate to **Build** > **Authentication**.
2. Click **Get Started**.
3. Go to the **Sign-in method** tab.
4. **Enable Email/Password**: 
   - Click "Email/Password".
   - Enable the toggle for "Email/Password" and save.
5. **Enable Google Sign-In**:
   - Click "Add new provider" (or "Google" if visible).
   - Enable the toggle for "Google".
   - Set a project support email.
   - Save.

## 3. Configure Firestore Database
1. In the left-hand menu, navigate to **Build** > **Firestore Database**.
2. Click **Create database**.
3. Choose the initial rules (Test mode is fine for initial development, but use Production mode rules for actual deployment).
4. Example basic rules if in production:
   ```json
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       // Add other rules here
     }
   }
   ```

## 4. Get Firebase Config
1. Go to your **Project Overview** (gear icon -> Project settings).
2. Scroll to the **Your apps** section.
3. If you haven't added a web app yet, click the **</>** (Web) icon to add one.
4. Register the app (you can skip Firebase Hosting for now).
5. Copy the configuration `firebaseConfig` variables you receive.

## 5. Add Environment Variables
1. Create a `.env` file in the root of the project (if it doesn't exist).
2. Populate the `.env` with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 6. Run the App
- Restart your Vite development server: `npm run dev`
- The application will automatically detect your `VITE_FIREBASE_API_KEY` and switch from Mock Mode to Real Firebase mode.
- Manual Login/Registration and Google Sign-in will now execute against real Firebase servers!
