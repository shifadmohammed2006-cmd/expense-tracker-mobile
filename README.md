# Expense Tracker (mobile)

> © 2026. All rights reserved. See `LICENSE`.

## What's new in v2.2.0

- **Group trips:** share a trip with a join code. Members can view the trip; only its host can edit it.
- **Over-the-air updates:** after installing this native app version, JavaScript and asset fixes can be
  published to the production channel with `eas update --channel production --message "..."`.
- **Safer update gate:** old app versions remain unblocked until the APK download page and link have
  been tested.

## What's new in v2.1

- **New red & black look** (DigiCampus-style), dark by default - the light theme is still there in Settings.
- **Calculator tab** with big springy keys and a running history.
- **Quick maths while adding an expense**: tap the small ⊞ in the amount field and type sums like
  `120+80` or `45*3` - the result is filled in when you save.
- **Smoother, Apple-style motion** on buttons, tabs, screens, the splash and the update screen.
- **Redesigned server download page** (`/update`) in the same red & black style, with a pulsing
  Download button.
- Same login, same data, same package name - installs right over v2.0.

## What's new in v2.0

- **Works offline.** Everything is saved on the phone. Changes made with no internet are queued and
  sent to Render/MongoDB automatically when the connection returns (a small pill on Home shows
  *Synced / Offline / n to sync*; tap it to sync now). You only need internet to **log in the first time**.
- **Trips tab.** Plan a whole trip: stay (nights × rooms × rate), bus, train (class + return), flight,
  cab, local travel, fuel + tolls calculator, food, tickets, shopping, emergency buffer %, budget vs plan,
  per-person and per-day cost, bus-vs-train-vs-flight comparison, day-wise itinerary, packing list,
  split spending between friends with "who pays whom", share the plan as text.
- **INR by default** with Indian digit grouping (₹12,34,567) and **light theme by default**.
- Your original logo is unchanged (a small © was added). Insights on Home, quick-amount buttons when adding expenses.
- Copyright notice in the app (Settings → bottom), in every exported file and every source file.

## Updating (do these in order)

1. **Backend** (adds trip sync, INR default): push this project to GitHub - Render redeploys automatically.
   The app still works if you forget, but trips then stay on the phone only.
2. **Mobile APK** (new native packages, so a new build is required - Expo Go also works for testing):
   ```bash
   cd mobile
   npm install
   npx expo install --fix
   eas build -p android --profile preview      # keep your real Render URL in eas.json
   ```
3. Install the new APK over the old one (same package name keeps your login). After this native
   upgrade, publish JavaScript and asset-only fixes without another APK using
   `eas update --channel production --message "Describe the fix"`.

---

## Sending a mandatory update to everyone (no Play Store)

Starting with v2.0, the app asks your server on every open whether it is too old. To force an update:

- People on **v2.0 or newer** get a full-screen **Update required** page inside the app with an
  *Update now* button that opens the download link directly.
- People still on **v1** are handled by the server gate - see "Making the old v1 app say Update
  required" below.

1. Build the new APK (`eas build -p android --profile preview`), and upload it somewhere with a direct download link,
   for example a **GitHub Release** (attach the .apk file and copy its link).
2. In the **Render dashboard -> your service -> Environment**, set:
   `APP_LATEST_VERSION` (e.g. 2.1.0), `APP_MIN_VERSION` (same number to force it), `APP_APK_URL` (the link),
   `APP_UPDATE_NOTES` (short "what's new"). Save - Render restarts in a minute.
3. Anyone with an older version now sees a full-screen **Update required** page with an *Update now* button.

Notes: Android always asks the person to tap *Install* (no app can install silently outside the Play Store).
Updates install over the old app only if the new APK uses the same package name and the same signing key (EAS keeps it).
People who are offline are not blocked until they connect. People still on v1 have no update checker, so they must
install v2 once - see the next section; after that every future update is automatic.

### Making the old v1 app say "Update required"

An already-installed v1 APK cannot be given a new startup screen remotely. The server can block its API
requests, but v1 only displays the update message after the user tries to log in or sign up (and the
message itself is not a tappable link). A user who is already signed in may first be returned to the
login screen. To guide v1 users:

1. Upload the v2 APK to Google Drive (Share -> *Anyone with the link*) and copy the link.
2. Render -> Environment: set `APP_APK_URL` = that link, and `FORCE_UPDATE_OLD_APPS` = `true`. Save.
3. Test with your own phone while it still has v1 installed.
4. When a v1 user tries to log in or sign up, the app shows an **UPDATE REQUIRED** message containing
   your Render address. They can open `https://your-api.onrender.com/update` in their phone's browser
   to reach the download page. Since v1 cannot make that address tappable, also send the page address
   and APK link to users directly (for example, in your WhatsApp group).
5. v2 sends its version with every request, so it is never blocked. Set `FORCE_UPDATE_OLD_APPS` back to
   `false` any time to let v1 work again.

---


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

`mobile/eas.json` is already configured for this project's Render API. The `.env` file is *not*
uploaded to EAS builds, so keep the API URL in the EAS build profile up to date if your Render URL changes.

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
