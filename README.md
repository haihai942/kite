# Kite — Khmer Living Archive

A community archive for **Kite**, a Khmer game. It preserves how the game was played so future generations can still learn it. The archive is bilingual (English / ខ្មែរ), backed by Supabase, and lets signed-in contributors submit entries that a reviewer approves before they go public.

Built in ICT 340 at AUPP.

## 1. What this is

This is a small, public archive of Khmer kite-making and kite-flying memories. The entries come from my own childhood in Cambodia and from the people who taught me the game — my older brother and sister, my friends, and the places we played. Someone visiting the site can browse published entries, search by title, contributor, place or description, read each entry in English or Khmer, and — if they sign up — submit their own kite memory for a reviewer to check before it appears in the archive. The sentence I would say to a stranger: *I built a bilingual website that saves how Khmer kids used to make and fly kites, so the next generation can still find it.*

## 2. Who it's for

The people who would use this archive are Khmer speakers in Cambodia — students, parents, and older relatives who remember the game — and the diaspora who want a place to point at and say "this is what we did."

What I did for them, and what I changed because of them:

- **Khmer first.** Every entry stores an English and a Khmer version side by side, and the header toggle switches the whole site between EN and ខ្មែរ. Khmer text is treated as first-class content: it is never stripped, transliterated, or "fixed."
- **Phones first.** The layout is inline-styled and stacks into a single column on narrow screens; the entry grid collapses from three columns to one. I tested the pages at phone width in the browser's device toolbar.
- **Slow connections.** Entries are text plus one photo, not a media-heavy page. Photos are served with a one-hour cache header, and the lists show a plain loading state instead of blocking the page.
- **Sources are named and credited.** Every entry records who it came from and where it happened (the contributor and place fields, in both languages), and the detail page shows both. The source of the collection as a whole lives in `collection.config.js` and is shown in the site's intro.

## 3. How it works

**The stack.** Next.js 15 (App Router) + React 19, deployed on Vercel. Supabase provides accounts (email + password), the `entries` table, and the `photos` storage bucket. `middleware.js` refreshes the Supabase session on every request so server components see a valid login.

**The tables.**

