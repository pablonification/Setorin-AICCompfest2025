## Logbook

Date: 2025-08-23

- Infra: Fixed HTTPS issuance on Caddy
  - Set ACME contact email to arqilasp@gmail.com
  - Forced Let’s Encrypt CA, avoided ZeroSSL EAB issue
  - Removed `www.setorin.app` from `Caddyfile` until DNS exists
  - Validated and reloaded Caddy; HTTPS working for `setorin.app`

- DNS: Verified A records
  - `setorin.app` → 167.71.220.62
  - `api.setorin.app` → 167.71.220.62

- Auth: Corrected Google OAuth redirect flow
  - Switched redirect URI to `https://setorin.app/auth/callback`
  - Updated frontend `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` and backend `GOOGLE_REDIRECT_URI` via `.env`
  - Rebuilt and restarted `frontend` and `backend`
  - Outcome: Post-login now returns to the app instead of showing raw JSON
  - Action required: Add the new redirect URI in Google Cloud Console OAuth client

- Backend: Make CORS allowlist configurable
  - Read `ALLOWED_ORIGIN` and `ALLOWED_ORIGINS` env vars
  - Keeps sensible defaults for local/dev and containers

- Compose: Reduce attack surface
  - Stopped publishing MongoDB and Redis ports to the host; containers still network internally

- Deployment
  - `docker compose up -d --build frontend backend`
  - Checked logs for errors; services healthy

- Follow‑ups
  - Add `A` record for `www.setorin.app` then re-add it in `Caddyfile`
  - Ensure Google Console has `https://setorin.app/auth/callback` authorized
  - Consider rotating `JWT_SECRET_KEY` to a stronger secret and storing secrets in a manager
