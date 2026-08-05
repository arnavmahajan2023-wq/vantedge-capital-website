# VANTEDGE v6.1.1 — Cloudflare Production Setup

This corrected release uses:
- Cloudflare Pages for the website
- a Pages Function at `/api/contact`
- Turnstile server-side verification
- Cloudflare Email Service REST API
- encrypted Cloudflare project secrets

## Secrets required in Cloudflare Pages

Add these under:
Pages project → Settings → Variables and Secrets

- `TURNSTILE_SECRET`
- `CF_ACCOUNT_ID`
- `CF_EMAIL_API_TOKEN`

Optional:
- `CRM_WEBHOOK_URL`

The public Turnstile site key belongs in:
`assets/js/settings.js`

## Email Service

Onboard `vantedgecapital.in` under:
Compute → Email Service → Email Sending

The API token needs the Email Sending permission.

The website sends:
- From: `website@vantedgecapital.in`
- To: `contact@vantedgecapital.in`

Review DNS carefully. Keep Zoho's root MX records and keep only one DMARC record.

## Deployment

Connect GitHub to a Cloudflare Pages project.

- Production branch: `main`
- Framework preset: None
- Build command: blank
- Build output directory: `.`
- Root directory: `/`

After adding secrets, redeploy the project.
