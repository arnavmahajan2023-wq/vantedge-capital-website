# VANTEDGE Website v8.0 — Enterprise Final Production

Free architecture:
- Cloudflare Workers Free
- Cloudflare Turnstile Free
- Resend Free
- Zoho Mail receiving

Deployment:
- Project: vantedge-capital-production
- Branch: main
- Build command: blank
- Deploy command: npx wrangler deploy

Public Turnstile Site Key is already configured.

Required encrypted Cloudflare Worker secrets:
- TURNSTILE_SECRET
- RESEND_API_KEY

Verify this sending subdomain in Resend:
send.vantedgecapital.in

The Worker sends:
From: VANTEDGE Website <website@send.vantedgecapital.in>
To: contact@vantedgecapital.in
Reply-To: visitor email

Do not store secrets in GitHub.
