# Setup Java and Run Tests

## Problem
Firebase Emulators require Java to run. Your system doesn't have Java installed.

## Solution: Install Java

### Step 1: Download Java

Go to **https://www.oracle.com/java/technologies/downloads/** and download **Java 21 LTS** (or any LTS version).

Choose the Windows x64 installer (`.exe` file).

### Step 2: Install Java

1. Run the downloaded `.exe` file
2. Click "Next" through the installation wizard
3. Accept the default installation location: `C:\Program Files\Java\jdk-21` (or similar)
4. Click "Install"
5. Click "Finish" when done

### Step 3: Verify Java is Installed

Open a **new terminal/command prompt** and run:
```bash
java -version
```

You should see output like:
```
java version "21.0.x" 2023-...
Java(TM) SE Runtime Environment (build 21.0.x+...)
Java HotSpot(TM) 64-Bit Server VM (build 21.0.x+...)
```

If Java is not found, restart your terminal or computer and try again.

---

## Step 4: Run the Tests

Once Java is installed, open **three separate terminals** in the project directory (`C:\Users\alber\Documents\bluechipNIL-main`):

### Terminal 1: Firebase Emulators
```bash
bash firebase-emulators.sh emulators:start --only auth,firestore,functions
```

Expected output (takes 5-10 seconds to start):
```
✔  Emulator UI running at http://localhost:4000
✔  Auth emulator running at http://localhost:9099
✔  Firestore emulator running at http://localhost:8080
✔  Functions emulator running at http://localhost:5001
```

### Terminal 2: Dev Server
```bash
npm run dev
```

Expected output:
```
  VITE v6.2.0  ready in 123 ms
  ➜  local:   http://localhost:3000/
```

### Terminal 3: E2E Tests
```bash
npm run test:e2e
```

Expected output (takes 15-20 seconds):
```
✓ signup.spec.ts:8 > Athlete signup flow > completes signup, onboarding, and lands on athlete dashboard
  1 passed (15s)
```

---

## What the Test Verifies

✅ Role picker appears and athlete can be selected
✅ Account created with email/password
✅ Onboarding wizard completes all 3 steps
✅ User lands on /athlete-dashboard
✅ Firestore docs created: users/{uid}, athletes/{uid}
✅ Custom claim role = "athlete"

---

## Troubleshooting

### "Java not found" or "java: command not found"
- Make sure Java installation completed
- Restart your terminal/command prompt
- Verify with `java -version`
- If still not found, check that `C:\Program Files\Java\jdk-*\bin` was added to your system PATH

### "Port 4000/8080/5001/9099 already in use"
- Kill any existing Firebase emulators process
- Try: `taskkill /F /IM java.exe` (kills all Java processes)
- Or edit `firebase.json` to use different ports

### "Test hangs or fails"
- Make sure all three terminals are running
- Check that no errors appear in Terminal 1 or 2
- Verify Firebase emulator UI loads at http://localhost:4000

### "Firestore rules validation error"
- This is normal on first run — the emulator validates rules
- Check `firestore.rules` file exists and is valid
- You can see validation errors in Terminal 1 (Emulator UI)

---

## After Tests Pass

Once all tests pass:

1. **Deploy to Firebase:**
   ```bash
   bash firebase-emulators.sh deploy
   ```

2. **Manual Testing:**
   - Open http://localhost:3000
   - Sign up as athlete or business
   - Complete onboarding wizard
   - Verify you land on the correct dashboard

3. **View Data in Emulator UI:**
   - Open http://localhost:4000
   - Browse Firestore collections (users, athletes, brands)
   - View Auth users and their custom claims

---

## Stop Everything

When you're done:
1. Press `Ctrl+C` in Terminal 1 (Emulators)
2. Press `Ctrl+C` in Terminal 2 (Dev Server)
3. Press `Ctrl+C` in Terminal 3 (Test runner will auto-exit)

All data is ephemeral — everything resets when you stop the emulators.
