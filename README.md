# Kite — Khmer Living Archive

A community archive for kite, a flying object game. It preserves how handmade kites were made and flown so future generations can still experience and learn the tradition. The archive is bilingual (English / ខ្មែរ), backed by Supabase, and lets signed-in contributors submit entries that a reviewer approves before they go public.

Built in ICT 340 at AUPP.

## 1. What this is

This is a small, public archive of Khmer kite making and kite story memories drawn from my own childhood in Cambodia and from the people who taught me how to build and fly them, my older brother and sister, my friends. Users can browse published entries, search by title, contributor, place, or description, and read each entry in English or Khmer. Anyone who wants to add a story need to sign up, submit an entry with either English or Khmer details and photos, and wait for a reviewer to approve and publish it. Sincee many Khmer teenagers and adults do not read English, a bilingual interface lets them read these memories and share their own stories in Khmer.


## 2. Who it's for

The people who would use this archive are Khmer people, parents, and older relatives who remember making and flying kites as well as English speakers who want to explore and preserve these recollections.

What I built and adjusted for them:

- **Khmer first.** - **Khmer first.** A header toggle switches the entire site between English and Khmer. On `/contribute`, the form adapts to the active language toggle so contributors can write and submit their story in either Khmer or English without being forced to translate it first. On public pages, entries always render in the language they were submitted in even if the visitor toggles the site language—with a clear label underneath indicating whether the entry is written in Khmer or English.
- **Phones first.** The layout stacks into a single column on narrow portrait screens and shifts to two columns on wider landscape phone viewports before expanding to three columns on desktop; I tested the pages at narrow phone width in the browser's device toolbar and on a phone viewport.
- **Slow connections.** Entries prioritize text plus lightweight photos served from Supabase Storage with caching, and list views show a plain loading state instead of blocking the whole page.
- **Sources are named and credited.** Only title, description, and image are required when submitting an entry, while contributor and places (in both English and Khmer) are optional and displayed on the detail page when provided. Overall archive attribution lives in collection.config.js (credited to "My siblings and friends") and appears in the site intro rather than as per-photo credits on each image.

## 3. How it works

**Stack & layout.** Built with Next.js 15 (App Router) and React 19, deployed on Vercel. Supabase provides email/password accounts, PostgreSQL tables, and storage. `middleware.js` refreshes the Supabase auth session on each request so server components see a valid session.

- `collection.config.js` — single source of truth for archive identity (`name`, `description`, `curator`, and `source` as `{ en, km }` objects) and the `pick(field, language)` helper that falls back to English when Khmer is missing.
- `app/` — Next.js App Router pages for each route above; `layout.js` wraps every page in the language provider and header.
- `components/` — shared UI (`header.js`, `entryCard.js`).
- `contexts/language-context.js` — shared EN / ខ្មែរ language state.
- `lib/` — Supabase clients (`supabase-client.js`, `supabase.js`), reviewer check (`reviewer-auth.js`), and helpers (`file-validation.js`, `format-date.js`).
- `data/` — sample/reference data and assets.

**Tables & storage.**

- **`entries`** — one row per archive entry: `id`, `owner` (auth user ID set from the session, never a form field), `title_en`, `title_km`, `contributor_en`, `contributor_km`, `places_en`, `places_km`, `description_en`, `description_km`, `photo_urls` (array of public storage URLs), `status`, `review_note`, `created_at`. Default `status` is `pending`.
- **`reviewers`** — one row per authorized reviewer (`user_id`). `lib/reviewer-auth.js` checks membership for UI rendering (`select user_id ... eq user_id ... maybeSingle()`).
- **Storage bucket `photos`** — stores uploaded entry photos under `<user_id>/<random_uuid>.<ext>` and saves public URLs in `photo_urls`.

**Entry statuses.**

| Status | Meaning |
|---|---|
| `pending` | Newly submitted. Visible to its owner and to reviewers; hidden from public browse/search. |
| `published` | Approved by a reviewer. Shown on `/`, `/browse`, and `/entry/[id]`. |
| `returned` | Sent back by a reviewer with a `review_note` explaining what to revise; the owner can edit and resubmit. |




