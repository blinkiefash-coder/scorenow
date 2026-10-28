# Score Now

Full-stack workspace for the Score Now responsive website.

## Structure

- `frontend/` - React, TypeScript, and Vite
- `backend/` - Express and TypeScript

## Development

Install dependencies from the project root:

```sh
npm install
npm --prefix frontend install
npm --prefix backend install
```

Start both development servers:

```sh
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`

## Assessment email delivery

Assessment forms save their fields and optional PDF/JPG/PNG report in PostgreSQL. The API validates the submission and, when email is configured, also emails it as a formatted individual or business assessment to `info@scorenow.in`, attaching the uploaded report. If email delivery is not configured or fails, the saved submission is retained. Callback requests made through the website's chat assistant are saved separately in `website_inquiries`. Direct phone, email, and WhatsApp conversations happen outside the website and cannot be recorded by this API.

Create a PostgreSQL database and set `DATABASE_URL` in `backend/.env` from `backend/.env.example`. Once connected, the API creates the `assessment_submissions` and `website_inquiries` tables when it starts. For Render, set the API service's `DATABASE_URL` to your database's connection string. Keep the database private and never expose its connection string in the frontend or commit it.

Before real delivery, create `backend/.env` from `backend/.env.example` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and a verified `SMTP_FROM` address for your email provider. Keep these credentials only in the ignored local `.env` file or your deployment secret store; do not commit them. Restart the backend after configuration.

Set `VITE_API_URL` in `frontend/.env` if the API is hosted somewhere other than `http://localhost:3000`, then restart Vite. For local testing without sending email, set `EMAIL_PREVIEW=true` in `backend/.env`; preview mode renders messages without delivering them.

## Customer login

Customers can continue using mobile OTP or choose email and password. Account creation verifies the mobile number and requires an email and a password of at least 8 characters. Passwords are stored in PostgreSQL only as per-account salted scrypt hashes, never as plain text; the backend adds the password-hash columns to the existing `users` table on startup. Existing customers can create/set a password by choosing **Create Account** and verifying the mobile number and email already on their account. Email OTP sign-in remains available as a fallback.

## Credit report PDF downloads

The customer dashboard downloads a bureau-provided PDF when one is available. If a bureau response does not include a usable PDF, the backend generates a Score Now-formatted PDF from the normalized report data. Admin-initiated bureau checks can also download a Score Now report copy. Generated copies are explicitly labeled as not issued or endorsed by the bureau and are served only to the authenticated report owner or authorized admin.

## Client preview deployment

The deployment layout is:

- Vercel serves the Vite frontend from the `frontend/` root directory. `frontend/vercel.json` keeps `/business` working on direct visits and refreshes.
- Render runs the Express API from `backend/`. The root `render.yaml` defines the web service and `/api/health` health check.

Connect the GitHub repository to Render and create a Blueprint deployment from `render.yaml`. Add the SMTP values as Render environment secrets; never commit them. Render will provide the API URL after the service is created.

Connect the same repository to Vercel and set the project root directory to `frontend`. Add `VITE_API_URL` with the Render API URL, for example `https://scorenow-api.onrender.com`, then deploy. Vite reads this value at build time, so redeploy the frontend whenever it changes.

Verify the deployed API at `/api/health`, then test both assessment forms and report attachments. Render's free web services may sleep while idle, so the first request after inactivity can take longer.

## cPanel deployment

The root `.cpanel.yml` builds the frontend and backend, copies the static site to `/home/spjheceg/public_html/`, installs the backend runtime dependencies in `/home/spjheceg/scorenow-api/`, and touches Passenger's `tmp/restart.txt` after deployment. Confirm that these paths match the domain document root and Node.js application root in cPanel.