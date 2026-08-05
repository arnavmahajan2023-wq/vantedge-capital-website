# VANTEDGE Website v6.2 — Cloudflare Workers Production

Use the current Cloudflare **Create a Worker** deployment screen:

- Project name: `vantedge-capital-production`
- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Builds for non-production branches: enabled

After deployment add encrypted secrets:
- TURNSTILE_SECRET
- CF_ACCOUNT_ID
- CF_EMAIL_API_TOKEN

Public Turnstile site key:
`public/assets/js/settings.js`
