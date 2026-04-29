# How to Run the Full Test Suite

## Problem
Node.js and npm were installed but not added to your system PATH. Firebase CLI was installed globally but also can't find node.

## Solution: Use the Helper Scripts

I've created a helper script that sets up PATH correctly before running commands.

---

## Step 1: Start Firebase Emulators

**In Terminal 1, from the project root:**

```bash
bash firebase-emulators.sh emulators:start --only auth,firestore,functions
```

You should see:
```
✔  Emulator UI running at http://localhost:4000
✔  Auth emulator running at http://localhost:9099
✔  Firestore emulator running at http://localhost:8080
✔  Functions emulator running at http://localhost:5001
```

**Keep this terminal open.** The emulators will stay running.

---

## Step 2: Start the Vite Dev Server

**In Terminal 2, from the project root:**

```bash
npm run dev
```

You should see:
```
  VITE v6.2.0  ready in 123 ms

  ➜  local:   http://localhost:3000/
  ➜  press h to show help
```

**Keep this terminal open.** The dev server will hot-reload as you make changes.

---

## Step 3: Run the E2E Test

**In Terminal 3, from the project root:**

```bash
npm run test:e2e
```

The test will:
1. Open a browser and navigate to `http://localhost:3000`
2. Click "Get Started" → navigate to `/auth`
3. Select "Athlete" role
4. Fill in signup form with random email
5. Complete 3-step onboarding wizard:
   - Step 1: Full name, university, bio
   - Step 2: Sport, year, position
   - Step 3: Instagram handle
6. Verify it lands on `/athlete-dashboard`
7. Query Firebase emulator REST APIs to verify:
   - `users/{uid}` doc exists with `role = "athlete"`
   - `athletes/{uid}` doc exists with correct data
   - Custom claim `role = "athlete"` is set

**Expected output:**
```
✓ signup.spec.ts:8 > Athlete signup flow > completes signup, onboarding, and lands on athlete dashboard
  1 passed (15s)
```

---

## What If Something Goes Wrong?

### "Command not found: firebase"
Use the wrapper script:
```bash
bash firebase-emulators.sh emulators:start --only auth,firestore,functions
```

### "Port 3000 already in use"
Kill the existing process or use a different port:
```bash
npm run dev -- --port 3001
```

### "Port 8080 (Firestore) in use"
Edit `firebase.json` and change `"port": 8080` to `"port": 8081`, then restart emulators.

### "Test hangs or times out"
Make sure all three terminals are running:
1. Firebase emulators (Terminal 1)
2. Vite dev server (Terminal 2)
3. Test runner (Terminal 3)

Verify each one is outputting messages.

### "Test fails with 'element not found'"
The E2E test uses `data-testid` attributes. Make sure the Auth component is using them (it is, but you can verify in `src/components/Auth.tsx`).

---

## After Tests Pass

Once the test suite passes, you can:

1. **Deploy to Firebase:**
   ```bash
   bash firebase-emulators.sh deploy
   ```

2. **Test manually in the browser:**
   - Open http://localhost:3000
   - Click "Get Started"
   - Sign up as an athlete or business
   - Complete the onboarding wizard
   - Verify you land on the correct dashboard

3. **View Firestore data:**
   - Open the Emulator UI at http://localhost:4000
   - Click on "Firestore"
   - Browse the collections (users, athletes, brands)
   - Verify documents were created

4. **View Auth data:**
   - In the Emulator UI, click on "Authentication"
   - See the created test users
   - Verify their custom claims (role, activeRole)

---

## Cleaning Up

To stop the emulators and dev server, press `Ctrl+C` in each terminal.

To reset the emulator data, stop the emulators, then:
```bash
bash firebase-emulators.sh emulators:start --only auth,firestore,functions --import ./emulators-backup
```

Or just restart fresh (data is ephemeral in the emulator).

---

## Environment Setup (One-Time)

If you want to avoid using the wrapper script, you can add Node.js and npm to your system PATH:

**Windows (PowerShell as Admin):**
```powershell
[Environment]::SetEnvironmentVariable(
  "Path",
  "$env:Path;C:\Program Files\nodejs;C:\Users\alber\AppData\Roaming\npm",
  "User"
)
```

Then restart your terminal and `firebase --version` should work.
