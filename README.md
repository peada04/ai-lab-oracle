# AI Lab Hardware Oracle

A self-hosted feasibility checker and experiment planner for a home AI lab.

You describe the hardware you actually have. When you find a paper or get an
idea, the Oracle tells you whether it is realistic on your kit — PASS, FAIL or
CONDITIONAL, with reasoning — and if it is, drafts an implementation plan. It
also pulls a live feed of recent `cs.AI` papers from arXiv so you have something
to point it at.

Everything runs on your own machine: Postgres for storage, username/password
auth, and a choice of AI backend. No external services are required beyond
whichever model provider you pick.

## Features

- **Hardware specs** — record your compute, RAM, storage and network; the specs
  become context for every analysis.
- **Feasibility analysis** — PASS / FAIL / CONDITIONAL with reasoning and
  suggestions for making a borderline idea work.
- **Implementation plans** — phased tasks, architecture notes, relevant repos,
  and instructions you can hand to a coding agent.
- **Experiment log** — keep past projects and their learnings; they feed back
  into future feasibility answers.
- **arXiv feed** — recent `cs.AI` submissions, saveable for later.

## Choose an AI backend

Either, or both — the UI has a per-request switch.

- **Google Gemini** — set `GEMINI_API_KEY`. Keys come from
  [AI Studio](https://aistudio.google.com/app/apikey). Users can also set their
  own key in the app's settings panel rather than sharing one server-side key.
- **Any OpenAI-compatible endpoint** — vLLM, Ollama, LM Studio, llama.cpp,
  LocalAI. Set `LOCAL_AI_URL` to its `/v1/chat/completions` path and
  `LOCAL_AI_MODEL` to a model it serves. `LOCAL_AI_API_KEY` is optional and sent
  as a bearer token if your endpoint needs one.

The local path asks the model for strict JSON, so a model that follows
instructions reliably will give you noticeably better results than a very small
one.

## Quick start (Docker)

```bash
git clone https://github.com/peada04/ai-lab-oracle.git
cd ai-lab-oracle
cp .env.example .env
```

Fill in `.env`. At minimum you need `JWT_SECRET` and `PG_PASSWORD`, plus one AI
backend:

```bash
openssl rand -hex 32   # use the output as JWT_SECRET
```

Then:

```bash
docker compose up --build
```

This starts the app and its own Postgres, creating the database and role from
the `PG_*` values in your `.env`.

Open <http://localhost:3000> and register an account. The login you create there
is an application account stored in Postgres — it is unrelated to `PG_USER`,
which is only how the app authenticates to the database. The first user you
register is an ordinary user; there is no separate admin setup.

## Running without Docker

Requires Node.js 22+ and a Postgres you can reach.

Unlike the Docker path — where compose creates the database and its role for you
— an existing Postgres needs the role and database created first. As a superuser:

```sql
CREATE ROLE oracle WITH LOGIN PASSWORD 'your-password-here';
CREATE DATABASE ai_lab_oracle OWNER oracle;
```

Use whatever names you like, then set `PG_USER`, `PG_DB` and `PG_PASSWORD` in
`.env` to match. The role needs to own the database (or otherwise be able to
create tables in it), because the app creates its own schema on first boot.

```bash
npm install
cp .env.example .env     # fill in, and point PG_HOST at your Postgres
npm run build
npm start
```

Tables are created automatically on first boot by the migration step in
`server.ts`. There is no separate migration command to run.

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | yes | — | Signs session tokens. The server exits if unset. |
| `PG_PASSWORD` | yes | — | Password for the Postgres role. |
| `PG_HOST` | no | `postgres` | Postgres hostname. |
| `PG_DB` | no | `ai_lab_oracle` | Database name. |
| `PG_USER` | no | `oracle` | Database role. |
| `PG_PORT` | no | `5432` | Database port. |
| `GEMINI_API_KEY` | no | — | Enables the Gemini backend. |
| `LOCAL_AI_URL` | no | `http://localhost:8000/v1/chat/completions` | OpenAI-compatible endpoint. |
| `LOCAL_AI_MODEL` | no | `local-model` | Model name that endpoint serves. |
| `LOCAL_AI_API_KEY` | no | — | Bearer token for that endpoint, if needed. |
| `APP_PORT` | no | `3000` | Host port to publish on. Change it if 3000 is taken. |

If you are pointing at a model server running on the host from inside Docker,
`localhost` refers to the container. Use `host.docker.internal` (Docker Desktop)
or the host's LAN address instead.

## Architecture

- **Backend** — Express on Node 22 (`server.ts`): auth, data APIs, arXiv proxy,
  and a proxy to your local model endpoint.
- **Database** — Postgres. Schema is created on boot.
- **Auth** — username and password, bcrypt-hashed, with 30-day JWTs.
- **Frontend** — React and Vite, served by the same Express process in
  production.

All `/api` routes except registration, login and health require a valid token,
including the model proxy — so exposing the app does not expose your GPU.

## Deployment notes

`Dockerfile` builds the frontend and serves it from the Node process, so a
single container runs the whole app.

If you put the app behind a reverse proxy with single sign-on,
`authentik-forward-auth-setup.py` provisions an Authentik forward-auth provider
for it. It is entirely optional — the app's own auth works standalone.

Keep `.env` out of version control; it is gitignored. Generate a strong
`JWT_SECRET` rather than reusing one.

## License

MIT — see [LICENSE](LICENSE).
