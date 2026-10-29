// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.

// Version 1 of the app has no update screen, but it DOES show server messages on its login screen.
// So when FORCE_UPDATE_OLD_APPS=true, every request from an old app (one that doesn't send the
// X-App-Version header) is refused:
//   - normal requests get 401  -> the old app logs the person out and opens its login screen
//   - login / sign-up get 403 with the "Update required" text -> shown in red on that login screen
// Version 2 and newer always send X-App-Version, so they are never affected.
const OPEN_PATHS = new Set(['/health', '/app-version']);

export function oldAppGate(req, res, next) {
  if (process.env.FORCE_UPDATE_OLD_APPS !== 'true') return next();
  if (req.get('x-app-version') || OPEN_PATHS.has(req.path)) return next();

  const host = req.get('x-forwarded-host') || req.get('host') || '';
  const forwardedProto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const protocol = forwardedProto.split(',')[0].trim() === 'https' ? 'https' : 'http';
  const message =
    process.env.OLD_APP_MESSAGE ||
    `UPDATE REQUIRED. Open ${protocol}://${host}/update in your phone's browser, download the new version and install it.`;
  const isLogin = req.path === '/auth/login' || req.path === '/auth/signup';
  res.status(isLogin ? 403 : 401).json({ error: message });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The mandatory-update download page at  https://YOUR-API.onrender.com/update
// Red & black to match the app, with soft CSS animations (no JS needed).
export function updatePage(req, res) {
  const url = process.env.APP_APK_URL || '';
  const ready = /^https:\/\//i.test(url);
  const notes = process.env.APP_UPDATE_NOTES || '';
  res.set('Cache-Control', 'no-store').type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Update Expense Tracker</title>
<style>
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes beat{0%,100%{box-shadow:0 10px 34px -8px rgba(229,50,75,.55)}50%{box-shadow:0 10px 52px -4px rgba(229,50,75,.9)}}
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0A0A0C;color:#F5F5F7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.card{max-width:420px;width:100%;text-align:center;animation:rise .55s cubic-bezier(.2,.8,.2,1) both}
h1{font-size:26px;margin:0 0 8px}p{color:rgba(245,245,247,.55);line-height:1.55}
a.btn{display:block;background:#E5324B;color:#fff;font-weight:700;text-decoration:none;padding:16px;border-radius:14px;margin:24px 0 8px;font-size:17px;animation:beat 2.2s ease-in-out infinite}
ol{text-align:left;color:rgba(245,245,247,.55);line-height:1.7;padding-left:20px}small{color:#5E5E64}
.badge{display:inline-block;background:rgba(229,50,75,.16);color:#E5324B;font-weight:700;font-size:12px;letter-spacing:.12em;padding:6px 14px;border-radius:999px;margin-bottom:14px}
</style></head><body><div class="card">
<span class="badge">MANDATORY UPDATE</span>
<h1>Update required</h1>
<p>A new version of Expense Tracker is ready. Your expenses are safe - just install the new version and log in.</p>
${notes ? `<p><b>What's new:</b> ${escapeHtml(notes)}</p>` : ''}
${ready
    ? `<a class="btn" href="${escapeHtml(url)}">Download new version</a>
<ol><li>Tap <b>Download</b> (on Google Drive, tap the download icon).</li><li>Open the downloaded file and tap <b>Install</b>. If Android asks, allow installing from this browser.</li><li>Open the app and log in with the same email and password.</li></ol>`
    : '<p><b>The download link is not ready yet.</b> Please try again in a little while.</p>'}
<small>© 2026. All rights reserved.</small>
</div></body></html>`);
}
