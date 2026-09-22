<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c5921e07-9961-42a2-b9be-7b4b383d0bdb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Guest Gemini proxy

Users without a vault key can generate through [api/generate.php](./api/generate.php).
Configure `GUEST_GEMINI_API_KEY` only in the PHP server environment. Do not put the
guest key in `.env.local`, Vite configuration, or JavaScript. The PHP endpoint keeps
the key server-side and forwards only the generation request to Google.

The PHP host must have PHP cURL enabled and should serve the app over HTTPS. Add
authentication, origin restrictions, and rate limiting before exposing the endpoint
publicly.

The `npm run build:aio` command also creates `dist/index.php` from the fully
inlined frontend and embeds the PHP API implementation inside its opening
`<?php ?>` block. Serve `dist/index.php` from a PHP-capable host; do not open it
as a local file. The generated PHP entry does not contain API keys. Server
secrets remain environment variables on the PHP host.

## Google OAuth key management

Configure the confidential OAuth variables in `.env.example` on the PHP server.
Enable the Google Cloud API Keys API and grant the OAuth user permission to list
and create API keys in `GOOGLE_CLOUD_PROJECT_ID`. Register the exact callback URL
as an authorized redirect URI. The frontend redirects to `/api/google/login.php`;
tokens remain in the server session and only masked key metadata is returned.
