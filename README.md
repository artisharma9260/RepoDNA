# RepoDNA

AI-powered repository intelligence — chat with any public GitHub repo, generate docs, run security/code-quality scans, build test suites, interview kits, onboarding guides, and more, all grounded in the real code via retrieval-augmented generation.

This project is a full MERN-style stack:

- **Frontend:** Vite + React (JavaScript/JSX) + Tailwind + shadcn-ui
- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **AI:** Google Gemini (free tier, via the Generative Language API)
- **Data:** Live GitHub REST API calls

## Project structure

```
.
├── src/            # React frontend
├── server/         # Express + MongoDB backend API
└── ...
```

## Running locally

You'll need Node.js 18+ and a MongoDB instance (local or [Atlas](https://www.mongodb.com/atlas)).

### 1. Backend

```sh
cd server
cp .env.example .env
# then edit .env: set MONGODB_URI, JWT_SECRET, and GEMINI_API_KEY
npm install
npm run dev
```

The API starts on `http://localhost:8787` by default.

If you don't configure SMTP in `server/.env`, one-time login/signup codes are printed to the server console instead of emailed — handy for local development.

### 2. Frontend

```sh
cp .env.example .env
# defaults to http://localhost:8787/api, matching the backend above
npm install
npm run dev
```

The app starts on `http://localhost:5173` (Vite's default).

## Environment variables

**`server/.env`**

| Variable | Description |
| --- | --- |
| `PORT` | Port the API listens on (default `8787`) |
| `CLIENT_ORIGIN` | Frontend origin, for CORS |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign session tokens |
| `JWT_EXPIRES_IN` | Session token lifetime (default `30d`) |
| `GEMINI_API_KEY` | Your free Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no credit card needed) |
| `GEMINI_MODEL` | Gemini model to use (default `gemini-2.5-flash`) |
| `SMTP_*` | Optional — configure to send real OTP emails |

**`.env`** (frontend)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API |

## What technologies are used for this project?

- Vite
- React (JavaScript/JSX)
- shadcn-ui
- Tailwind CSS
- Express
- MongoDB / Mongoose
- Google Gemini API (free tier)
