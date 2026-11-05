# THINK UP

A bilingual (English/Vietnamese) web app that helps students write reflective journals and helps lecturers assess them with AI support. It follows the student and lecturer requirements in `../Final_Requirements`.

## Features

- **Students:** reflection editor with autosave, version history and evidence uploads. Think with AI, AI Coach and Feedback & rubric. Self-assessment before submitting. 9-week journey with action commitments. Personal progress.
- **Lecturers:**
  - My desk, class management and submissions.
  - AI Reading with quotes for each criterion.
  - Grading by rubric, 5-part feedback with templates, revision diffs.
  - Class analytics with CSV export, action tracking, course and rubric setup.
  - AI rubric suggestions from PDF slides: level descriptions are adapted per course from the default rubric, and the lecturer reviews, edits and saves them.
  - Copy rubric, weekly content, deadlines and commitment rules from another course they teach. Deadlines move with a new first date.
  - Internal similarity check.
- **Admins:** users, courses and assignments. Default settings, role permissions and audit log.
- **Everyone:** messages, community feed, profile, English/Vietnamese, works on desktop, tablet and phone.

## Rubric

| Criterion | Weight |
| --- | --- |
| Reflection Depth | 35% |
| Evidence & Context Quality | 25% |
| Insight Realized | 20% |
| Action Plan | 20% |

Each criterion is scored 0–10 (Level 1: 0–2.5, Level 2: 2.6–5.0, Level 3: 5.1–7.5, Level 4: 7.6–10).

These are the default weights. Lecturers can rebalance them per course as long as they total 100%, and can edit the level descriptions. Criterion names and the course name, class and code can only be changed by admins.

- The app computes the weighted total.
- AI proposals and lecturer decisions are stored separately, and the lecturer decides the final result.
- When evidence is missing, the AI marks the criterion for review instead of guessing.

## Run locally

```bash
npm install
npm run dev
```

1. Open the printed URL (usually http://localhost:3000).
2. Go to `/setup` and set a password for `owner@thinkup.local`.

Local data (D1/SQLite and R2) lives in `.wrangler/state`.

## AI

**Codex with a ChatGPT account (no API key):**

```bash
codex login
npm run dev:codex                        # default model: gpt-6-luna
CODEX_MODEL=<model> npm run dev:codex    # use another model
```

**OpenAI API:** set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4.1-mini`) in `.dev.vars`, then restart.

PDF evidence needs Poppler (`brew install poppler`). Without an AI connection, all non-AI features still work.

## Host

```bash
npm run host
```

This prints a temporary HTTPS link and uses the local database and Codex session.

For a fixed domain, run this once:

```bash
cloudflared tunnel login
cloudflared tunnel create thinkup
cloudflared tunnel route dns thinkup thinkup.site
```

Then start the host with:

```bash
THINKUP_TUNNEL=thinkup THINKUP_PUBLIC_URL=https://thinkup.site npm run host
```

Keep the machine on and online. Don't run `npm run dev` at the same time.

## Sample data

```bash
npm run db:seed:showcase -- --replace    # current data is moved to .wrangler/backups/
```

Password for all accounts: `ThinkUp@2026`

| Email | Role |
| --- | --- |
| `sinhvien@thinkup.test` | Student |
| `giangvien@thinkup.test` | Lecturer |
| `admin@thinkup.test` | Admin |

`npm run db:seed` loads the older demo set (password `ThinkUpDemo2026!`) used by the workflow tests.

## Tests

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run test:integration    # end-to-end workflows on a temporary database
npm run test:codex && npm run test:host
```

## Docs

- [Final requirements](docs/final-requirements.md)
- [Requirements audit](docs/requirements-audit-2026-10-25.md)
- [Lecturer workspace](docs/lecturer-workspace.md)
- [Admin workspace](docs/admin-workspace.md)
- [Rubric spec](docs/criteria-spec.md)
- [Design](docs/design.md)
