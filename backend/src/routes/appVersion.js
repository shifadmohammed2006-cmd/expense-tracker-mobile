// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import { Router } from 'express';

const router = Router();

// Public (no login needed) so even a logged-out phone can be told to update.
// Change these in the Render dashboard (Environment) - no code change or redeploy of the app needed:
//   APP_MIN_VERSION    phones older than this are BLOCKED until they update (the "mandatory update")
//   APP_LATEST_VERSION the newest version you have released
//   APP_APK_URL        direct download link of the newest APK
//   APP_UPDATE_NOTES   short "what's new" text shown on the update screen
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    latest: process.env.APP_LATEST_VERSION || '2.0.0',
    minimum: process.env.APP_MIN_VERSION || '1.0.0',
    apkUrl: process.env.APP_APK_URL || '',
    notes: process.env.APP_UPDATE_NOTES || '',
  });
});

export default router;
