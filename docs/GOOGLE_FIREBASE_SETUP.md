# Google Sign-In via Firebase

This app uses **Firebase Authentication (Google)** on the frontend and **Firebase Admin SDK** on the Spring Boot backend to verify ID tokens. Each user's tasks are scoped to their Firebase UID.

---

## Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
2. **Add project** (e.g. `wedding-planner-todo`)
3. Disable Google Analytics if you don't need it (optional)

---

## Step 2 — Enable Google Sign-In

1. Firebase Console → **Build** → **Authentication**
2. Click **Get started**
3. **Sign-in method** tab → **Google** → **Enable**
4. Set a support email → **Save**

---

## Step 3 — Register the web app (frontend)

1. Firebase Console → **Project settings** (gear icon) → **General**
2. Under **Your apps**, click **Web** (`</>`)
3. App nickname: `todo-frontend` → **Register app**
4. Copy the `firebaseConfig` values

Create `frontend/.env.local` from the example:

```powershell
cd frontend
copy .env.example .env.local
```

Fill in:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Step 4 — Service account for backend

The backend verifies Firebase ID tokens using a service account key.

1. Firebase Console → **Project settings** → **Service accounts**
2. Click **Generate new private key** → download the JSON file
3. Save it somewhere safe, e.g.:

   ```
   backend/firebase-service-account.json
   ```

4. **Do not commit this file to git.** Add to `.gitignore` if needed.

Set the environment variable before starting the backend:

```powershell
$env:FIREBASE_CREDENTIALS_PATH = "C:\path\to\todo-app\backend\firebase-service-account.json"
$env:FRONTEND_URL = "http://localhost:5174"
cd backend
mvn spring-boot:run
```

---

## Step 5 — Authorized domains (for local dev)

Firebase Console → **Authentication** → **Settings** → **Authorized domains**

Ensure these are listed:
- `localhost`
- Your production domain (when you deploy)

No redirect URI setup needed for Google popup sign-in (unlike Facebook OAuth).

---

## Step 6 — Run the app

```powershell
# Terminal 1 — MySQL
docker compose up -d

# Terminal 2 — Backend (with FIREBASE_CREDENTIALS_PATH set)
cd backend
mvn spring-boot:run

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5174** → **Continue with Google**

---

## How it works

```
Browser                    Firebase                  Spring Boot
   │                          │                          │
   │── signInWithPopup ──────►│                          │
   │◄── ID token ─────────────│                          │
   │                          │                          │
   │── GET /api/board ────────┼── Authorization: Bearer ─►│
   │                          │                          │ verifyIdToken()
   │                          │                          │ find/create User
   │◄── board data ───────────┼──────────────────────────│
```

- Frontend: `firebase/auth` → Google popup → ID token on every API call
- Backend: `FirebaseTokenFilter` → verify token → load user by `firebase_uid`
- Data: all projects/tasks scoped to that user in MySQL

---

## Database note

If you previously used Facebook auth, the `users` table had `facebook_id`. The app now uses `firebase_uid`. For a clean start:

```powershell
docker compose down -v
docker compose up -d
```

---

## Troubleshooting

### Verify your API key (before blaming the app)

After updating `.env.local`, confirm the key works against Google (PowerShell):

```powershell
$key = "PASTE_YOUR_VITE_FIREBASE_API_KEY"
try {
  Invoke-WebRequest -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$key" `
    -Method Post -ContentType "application/json" -Body '{"returnSecureToken":true}'
} catch {
  $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
  $reader.ReadToEnd()
}
```

- **`API_KEY_INVALID`** — the key string is wrong. Re-copy from Firebase Console → Project settings → Your apps → SDK setup (web). Do not type it manually.
- **Other 400** (e.g. missing email) — key is valid; restart `npm run dev` and try Google sign-in again.
- **`API_KEY_HTTP_REFERRER_BLOCKED`** — in Google Cloud → APIs & Services → Credentials, set Application restrictions to **None** for local dev.

| Issue | Fix |
|-------|-----|
| `auth/api-key-not-valid` | Key fails Google's API — re-copy from Firebase web app config; restart Vite |
| `Missing Firebase config` on frontend | Create `frontend/.env.local` from `.env.example` |
| `Firebase credentials not configured` in backend logs | Set `FIREBASE_CREDENTIALS_PATH` to service account JSON |
| `auth/unauthorized-domain` | Add `localhost` in Firebase Authorized domains |
| `401 Invalid or expired token` | Sign out and sign in again; check backend credentials match same Firebase project |
| Popup blocked | Allow popups for `localhost:5174` |
| Google sign-in works but 401 on API | Backend service account must be from the **same** Firebase project as frontend config |

---

## Guest mode (no Google sign-in)

You can use the app without Firebase by choosing **Continue as Guest** on the login screen.

| | Google | Guest |
|---|--------|-------|
| Storage | MySQL (server) | **IndexedDB** (this browser) |
| Sync | Yes, via account | No |
| First load | Your account data | Copy of wedding template from DB via `GET /api/guest/bootstrap` |
| After that | API calls | All changes local only |

Guest flow:
1. Enter a nickname + acknowledge the caveat
2. App fetches a full board snapshot from the server (template user in DB)
3. Snapshot is saved to IndexedDB; further edits stay in the browser
4. Returning on the same browser restores from IndexedDB (no re-fetch unless cache cleared)

Template data remains in MySQL under a system user (`__guest_template__`). Guest edits do **not** write back to the server yet — migration/sync can be added later.

---

## Next: Firestore (optional)

When you're ready to move data to Firestore, the same Firebase Auth UID becomes the document path:

```
users/{uid}/projects/{projectId}/tasks/{taskId}
```

Security rules can enforce `request.auth.uid == uid`. The auth layer you have now stays the same.
