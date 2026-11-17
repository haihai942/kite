# Kite — Khmer Living Archive

A community archive for **Kite**, a Khmer game. It preserves how the game was played so future generations can still learn it. The archive is bilingual (English / ខ្មែរ), backed by Supabase, and lets signed-in contributors submit entries that a reviewer approves before they go public.

Built in ICT 340 at AUPP.

## What it does

- **Browse and search** — published entries are listed on the home page and on `/browse`, where you can search by title, contributor, place, or description.
- **Contributor accounts** — sign up and log in with email and password (`/signup`, `/login`).
- **Own your entries** — `/my-entries` shows your own submissions, filterable by status, with edit and delete.
- **Submit → review → publish** — new entries start as `pending`, a reviewer can `published` or `returned` them from `/reviewer-queue`, and only published entries appear to the public.
- **Bilingual** — every entry stores English and Khmer text side by side, and a header toggle switches the whole site between EN and ខ្មែរ.

### Routes

| Path | Purpose |
|---|---|
| `/` | Home — collection intro + preview of published entries |
| `/browse` | Search and browse all published entries |
| `/entry/[id]` | Full detail view of a single entry |
| `/entry/[id]/edit` | Edit one of your own entries |
| `/contribute` | Submit a new entry (photo + bilingual fields) |
| `/my-entries` | Your own entries, filterable by status |
| `/reviewer-queue` | Review pending entries (reviewers only) |
| `/login`, `/signup` | Contributor authentication |

## Setup

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
npm install
```

Create a `.env.local` file in the project root (it is git-ignored — never commit it) with your Supabase project's values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

See `.env.example` for the shape of these variables. Get the values from your Supabase project settings → API.

Then run it:

```bash
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm run start
```

On Vercel, add the same two environment variables under **Project → Settings → Environment Variables**.

## How it is put together

- **`collection.config.js`** — the single source of the archive's identity (name, description, curator, source). Pages read from it; nothing else hard-codes those values.
- **`app/`** — Next.js App Router pages, one folder per route above. `layout.js` wraps every page in the language provider and header.
- **`components/`** — shared UI (`header.js`, `entryCard.js`).
- **`contexts/language-context.js`** — the EN / ខ្មែរ language state shared across pages.
- **`lib/`** — Supabase clients (`supabase-client.js`, `supabase.js`), reviewer check (`reviewer-auth.js`), and helpers (`file-validation.js`, `format-date.js`).
- **`data/`** — sample entries and images.
- **`middleware.js`** — refreshes the Supabase auth session on each request.

## Rules of the road

You own what you ship. Every line that lands in this repository is yours to explain, whoever or whatever wrote it.