**Access & RLS policies.** Row Level Security (RLS) is enabled on both `entries` and `reviewers` in Supabase so the database enforces read and write rules directly:

- **`entries` table:**
  - `anyone can read published entries` (`SELECT` for `public`) — allows logged-out and signed-in visitors to read published entries (plus owner/reviewer read conditions configured in the policy).
  - `owners add their own entries` (`INSERT` for `authenticated`) — restricts inserts to the signed-in owner.
  - `owners edit their own entries` (`UPDATE` for `authenticated`) — lets contributors edit only their own entries without self-publishing.
  - `owners delete their own entries` (`DELETE` for `public`) — restricts deletion to the entry's owner (`auth.uid() = owner`).

- **`reviewers` table:**
  - `Only reviewers can read reviewers table` (`SELECT` for `authenticated`) — restricts reviewer lookups to authorized reviewer accounts.




## 4. Security decisions

**The gate.** A reviewer approves or returns an entry by calling a database function, not by flipping a field in the browser:

```js
supabase.rpc('review_entry', { entry_id, decision, note_text })
```

- `decision` is `'published'` or `'returned'`; `note_text` is saved on the entry as `review_note`.
- The reviewer queue requires an explicit boolean true response (data === true) from the review_entry RPC before updating the UI; if the database returns false, null, or an error, the client treats the request as failed and leaves the entry in the pending queue.
- The function lives in the database so the decision is made server-side. A hidden Publish button is not a security control: it only hides the UI. Anyone can open the console and call `update` directly — what actually stops them is the RLS policy and the `review_entry` function refusing the call. The gate is the database, not the button.

**Decisions the briefs left to me:**

- **What a returned entry says.** Returning an entry *requires* a reason. The return modal will not submit an empty note, and the text is saved as `review_note` so the contributor can read exactly what to fix. Approving instead attaches a default thank-you note (`APPROVAL_NOTE`, translated).
- **Can reviewers take down published entries?** No. The reviewer queue only lists `pending` entries, and the review action only moves `pending → published` or `pending → returned`. A published entry cannot be pulled back through the review UI. If taking one down is needed, it would be a deliberate change, not an accident of the interface.
- **What search shows a contributor about their own pending entries.** Search on `/browse` and the home page only reads `published` rows. A contributor's own pending entries are not searchable there; they appear only on `/my-entries`, which is filtered by owner. The archive's public face never leaks an unpublished entry.
- - **How bilingual entries are submitted and displayed.** Instead of requiring every contributor to fill out both English and Khmer fields—or showing blank cards when a visitor switches languages—`/contribute` follows the active language toggle (EN or ខ្មែរ) so contributors can submit in the language they know best. Public pages display the entry in its submitted language regardless of the active toggle, accompanied by a text label underneath noting whether the entry is in Khmer or English so nothing disappears or breaks across language modes.
- **Flexible Image Uploads:** Contributors can attach entry photos via standard file selection, drag-and-drop, or direct clipboard copy-and-paste (`Ctrl+V` / `Cmd+V`).

## 5. AI use

prompt "Update the contribute and edit forms so that language priority adapts to the active lang toggle:
Make the fields matching the active language (_km when lang === 'km', _en when lang === 'en') required with a * badge, and make the other language fields optional.
Display the active language's input fields first on the form, followed by the secondary language fields."

### Breakdown of Your Session
- Technique: Conditional UI & form validation prompting (specifying dynamic required state and field ordering driven by the lang context state).
- What came back (and where AI got it wrong):
  1. Schema / database mismatch: The initial code updated the UI * required badges, but submissions failed when submitting Khmer-only entries because the database originally expected English fields to be required—so you had to update your database/table constraints to allow Khmer-primary submissions.
  2. Dropped secondary fields: On the next pass, the model over-corrected and hid the inactive language fields completely (showing only English or only Khmer), breaking your requirement that both sets of fields stay visible so bilingual contributors can fill out both if they want.