- **`entries`** — one row per archive entry. Columns used by the app: `id`, `owner` (the auth user's id, set from the session and never from a form field), `title_en`, `title_km`, `contributor_en`, `contributor_km`, `places_en`, `places_km`, `description_en`, `description_km`, `photo_urls` (array of public storage URLs), `status`, `review_note`, `created_at`. The database default for `status` is `pending`.
- **`reviewers`** — one row per user who is allowed to review. `lib/reviewer-auth.js` checks it with `select user_id ... eq user_id ... maybeSingle()`; if a row exists, the user is a reviewer. The reviewer link in the header only appears for these users.
- **Storage bucket `photos`** — public bucket; uploads go to `<user_id>/<random_uuid>.<ext>`, and the app stores the resulting public URL in `photo_urls`.

**The three statuses.**

| Status | Meaning |
|---|---|
| `pending` | Just submitted. Visible to its owner and to reviewers; hidden from the public. |
| `published` | Approved by a reviewer. Shown on `/`, `/browse`, and the entry detail page. |
| `returned` | Sent back by a reviewer with a `review_note` explaining what to fix. The owner can edit and resubmit. |

**The policies.** The browser queries Supabase directly (there is no custom API layer for entries), so row-level security is what decides who reads and writes what. As written in the app:

- `/` and `/browse` query `entries` with `.eq('status', 'published')`, so the public list only ever asks for published rows.
- `/my-entries` queries `.eq('owner', user.id)`, so a contributor only asks for their own rows.
- `/reviewer-queue` queries `.eq('status', 'pending')`, and only renders for users in the `reviewers` table.
- Edits and deletes go through `supabase.from('entries').update(...)` / `.delete().eq('id', ...)`; the comment in `my-entries/page.js` relies on RLS to make sure only the owner can do this.

> **UNSURE:** the exact `CREATE POLICY` SQL for `entries` (and whether reviewers can read/update every row, or only `pending` ones) lives in the Supabase dashboard, not in this repo — `migrations/` is empty. The paragraph above describes what the client *asks for*; the policies that enforce it are configured in Supabase. Fill this in from the dashboard before the Q&A.

## 4. Security decisions

**The gate.** A reviewer approves or returns an entry by calling a database function, not by flipping a field in the browser:

```js
supabase.rpc('review_entry', { entry_id, decision, note_text })
```

- `decision` is `'published'` or `'returned'`; `note_text` is saved on the entry as `review_note`.
- The reviewer queue treats anything other than a literal `true` return as a failure and leaves the entry in the queue.
- The function lives in the database so the decision is made server-side. A hidden Publish button is not a security control: it only hides the UI. Anyone can open the console and call `update` directly — what actually stops them is the RLS policy and the `review_entry` function refusing the call. The gate is the database, not the button.

**Decisions the briefs left to me:**

- **What a returned entry says.** Returning an entry *requires* a reason. The return modal will not submit an empty note, and the text is saved as `review_note` so the contributor can read exactly what to fix. Approving instead attaches a default thank-you note (`APPROVAL_NOTE`, translated).
- **Can reviewers take down published entries?** No. The reviewer queue only lists `pending` entries, and the review action only moves `pending → published` or `pending → returned`. A published entry cannot be pulled back through the review UI. If taking one down is needed, it would be a deliberate change, not an accident of the interface.
- **What search shows a contributor about their own pending entries.** Search on `/browse` and the home page only reads `published` rows. A contributor's own pending entries are not searchable there; they appear only on `/my-entries`, which is filtered by owner. The archive's public face never leaks an unpublished entry.

## 5. AI use

I built this with AI assistance throughout (Cline in VS Code, with an AI coding model driving the edits). Every commit that used it is marked `[ai assisted]` in the git log. This section replaces the Prompt Journal.

| Model | Task | What I kept / changed | Verdict |
|---|---|---|---|
| UNSURE — *fill in the model name* | Scaffolding the four feature pages, the Supabase clients and the middleware | Kept the structure; rewrote the copy and the Khmer strings | Used as a base, then edited |
| UNSURE — *fill in the model name* | Building the review queue and the `review_entry` call | Kept the strict `data !== true` check; rewrote the error messages | Kept as written |
| UNSURE — *fill in the model name* | Khmer translations across pages | Kept most; corrected wording where it drifted from the entries | Kept with edits |
| UNSURE — *fill in the model name* | This README's first draft | Kept the section order; rewrote the UNSURE spots against the code | Rewritten |

How I checked the work: I ran `npm run build` after each change, read the diff before committing, and tested the review flow with a second (stranger) account — signed out, signed in as a non-reviewer, and signed in as a reviewer — to confirm the gate held.

> **UNSURE:** the model names and the split between "kept as written" and "rewritten" are mine to fill in from my actual sessions. I did not want to guess.

## 6. Sources and credits

The archive's entries come from my own family and friends in Siem Reap. Each entry names its source in the `contributor` and `places` fields, in both languages:

- **My big brother** — the black plastic "stealth" kite, Siem Reap.
- **My big sister** — the bright pink sticker kite, Siem Reap.
- **My friend** — the backyard rice-field kite, flown behind the house.
- **My friend** — the heart-decorated plastic kite, flown in the open space near the house.

Photos I did not take myself are credited in the entry they belong to. The collection as a whole credits "My siblings and friends" in `collection.config.js`.

> **UNSURE:** the contributors are named by relationship ("My Big Brother", "My Friend A") rather than by personal name. If any of them gave permission to be named in full, add those names here; if someone asked not to be named, say so in the form the brief asks for (e.g. "a weaver in Takeo who asked not to be named").

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

## 7. Running it locally

```bash
git clone https://github.com/haihai942/kite.git
cd kite
npm install
```

Create a `.env.local` file in the project root (it is git-ignored — never commit it) with your Supabase project's values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

See `.env.example` for the shape of these variables. Get the values from your Supabase project settings → API.

The publishable key is **public by design**: it is the key Supabase expects to ship in the browser bundle, and it is safe to expose because row-level security, not the key, protects the data. The secret/service-role key is never used in this repo and must never be committed.

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

## 8. Submission checklist

- Live URL loads logged out and shows published entries only: UNSURE, (fill in URL)
- A stranger cannot publish their own entry through the page or the console: UNSURE, tested (fill in date)
- Logged out, the API returns nothing pending or returned: UNSURE, tested (fill in date)
- Contributors can edit and delete only their own entries: yes — `/my-entries` filters by `owner`, and the delete comment relies on RLS
- No secrets anywhere in the repo history: yes — checked with `git log --all -p` and a `git grep` over all commits for key patterns; `.env.local` is git-ignored
- At least eight real entries, each with a credited source: UNSURE, (fill in count)
- Khmer renders on every screen a user meets, including the queue: yes — every page has EN/ខ្មែរ labels
- Works at phone width: UNSURE, tested on (fill in device or browser width)
- No test entries, lorem ipsum or TODO comments in shipped pages: UNSURE, needs a final pass
- No console errors on the main pages: UNSURE, needs a final pass
- jesseorndorff is a collaborator on this repo: UNSURE, (fill in)
- Supabase project restored and awake on (fill in date)
- Demo video link opens in a private window: UNSURE, (fill in link)
- Reflection pasted in the Canvas submission: UNSURE, (fill in)
- Posted in the Show Your Archive discussion: UNSURE, (fill in)
- Q&A slot booked for (fill in date and time)

## Rules of the road

You own what you ship. Every line that lands in this repository is yours to explain, whoever or whatever wrote it.

