# Job Application Tracker (Chrome)

Minimal Chrome extension to sign in with Google and fetch Gmail threads about job applications.

## Setup
1. Google Cloud → APIs & Services → OAuth consent screen: External (Testing). Add your Gmail as test user.
2. Enable APIs: Gmail API, People API (optional).
3. Create OAuth client ID for Chrome extension (or Web client compatible with Chrome Identity). Put the client_id into `env.dev.json` (for local development) or `env.prod.json` (for Web Store/production), then run the build script to generate `manifest.json`.
4. Load extension: `chrome://extensions` → Developer mode → Load unpacked → select `chrome-extension` folder.

## Build (Dev/Prod) manifest.json

This project uses a template-based manifest to make sign-in configuration easy in both development and production.

- Template: `chrome-extension/manifest.template.json`
- Env files: `chrome-extension/env.dev.json`, `chrome-extension/env.prod.json`
- Build script: `chrome-extension/scripts/build-manifest.js`

Steps:

1. Install Node.js (v16+ recommended).
2. In `chrome-extension/`, edit one of the env files:
   - `env.dev.json` → set `client_id` to your Dev OAuth Client ID (binds to your unpacked extension ID).
   - `env.prod.json` → set `client_id` to your Production OAuth Client ID (binds to your Chrome Web Store extension ID).
3. Generate `manifest.json`:
   - Dev: `npm run build:dev`
   - Prod: `npm run build:prod`
4. Load the generated `manifest.json` by reloading the extension in `chrome://extensions/`.

Notes:

- `manifest.json` is generated and ignored by Git (.gitignore). Always run the build before loading the extension.
- Keep two OAuth clients: one for Dev (unpacked extension ID) and one for Prod (Web Store extension ID).

## Usage
- Click the extension → Sign in with Google → Fetch Emails.
- Results print in the popup.

## Publish flow (recommended)

1. Prepare a Web Store item (can be Unlisted) to obtain a fixed Production extension ID.
2. In Google Cloud Console, create an OAuth Client (type: Chrome extension) bound to that Production extension ID.
3. Put the new Production `client_id` into `env.prod.json`.
4. Run `npm run build:prod` to generate `manifest.json` with the Production client.
5. Zip the `chrome-extension/` (including generated `manifest.json`) and upload to Chrome Web Store.
6. After publish, all users will share the same fixed extension ID; login will be stable without redirect_uri_mismatch.

## Troubleshooting
- access_not_configured: enable Gmail API.
- redirect_uri_mismatch: ensure Chrome identity flow and correct client_id.
- Remove cached token: `chrome://identity-internals` or Sign out in popup.