- What you did before accepting: You tested submitting a Khmer-only entry in the browser, caught the failed insert and missing secondary fields in the UI/diff, updated the database constraint/policy to allow Khmer-only entries, and re-prompted DeepSeek v4.1 flash to keep both language field groups rendered while dynamically prioritizing and requiring only the active language (_km or _en).

prompt :I need to work on translations to make sure that when toggled to Khmer, everything is in Khmer. Let's do this one file at a time

### Breakdown of Your Session
- Technique: Incremental, file-by-file localization prompting (scoping translation work one file at a time so all visible UI text renders in Khmer when toggled).
- What came back: The translation succeeded overall, but produced some mistranslations on buttons or navigation headers because Khmer translation data is limited or less accurate, requiring you to retype words for the AI to insert instead.
- What you did before accepting: Because you read Khmer, you proofread key UI elements—such as buttons and action labels—so they would not sound awkward or confuse users (without rereading every single word), and then provided the corrected wording to fix them.

I used AI assistance throughout the semester in VS Code via Cline, using DeepSeek (`v3.2` in the earlier setup/auth/search stage, and `v4.1 flash` for later form and translation updates) alongside Gemini (`3.5 flash lite`). Every commit that used AI assistance is marked `[ai assisted]` in the git log. This section replaces the Prompt Journal.

| Model | Task | What I kept / changed | Verdict |
|---|---|---|---|
| DeepSeek (`v3.2`) | Early setup: Supabase integration, search, and login / sign-up flows | Kept the core auth, search, and Supabase connection structure; adjusted policies and flows after review | Solid starting point with gemini review |
| DeepSeek (`v4.1 flash`) | Reviewer gate setup, form language priority (`/contribute` and `/entry/[id]/edit`), and Khmer UI translations | Fixed DB constraints, restored hidden secondary fields, and proofread/corrected Khmer labels | Useful for iteration, required careful testing |
| Gemini (`3.5 flash lite`) | Reviewing and planning code and Supabase RLS policies | Cross-checked policies and edge cases against actual app behavior | Helpful second check when verified in code |

How I checked the work: I ran `npm run dev` after each change, read the diff before committing, and tested the review flow with a second (stranger) account signed out, signed in as a non-reviewer, and signed in as a reviewer to confirm the gate held.



## 6. Sources and credits

The archive's entries come from my own family and friends in Siem Reap. Each entry names its source in the `contributor` and `places` fields, in both languages:

- **Eakhout** — the black plastic "stealth" kite, Siem Reap.
- **kimlang** — the bright pink sticker kite, Siem Reap.
- **My friend** — the backyard rice-field kite, flown behind the house.
- **My friend** — the heart-decorated plastic kite, flown in the open space near the house.

Reference images were saved from the internet without credit given, while contributors can upload their own photos and state in detail whether the kite or memory is theirs or someone else's. Collection-level attribution is credited to `"My siblings and friends."` (`"បងប្អូន និងមិត្តភក្តិរបស់ខ្ញុំ។"`) under curator `Songhai Im` (`សុងហៃ អ៊ឺម`) in `collection.config.js`



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




1. Clone the repo and install dependencies:

   ```bash
    git clone https://github.com/haihai942/kite.git
    cd kite
    npm install
    ```

2. I already have `.env.local` set up locally (it's git-ignored so I don't commit it). If you're running this on a fresh machine, check `.env.example` and add your Supabase project values from **Settings → API**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

   The publishable key is meant to be public in the browser bundle—Row Level Security (RLS) is what protects the data. I don't use or commit any secret or service-role key here.

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Then open `http://localhost:3000`.

For production, Vercel builds and hosts the app automatically—I just added those same two environment variables under **Project → Settings → Environment Variables** in Vercel. If I ever want to test a production build locally on my machine instead, I run:

```bash
npm run build
npm run start
```

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

