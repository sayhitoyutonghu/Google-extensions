# Job Application Tracker (Chrome)

Minimal Chrome extension to sign in with Google and fetch Gmail threads about job applications.

## Setup
1. Google Cloud → APIs & Services → OAuth consent screen: External (Testing). Add your Gmail as test user.
2. Enable APIs: Gmail API, People API (optional).
3. Create OAuth client ID for Chrome extension (or Web client compatible with Chrome Identity). Replace `REPLACE_ME.apps.googleusercontent.com` in `manifest.json`.
4. Load extension: `chrome://extensions` → Developer mode → Load unpacked → select `chrome-extension` folder.

## Usage
- Click the extension → Sign in with Google → Fetch Emails.
- Results print in the popup.

## Troubleshooting
- access_not_configured: enable Gmail API.
- redirect_uri_mismatch: ensure Chrome identity flow and correct client_id.
- Remove cached token: `chrome://identity-internals` or Sign out in popup.
