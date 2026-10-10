# Expense Tracker (mobile) — made by Shifad

A mobile expense tracker and budget app. Anyone can create an account, log in, and see only their own data.

```
expense-tracker/
├── backend/   Node + Express API, stores everything in MongoDB Atlas
└── mobile/    React Native app built with Expo (runs in Expo Go, builds to a real app)
```

The phone app never talks to MongoDB directly. It calls the API, and the API talks to MongoDB.
So the API has to be on the internet for other people to use the app (Step 2).

> This was written without being able to run it on a device or against a live database,
> so expect to fix a small thing or two on first run. Tell me the exact error and I'll fix it.

---

## Step 1 — MongoDB Atlas (your free 512 MB cluster)

1. **Database Access → Add New Database User.** Pick a username and a password
   (letters and numbers only keeps the connection string simple).
2. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`).**
   Free hosting has no fixed IP, so this is required. The database password is what protects it.
3. **Database → Connect → Drivers.** Copy the connection string and:
   - replace `<password>` with your password
   - add the database name before the `?`, like `...mongodb.net/expense-tracker?retryWrites=true...`

Collections are created automatically on first use. Each expense is well under 1 KB,
so 512 MB holds hundreds of thousands of expenses.

## Step 2 — Run and deploy the API

**Try it on your computer first (optional):**

```bash
cd backend
cp .env.example .env        # then paste your MONGODB_URI and a JWT_SECRET into .env
npm install
npm run dev                 # http://localhost:5000/api/health should say status ok
```

Make a `JWT_SECRET` with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**Deploy it so anyone can use the app (Render, free):**

1. Put this project on GitHub (`.env` is already git-ignored — never commit it).
2. On render.com: **New → Web Service →** pick the repo, then:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance type: Free
   - Environment variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`
3. When it's live you get `https://something.onrender.com`. Open `/api/health` on it to check.

(There is also a `render.yaml` if you prefer Render's Blueprint flow.)

**Free-tier catch:** Render puts free services to sleep after about 15 minutes with no traffic.
The first request afterwards can take 30–60 seconds. The app shows a "waking up the server"
message and waits up to 60 seconds, so it works, it's just slow after idle periods.

## Step 3 — Run the app on your phone with Expo Go

You need Node 22 or newer and the **Expo Go** app on your phone.

```bash
cd mobile
cp .env.example .env              # set EXPO_PUBLIC_API_URL to your Render URL (no trailing slash)
npm install
npx expo install --fix            # lines every package up with the current Expo SDK
npx expo login                    # same Expo account you use in Expo Go
npx expo start
```

Scan the QR code with your phone (Camera app on iPhone, Expo Go on Android). Newer Expo Go
versions require you to be signed in to the same Expo account in the app and in the terminal.
If your phone can't connect to your computer, use `npx expo start --tunnel`.

If Expo Go says the project's SDK version isn't supported, run `npx expo install expo@latest`
then `npx expo install --fix`, or get a matching Expo Go from https://expo.dev/go.

Expo Go is for testing: it only runs while your computer's dev server is running.
For something people can install on their own, do Step 4.

## Step 4 — Build a real installable app (EAS)

Free Expo accounts include a limited number of cloud builds per month (currently up to 15
Android and 15 iOS, in a slower queue).

```bash
npm install -g eas-cli
cd mobile
eas login
eas init                          # links this folder to your Expo account
```

Open `mobile/eas.json` and replace `YOUR-API-NAME.onrender.com` with your real API URL.
The `.env` file is *not* uploaded to EAS builds, so this is where the URL has to be.

**Android** (works on the free plan, no store account needed):

```bash
eas build -p android --profile preview
```

You get a link to an `.apk` file. Open it on any Android phone to install, and share it with others.

**iPhone:** Apple only allows installing your own apps through a paid Apple Developer
account ($99/year). With one, run `eas build -p ios --profile production`, then
`eas submit -p ios` to push it to TestFlight/App Store. There is no free way around this.

Before publishing to either store, change the app ID in `mobile/app.json`
(`com.shifad.expensetracker`) to one you own, and have a privacy policy page ready
(both stores require one for apps with accounts).

---

## What's in the app

Sign up / log in (token kept in the phone's secure storage, 30-day sessions) · dashboard with
donut + daily bar chart · add/edit/delete expenses with search and category filter ·
monthly and per-category budgets · custom categories · dark mode · currency · CSV/JSON export
through the share sheet · reset data · delete account.

## What changed from the web version

- Storage moved from `db.json` to MongoDB (`backend/src/models.js`). Old local data isn't migrated.
- Passwords need 8+ characters; login/signup are rate limited; password hashing no longer blocks the server.
- Expense and category updates only accept known fields (the old code merged whatever the client sent).
- Deleting a category moves its expenses to "Other" instead of leaving them orphaned.
- Added **Delete account** (Apple requires it for apps that create accounts).
- The dashboard's "daily average" uses the phone's date, so it's right in every time zone.
- The React web frontend isn't included; it still works against this API if you want it.

## Ideas for later

Native date picker · forgot-password by email · recurring expenses · push reminders ·
a hosting plan that doesn't sleep (or a free uptime pinger).
