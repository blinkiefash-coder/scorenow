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

Assessment forms send their fields and optional PDF/JPG/PNG report to the backend. The API validates the submission and emails it as a formatted individual or business assessment to `info@scorenow.in`, attaching the uploaded report.

Before real delivery, create `backend/.env` from `backend/.env.example` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and a verified `SMTP_FROM` address for your email provider. Keep these credentials only in the ignored local `.env` file or your deployment secret store; do not commit them. Restart the backend after configuration.

Set `VITE_API_URL` in `frontend/.env` if the API is hosted somewhere other than `http://localhost:3000`, then restart Vite. For local testing without sending email, set `EMAIL_PREVIEW=true` in `backend/.env`; preview mode renders messages without delivering them.

## Client preview deployment

The deployment layout is:

- Vercel serves the Vite frontend from the `frontend/` root directory. `frontend/vercel.json` keeps `/business` working on direct visits and refreshes.
- Render runs the Express API from `backend/`. The root `render.yaml` defines the web service and `/api/health` health check.

Connect the GitHub repository to Render and create a Blueprint deployment from `render.yaml`. Add the SMTP values as Render environment secrets; never commit them. Render will provide the API URL after the service is created.

Connect the same repository to Vercel and set the project root directory to `frontend`. Add `VITE_API_URL` with the Render API URL, for example `https://scorenow-api.onrender.com`, then deploy. Vite reads this value at build time, so redeploy the frontend whenever it changes.

Verify the deployed API at `/api/health`, then test both assessment forms and report attachments. Render's free web services may sleep while idle, so the first request after inactivity can take longer.