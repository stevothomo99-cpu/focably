# FocablyED — Claude Session Context

> **Instructions:** Paste this file (or relevant sections) at the start of each Claude session.
> Update the "Current Status" and "Session Log" sections after each session.

---

## Project Overview

**App:** FocablyED — gamified school task and accountability tool for parents, students, and teachers. ADHD-friendly design is a core value proposition.
**Live App URL:** https://app.focablyed.com (Vercel project `focably`, deploys from `stevothomo99-cpu/focably` main)
**Landing Page URL:** https://focablyed.com (Vercel project `focably-landing`, separate repo `stevothomo99-cpu/focably-Landing`)
**Admin Dashboard URL:** https://app.focablyed.com/admin.html (email-gated, see Admin Dashboard section)
**Stack:** Modular vanilla HTML/CSS/JS — `index.html` + 7 `js/*.js` files, Supabase backend, deployed on Vercel (no build step)
**Supabase project:** mxgnrgajspprupzxaeld.supabase.co
**GitHub repo (app):** stevothomo99-cpu/focably
**GitHub repo (landing page):** stevothomo99-cpu/focably-Landing

> **IMPORTANT:** The live app entry point is **`index.html`** (1.5K lines of HTML) which loads **7 modular JS files in `js/`** (see Architecture Summary). `focably.html` is an OLD prototype — **IGNORE IT.** All app code lives in `js/*.js`.

---

## Branding

- **Name:** FocablyED (made-up word: Focus + Ability + ED suffix for education)
- **Mascot:** Squirrel 🐿️ — named by Zoe (Steve's daughter, 15, ADHD), inspired by Doug from Pixar's UP ("SQUIRREL!")
- **Logo:** `squirrel.png` committed to app repo — orange squirrel holding acorn, dark teal rounded-square. Deployed as favicon, PWA icon, nav logo, auth screen, settings card, install banner, landing page hero + nav + footer.
- **Logo URL:** `https://raw.githubusercontent.com/stevothomo99-cpu/focably/main/squirrel.png`
- **Domains (all via Crazy Domains):**
  - focablyed.com ✅ (primary)
  - focablyed.com.au ✅ (Australian market)
  - focablyed.app ✅ (app-specific)
  - facably.com, facably.app, facablyed.com, facablyed.app ✅ (typo purchases — keep as redirects)
- **DNS:** Crazy Domains nameservers → Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- **M365 email:** ✅ Fully set up. focablyed.com verified in M365. DNS managed via Vercel (ns1/ns2.vercel-dns.com). Mailboxes: steve@ (primary licensed), hello@/privacy@/noreply@ (aliases on steve@), support@ (shared mailbox, no extra licence). schools@ to add when needed.
- **Note:** focably.com was domain-sniped by Namecheap — never use Namecheap again. Consider migrating to Cloudflare Registrar long term.

---

## Founders

- **Kim Thomas** — Co-founder, the idea person. Identified the problem, drove the vision. "There has to be a better way."
- **Steve Thomas** — Co-founder, doer of things, builder of stuff. CA-qualified CFO, Brisbane.
- **Zoe Thomas** (15, ADHD) — Unofficial head of product. Named the mascot. Invented the AI photo theme generator idea.
- **Georgie Thomas** (13) — Beta tester #2.

---

## Architecture Summary

- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres with RLS enabled
- **Frontend:** `index.html` (1522 lines — HTML + 7 `<script src>` tags). All app logic split into:
  - `js/01-config.js` (326 lines) — Supabase + Stripe keys, theme defs, all global `let`/`const`
  - `js/02-init.js` (148 lines) — pull-to-refresh, window.load, `onAuthStateChange`, `showScreen`
  - `js/03-auth-onboarding.js` (636 lines) — sign in/up, `loadProfile`, onboarding, photo avatar
  - `js/04-student.js` (779 lines) — student app, task completion, proof upload, link-to-family
  - `js/05-parent.js` (1809 lines) — parent app, rewards, families, brain dump, MS Teams, imports, school setup, assignment detail, Stripe checkout
  - `js/06-teacher.js` (467 lines) — teacher app, step builder
  - `js/07-shared.js` (1456 lines) — confetti, refresh, role switcher, AI breakdown, notifications/PWA, shared approval queue, archive, hamburger drawer, dbQuery helper
  - Load order matters — globals in earlier files used by later ones. Vanilla JS, no modules, no framework, no build step.
  - Backup of pre-refactor 7138-line single-file `index.html` at `backup/index-pre-refactor.html`.
- **User roles:** Student (primary + high-school modes), Parent, Teacher (plus Admin via `admin.html`)
- **Service Worker:** `sw.js` caches all 7 JS files for offline use. Bump `CACHE_NAME` when any cached file changes (current: `focably-v2-modular`).
- **Deploy:** push to GitHub `main` → Vercel auto-deploys (Vercel project `focably` watches `stevothomo99-cpu/focably` main branch)

---

## Edge Functions (Supabase)

All deployed at `mxgnrgajspprupzxaeld.supabase.co/functions/v1/<slug>`. **Verify JWT is sticky and can revert to ON after a redeploy — always re-check after deploying any function.**

| Function | Purpose | Verify JWT |
|---|---|---|
| `send-transactional` | Instant per-event emails — proof submitted/approved/rejected, reward requested/approved/rejected, assignment published (parent+student, home task vs class), nudge, child joined family, school approved, student joined class. Routes on `{type, data}`; age-gates student templates (primary vs secondary copy). | OFF |
| `send-digest` | Weekly Sunday 6pm AEST parent summary (tasks done, stars, XP, streaks) | OFF |
| `send-warnings` | Daily 7am AEST due-date alert — overdue / due today / due soon (+1-2d) / due this week (+3-7d) buckets, queries `assignments` directly | OFF |
| `send-push` | Web push notifications (VAPID) | OFF |
| `stripe-webhook` | Verifies Stripe signature, handles `checkout.session.completed` / `customer.subscription.deleted` → updates `families.subscription_status` + all linked children's `profiles.subscription_status`. Session 15: also stamps `families.first_paid_at` on first conversion, and logs a `churn_events` row (`subscription_canceled`, `was_ever_paid=true`) on cancellation, carrying Stripe's `cancellation_details` in `metadata` when present | OFF |
| `create-checkout-session` | Creates a Stripe Checkout session server-side, returns hosted URL (client-only `redirectToCheckout` is deprecated by Stripe) | ON (called by logged-in parent) |
| `hubspot-sync` | Landing page waitlist form → HubSpot Contact + Deal. **Fixed 07 Jul 2026** — was stuck at Verify JWT ON since it was first built, silently 401'ing every call from the anonymous landing page before it ever reached the function (zero log entries ever, unlike every other function). Now OFF. | OFF |
| `ai-generate` | Server-side Claude API proxy — holds `ANTHROPIC_API_KEY` secret, never exposed to the browser. Maps any request model to `claude-sonnet-5` (original `claude-sonnet-4-20250514` was retired 2026-06-15). `thinking` disabled to preserve the short JSON-output behaviour the app expects. Capped at 2000 max_tokens. | ON (called by logged-in user) |
| `invite-child` | Parent invites a child directly by email (no invite code) — verifies caller owns the family, generates a Supabase invite link, emails it via Resend | ON (called by logged-in parent) |

---

## Landing Page

- **Repo:** stevothomo99-cpu/focably-Landing
- **Live at:** focablyed.com
- **Stack:** Single file index.html — vanilla HTML/CSS/JS, no framework
- **Fonts:** Fraunces (display serif) + Inter (body)
- **Palette:** Warm amber/cream — #E8A020 amber, #FBF7F0 cream, #1E1712 ink
- **Waitlist:** Supabase `waitlist` table (RLS disabled, public inserts)
- **Story section:** Kim + Steve co-founders, real ADHD family narrative, "out of sight out of mind" insight
- **TODO:** Some remaining "Focably" references need updating to "FocablyED"
- **TODO:** Add focablyed.com.au as second domain in Vercel

---

## Working Method

- Claude pulls `index.html` from GitHub via API, edits locally, pushes back.
- **GitHub token:** `ghp_xxxx` code from github.com/settings/tokens — paste in chat, push, revoke immediately.
- Steve cannot code — product owner/tester only. Claude writes all code.
- Common bug pattern: **inline onclick with JSON/quotes breaks HTML attributes**. Always use data-* attributes + handler functions.
- **GitHub push method:** Always use Python urllib.request (NOT curl) for large file pushes — curl fails on large files.
- **Token splitting:** Required to avoid GitHub secret scanning blocking HubSpot pat- tokens.
- **Multiple parallel Claude Code web sessions:** Steve often runs more than one session at once, each on its own auto-named branch (e.g. `claude/focablyed-app-4-*`, `claude/facablyed-app-5-*`), merged to `main` independently. This context doc is updated per-session and can fall behind a sibling session's merges — **before starting new work, run `git log --oneline <last-documented-commit>..origin/main -- js/ index.html` to check for undocumented merges from another session**, not just trust the Session Log's most recent entry. As of Session 14, Steve is consolidating ongoing work into one session, referred to as **"FocablyED App #5"** — treat that as the primary/active session going forward.

---

## Business Model & Pricing

### Core principle
**Everyone signs up free. You only pay when you want to connect roles.**
- Students never pay
- Teachers never pay directly
- Money flows from parents (Family Pro) and schools (license)

### Go-to-Market Strategy
- **Parent-first** — target 50 paying Family Pro families before active school sales
- School build stays in the app (credibility layer for future B2B conversations)
- Once 50+ families paying, approach schools with proof of parent adoption in their catchment
- Natural funnel: parent discovers app → upgrades to Pro → brings to school → school licenses

### Full pricing structure

| Tier | Price | Students | Parents | Notes |
|---|---|---|---|---|
| Freemium | Free | — | 1 child, no teacher connection | Top of funnel |
| Family Pro (standalone) | $9.99/mo or $89/yr | — | Full features + teacher connection | Standalone families |
| Family Pro (school-attached) | $4.99/mo or $39/yr | — | Full features + teacher connection | Detected via school_id on family |
| School Small | $990/yr | ≤300 | Discounted at $4.99/mo | Dept head approval |
| School Medium | $1,990/yr | ≤800 | Discounted at $4.99/mo | Dept head approval |
| School Large | $3,490/yr | Unlimited | Discounted at $4.99/mo | — |
| School Platinum | $5,990/yr | Unlimited | **Fully included** | Enterprise — whole school covered |

> **Note:** Annual price is $89/yr (not $79/yr) — avoids deep discount that trains buyers to wait for annual.

### Freemium gates
- Adding a 2nd child → upgrade prompt
- Parent joining a class (teacher connection) → upgrade prompt
- Student using a class code → family needs Family Pro (unless school license covers it)

### School Platinum positioning
- Enterprise/principal-level sale — one invoice covers everyone
- No parent billing friction, no chasing families
- Suitable for NDIS/wellbeing budget funding (single line item)
- Premium extras: priority support, dedicated onboarding, custom school branding, early feature access, annual review call

### The natural upgrade moment
> Teacher sends class code to parent → parent taps "Join a Class" → paywall: "Upgrade to Family Pro to connect with your child's teacher"

### Market sizing
- Australia: ~4,500 schools / NZ: ~1,200 / UK: ~8,000 / Canada: ~6,000 / USA: ~50,000
- Total addressable: ~70,000+ schools
- Go-to-market: parent-led → Family Pro → parent brings to school → school license
- ADHD angle: target SENCOs (UK), learning support coordinators (AU), NDIS budgets

---

## Payments — Stripe

- **Steve has an existing Stripe account** — use from day 1
- **Test mode first**, then flip to live when ready
- Stripe fees: 1.7% + 30c for Australian cards (vs Apple's 30%)
- Web/PWA via Stripe bypasses all App Store cuts
- **Stripe Checkout products to create:**
  - Family Pro Monthly: $9.99/mo
  - Family Pro Annual: $89/yr
  - School licenses: manual/invoiced for now, Stripe later
- **Webhook flow:** Stripe payment confirmed → webhook → Supabase `families.subscription_status` = 'pro'

---

## App Store Strategy

- **Current:** Web/PWA via Vercel + Stripe — bypasses all store cuts
- **Future iOS:** Capacitor wrapper (wraps existing HTML app in native shell)
  - Cost: ~$2,000–$5,000 dev time
  - Requires: Mac + Xcode (free, ~15GB) + Apple Developer account ($149 AUD/yr)
  - Steve can do this himself on a Mac — Claude writes all config, Steve runs commands
  - Apple takes 30% year 1, 15% year 2+ (small business program: 15% from day 1 if <$1M revenue)
- **Future Android:** Capacitor wrapper, easier than iOS, no Mac needed
  - Google Play Developer account: one-time $30 USD
  - Google Play takes 15% flat on subscriptions
- **Trigger to build:** 500+ active users OR schools asking "is there an app?"
- **Web funnel strategy:** Drive parents to focablyed.com to subscribe via Stripe BEFORE downloading app — Apple can't touch web transactions

---

## Theme System

### Strategic framing
**Themes are an ADHD engagement and retention tool — NOT a monetisation line.**
- Switching themes = dopamine hit = opens the app
- Personal aesthetic = identity ownership = emotional investment
- Fresh look = breaks "same boring app" fatigue
- Engaged student → parent sees it working → parent stays subscribed → word of mouth

### Theme tiers
- **Free tier:** 2-3 preset themes (enough to feel the feature)
- **Pro tier:** full theme library + AI photo theme generator
- Theme switching: instant, frictionless, celebrated in UI

### Theme marketplace (future — 10,000+ users)
- Theme store: individual themes ($0.99–$2.99) or unlock via XP milestones
- Limited/seasonal drops create urgency and social currency
- At <10,000 users: not worth the build complexity

### Evocative aesthetics (not licensed IP)
Can't use TV show names/characters directly. Instead use evocative aesthetics that fans immediately recognise:
- ⚡ "Ancient Lightning" — Percy Jackson vibe (gold, ocean blue, lightning, laurel wreaths)
- 🌙 "Midnight" — dark mode, older/cooler crowd
- 🌸 "Soft Hour" — pastel, cottagecore, aesthetic girls
- 🤖 "Neural" — cyberpunk/tech
- ⚽ "Match Day" — sport obsessives
- 🎮 "Respawn" — gaming crowd
- 🌿 "Off Grid" — nature/calm
- 🎨 "Studio" — art kids
- 🔥 "Grunge" — outliers
- ✨ "Vanilla" — clean minimalist

### Studio licensing roadmap (long term)
- At scale (50,000+ students) studios will take the call
- Rick Riordan Presents (Disney), Netflix shows, etc.
- Keep themes evocative (not explicit) until then — legally safe

### Zoe's AI photo theme generator (Zoe's idea — unofficial head of product 🐿️)
- Student uploads 3-5 photos (their aesthetic, vibe, fandom)
- AI analyses colours, mood, style → generates unique custom theme
- Every generated theme is one-of-a-kind — huge for teenage self-expression
- Completely sidesteps IP issues — user-generated from their own photos
- **Desktop-first** for generation (bigger screen, file access, processing time) → syncs to mobile instantly
- Monetisation: Free = preset only; Pro = 1 AI theme; Store = unlimited regeneration
- Tech: colour palette extraction + Claude API mood/style analysis → theme generation

---

## License System

### Design decisions
- **Create School requires a license key** — no free school creation
- **Join School is free** — teacher uses school invite code; school license covers them
- **License key format:** FOCABLY-XXXX-XXXX (manually issued for pilot, Stripe-generated later)
- **Pilot phase:** Steve manually inserts license rows in Supabase, hands keys to pilot schools

### SQL — licenses table (run in Supabase before Session 4 build)
```sql
CREATE TABLE licenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  tier text CHECK (tier IN ('small','medium','large','platinum')),
  max_students integer,
  school_id uuid REFERENCES schools(id),
  activated_at timestamptz,
  expires_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now()
);
```

### SQL — families table additions (run in Supabase before Session 4 build)
```sql
ALTER TABLE families ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free','pro','school_attached'));
ALTER TABLE families ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE families ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE families ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
```

---

## Admin Dashboard

- **URL:** https://app.focablyed.com/admin.html (lives next to `index.html` in same Vercel project)
- **File:** `admin.html` (single self-contained file — own auth, own styles, no shared JS)
- **Access:** email-gated. Admin emails listed in `ADMIN_EMAILS` const at top of script (currently `steve@yourfinancedept.com.au`). Backed by RLS policy `"Admins can read all profiles"` (see `admin-migrations.sql`).
- **Tiles:**
  - **New Users** — slicer: week / month / year / all time (from `profiles.created_at`)
  - **Active Users** — slicer: 7d / 14d / 30d / year / all (from `profiles.last_active_at`, stamped on each profile load in `js/03-auth-onboarding.js`)
  - **Revenue Estimate (ARR)** — hardcoded `MONTHLY_PRICE_AUD = 49`. All-users ARR + new-ARR-this-month tiles. Change price by editing the one constant.
  - **Inactive Users CSV export** — slicer: >30d / >60d / >90d / never. Downloads as `focablyed-inactive-30d-YYYY-MM-DD.csv` with UTF-8 BOM + CRLF (opens in Excel). Columns: Name, Email, Mobile, Role, Last Activity, Joined.
- **DB columns the admin reads (added by `admin-migrations.sql`):**
  - `profiles.last_active_at timestamptz` — set on every profile load
  - `profiles.phone text` — added but never populated (no signup field yet — Mobile column stays blank in CSV until that's wired up)
- **Adding more admins:** edit `ADMIN_EMAILS` in `admin.html` AND add to RLS policy in Supabase (`admin-migrations.sql`).

---

## Current Status

### Working
- Student sign-up + family linking (student ↔ parent via family invite code)
- Auth + profile loading; sign-up/sign-in/forgot-password screens all functional
- Teacher view: class selector, assignments (by assignment / by student), class-filtered
- Unified approval queue (teacher + parent share one queue)
- Notifications: in-app bell + Supabase notifications table, polls every 60s
- Archive: Supabase-persisted, survives refresh, restore works
- Hamburger drawer nav for all 3 roles
- Date-based assignment status colours
- Parent Subject Progress grouped by class; tap assignment → detail screen
- Parent Add Task: Private vs Tag to class
- Dynamic invite codes (family + class): 48h expiry
- Top nav shows first name (all roles)
- Emoji avatars: onboarding picker + Change Avatar in drawer
- Smart Import Assignment: paste text → Claude API extracts → confirmation card
- Footer nav: Home/Tasks/Rewards/Settings wired; Messages = coming soon
- Settings screen: profile, avatar change (student), notifications, Sign Out
- Rewards system: parent creates → student redeems → parent approves → stars deducted → notifications
- In-app rebrand: fully FocablyED throughout
- School Admin dashboard: pending approvals, teachers, classes, invite code regen
- Teacher approval flow: join → pending → admin approves → member
- Direct student enrolment flag on classes (school-approved teachers only)
- Squirrel logo live everywhere (app + landing page)
- Landing page: real founder story, Kim credited, ADHD "out of sight out of mind" narrative
- **Admin dashboard** at `app.focablyed.com/admin.html` — new users, active users, ARR estimate ($49/mo hardcoded), inactive users CSV export. Email-gated to admins via RLS.
- **Modular codebase** — 7138-line `index.html` split into `index.html` (1522 lines) + 7 `js/*.js` files (see Architecture Summary).
- **Unified due-date urgency system** — one shared red/orange/green/grey rule across every tile (Student/Parent/Teacher), cascading from step → assignment → class; whole card/background tinted, not just an accent (see Conventions & Patterns)
- **Optional per-step due dates** — teacher step builder, cascades into assignment/class colour; AI extraction picks one up from assignment text when mentioned
- **Parent "Create Assignment"** — full multi-step builder (mirrors teacher's New Assignment: manual/AI steps, require-proof toggle, attachment) for private Home Tasks that need a real breakdown, plus a file attachment option "Add Task for Child" doesn't have
- **Parent "Add Task for Child" got the same step builder** (Session 15) — manual/AI steps + require-proof toggle, reviewable/editable before and after AI generation. Reward math stays safe: zero steps = unchanged single-task-worth-N-stars flow; any steps = each worth 1 star flatly (matches Create Assignment), so the reward can't inflate with step count like the original bug that got this screen stripped down in the first place
- **AI step generation no longer forces a step count** (Session 15) — Parent's Create Assignment and Teacher's New Assignment both hardcoded a range ("3-5" / "4-6" steps); now both generate exactly as many steps as the content calls for
- **Student self-service family lookup** — read-only "Your Family" (own family only) + "Add a Code" (real linking); self-unlink removed (was already silently failing at the RLS level and showing a fake success toast)
- **New-joiner backfill** — a student joining a class after assignments exist gets those existing active assignments copied to them automatically
- **Class year group** shown on Parent + Student class tiles (previously Teacher-only)
- **Notification coverage completed** — push + email now fire for: new class assignment, new home task, reward decline (push was missing), teacher approved to join school, student joined class (direct + parent-initiated), teacher proof-submission email, **parent proof-submission email** (Session 14), **student notified on parent-imported private task** (Session 14 — this path previously notified no one)
- **Notifications actually persist as read** (Session 14) — `markNotifRead`/`markAllNotifsRead` wrote to a nonexistent `read_at` column instead of the real `read` boolean; every notification silently stayed unread forever until fixed
- **User can edit their own display name in Settings** — syncs header, Settings card, and each role's home-tile greeting (parentName/heroName/hsName) live, plus `children.name` for students (denormalised copy used in class rosters/emails)
- **Invite-child accept flow is email-scanner-safe** — corporate/school (M365) prefetchers like Microsoft Defender Safe Links no longer silently burn the one-time invite token before a human clicks; a dedicated Accept Invite screen only exchanges the token for a session on explicit button click
- **Password-reset link routes to set-password screen first** — previously the recovery session silently skipped straight into the app instead of prompting for a new password
- **Home Task tiles visually unified between Child and Parent** — Child's Home Task tile now uses the same light card styling as Parent's (previously used the dark "quest" gradient shared with real teacher classes); both roles group Home Tasks by category via a shared `groupAssignmentsByCategory()`, rendered as collapsible tiles tinted by the most urgent assignment inside
- **Per-step star values and assignment sort order unified** — Child's inline step view now shows the same star badge Parent's assignment detail already had; assignments within every class/category bucket sort soonest-due-first with completed ones sunk to the bottom, via one shared `sortAssignmentsForDisplay()`
- **All concertina tiles default to closed on load/login** (Session 15) — Parent's per-class card used to auto-open the first class in the list (`ci===0`) while every other class/category stayed closed; now every tile (class, category, Home Task) starts closed everywhere, for every role
- **Paid vs unpaid churn tracking added** (Session 15) — new `churn_events` table + `families.first_paid_at`; DB-only for now, Steve's building a separate reporting dashboard against it (see Session Log for full detail)
- **AI calls proxied server-side** via `ai-generate` Edge Function — `ANTHROPIC_KEY` no longer shipped to the browser; model migrated to `claude-sonnet-5`
- Every published assignment (teacher or parent) is guaranteed at least one completable task, even with zero steps added
- Double-submit guards on Add Task / Publish Assignment (button disabled before first `await`)

### Environment State
- **07 Jul 2026:** Production Supabase data fully reset for a fresh round of real-user testing — all demo/test rows cleared from `profiles`, `families`, `children`, `classes`, `class_members`, `assignments`, `tasks`, `rewards`, `notifications`, `push_subscriptions`, `redemptions`, `licenses`, and all 20 test accounts deleted from `auth.users`. `waitlist` kept only its one genuine signup (Alison, id 2) — the other 17 rows were test data (`@tph.net.au` domain, joke names). Expect all tables empty except that single waitlist row until real users sign up.

### SQL needed before testing school features
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_school_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_school_role_check
  CHECK (school_role IN ('admin', 'member', 'pending'));
ALTER TABLE classes ADD COLUMN IF NOT EXISTS direct_student_enrol boolean DEFAULT false;
```

### SQL needed before testing photo avatar
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_photo text;
```

### Known Bugs / Issues
- **Deferred (Session 14):** when a parent tags a private task to a real class (not a Home Task), the `className` var can arrive undefined in the notification/email payload for that path. Steve deferred the point-fix, wanting a broader change instead ("There is a more broad change we want") — not yet scoped. Don't fix piecemeal until that's clarified.
- Otherwise none currently open

### Supabase constraints added
- `children_profile_id_unique` UNIQUE constraint on `children.profile_id` — prevents duplicate child rows at DB level

---

## Session 4 Build Plan

Run this SQL in Supabase first (before any code changes):
1. `licenses` table (see License System section above)
2. `families` table additions — subscription_status, school_id, stripe_customer_id, stripe_subscription_id

Then build in this order:
1. **Stripe Checkout integration** — Family Pro $9.99/mo + $89/yr (test mode)
2. **Stripe webhook endpoint** — Supabase Edge Function to receive payment confirmation → update families.subscription_status
3. **Freemium paywall UI** — Join a Class gate (parent) + 2nd child gate (parent)
4. **License gate on Create School** — validate FOCABLY-XXXX-XXXX key against licenses table
5. **Theme system foundation** — preset theme switcher UI (Vanilla default + 2 others free, rest Pro-gated)
6. Update CLAUDE_CONTEXT.md post-session

---

## Future Features Roadmap

### Near-term (next 2–3 sessions)
- Stripe live mode flip (after test mode validated)
- School-attached parent discount detection (families.school_id → $4.99/mo rate)
- Platinum parent inclusion bypass
- HS theme system — full library, dark mode, XP unlocks
- M365 email setup completion (TXT/CNAME records)
- Fix landing page remaining "Focably" instances
- Add focablyed.com.au to Vercel

### Medium-term
- Theme marketplace — store, purchases, limited drops (at 10,000+ users)
- AI photo theme generator (desktop-first, syncs to mobile) — Zoe's idea
- Evocative fandom themes (legally safe aesthetics)
- School Admin: student count enforcement, Stripe billing portal
- Custom school branding (Platinum)
- Profile photo + reward image uploads (Supabase Storage)
- App Store: Capacitor wrapper for iOS + Android

### Longer-term
- Studio licensing collabs (at scale — 50K+ students)
- Microsoft Teams for Education integration
- Student leaderboards / class XP competitions
- Teacher analytics dashboard
- In-app messaging (Messages footer tab)
- Data residency: Supabase EU (GDPR/UK)
- COPPA compliance before US launch
- Annual review call workflow (Platinum)

---

## Navigation Structure (current)

**Top nav (all roles):** squirrel logo | first name | 🔔 bell | ↻ refresh | ☰ hamburger

**Teacher hamburger:** New Assignment, Import Assignment, Archive & Archived, Create New Class, School Admin (admin) / Awaiting Approval (pending) / Set Up or Join (none), Sign Out

**Parent hamburger:** Add Task for Child, Manage Rewards, Import Assignment, Family Invite Code, Join a Class, Sign Out

**Student hamburger:** Break Any Task (AI), Import Assignment, Join a Class, Change Avatar, Sign Out

**Footer nav:** 🏠 Home | 📋 Tasks | 🏆 Rewards | 💬 Messages (coming soon) | ⚙️ Settings

---

## Database Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| profiles | id, role, full_name, age_group, theme, avatar, school_id, school_role | school_role = null/pending/member/admin |
| schools | id, name, invite_code, invite_code_expires_at, subscription_status, max_students | |
| families | id, parent_id, invite_code, invite_code_expires_at, family_name, subscription_status, school_id, stripe_customer_id, stripe_subscription_id, first_paid_at | subscription_status = free/pro/school_attached. `first_paid_at` (Session 15) is set once on first Stripe conversion and never cleared — even after a later cancellation resets subscription_status back to 'free' — so churn tracking can tell a lapsed payer from a family that was always free |
| children | id, profile_id, name, family_id | |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id, direct_student_enrol | |
| class_members | id, class_id, child_id | |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order, due_date | due_date added Session 12 — optional per-step date, cascades into assignment/class urgency colour |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read, created_at | `read` is boolean, not a timestamp — app code was fixed Session 14 after it wrote a nonexistent `read_at` column and every notification stayed unread forever |
| waitlist | id, email, created_at, firstname, role, phone, challenge, interests, source, num_children, school_year, adhd_flag, state, school_name, school_type, year_levels, admin_role, enrolment, student_year, submitted_at | landing page (separate repo) — RLS disabled, public inserts. Emptied to 1 row (genuine signup) in the 07 Jul 2026 data reset. |
| rewards | id, family_id, created_by, child_id, title, emoji, star_cost, is_active, created_at | |
| redemptions | id, reward_id, child_id, family_id, status, requested_at, responded_at | |
| licenses | id, key, tier, max_students, school_id, activated_at, expires_at, stripe_subscription_id, created_at | live since Session 4; emptied in the 07 Jul 2026 data reset |
| churn_events | id, event_type, was_ever_paid, family_id, user_id, role, email, account_created_at, stripe_customer_id, stripe_subscription_id, metadata, created_at | added Session 15 for churn tracking. `event_type` = `subscription_canceled` (logged by `stripe-webhook` on `customer.subscription.deleted`, always `was_ever_paid=true`) or `account_deleted` (logged by `confirmDeleteAccount()` right before the hard delete, `was_ever_paid` = whether the family/linked family ever had `first_paid_at` set). "Paid churn" = `was_ever_paid=true` rows, "unpaid churn" = `was_ever_paid=false`. RLS: only an `INSERT ... WITH CHECK (auth.uid() = user_id)` policy — no SELECT for anon/authenticated, only `service_role` can read it (Steve's separate reporting dashboard) |

**Key SECURITY DEFINER RPCs** (bypass RLS safely, scoped to the caller):
- `find_family_by_code(code)` — used by the real linking flow; extended (Session 12) to also return the parent's name for the read-only "Add a Code" lookup
- `get_my_family_info()` — returns the CALLER's own family + parent name via their own child row (`auth.uid()`), never a client-supplied code, so it can't leak another family's info
- `copy_class_assignments_to_member(...)` — backfills existing active/not-yet-due class assignments to a child who joins a class after they were published

---

## Conventions & Patterns

- Role stored in `profiles.role` — always check this
- Student↔child link: `children.profile_id = auth user id`
- `dbQuery(promise, timeoutMs, fallback)` wrapper for all Supabase calls
- Use `.maybeSingle()` not `.single()`
- Avoid inline onclick with JSON args — use data-* attributes + handler fn
- Status colours: red ≤7d, amber ≤14d, green 15d+, grey done
- `currentSchool` loaded at teacher login from `profiles.school_id`
- Avatar emoji sets: `AVATARS_HS` (cool/neutral 20), `AVATARS_PRIMARY` (fun/playful 20)
- Import flow uses Claude API (`claude-sonnet-4-20250514`)
- `ALL_DRAWER_SCREENS` array must include any new screen
- Footer nav: `setFooterActive(tab)` / `footerNav(tab)`
- School role states: null → pending → member → admin
- Logo: always `https://raw.githubusercontent.com/stevothomo99-cpu/focably/main/squirrel.png`
- **GitHub push:** always Python urllib.request, never curl for large files
- **subscription_status check:** always read from `families` table for parent, not profiles
- **Due-date urgency:** one shared `getDueUrgency(dueDate, isComplete)` + `getAssignmentUrgency(assignment)` in `07-shared.js` — used everywhere a tile/card needs a red/orange/green/grey colour. Never re-implement thresholds locally (there used to be 5 different inconsistent copies — see Session 12 log). Rule: overdue or ≤48h → red, ≤7d → orange, beyond/none → green, complete → grey+strikethrough. An assignment's colour is the worst of its own due date and any incomplete step's own due date.
- `classDisplayName(class)` in `07-shared.js` — "Name - Year" formatting, use for any Parent/Student class heading
- `extractNumberedSteps(text)` in `07-shared.js` — recovers a numbered list already in pasted text as a fallback before a single placeholder step, when AI step-breakdown JSON parsing fails
- **Double-submit guard pattern:** disable the submit button BEFORE the first `await` (not after) and re-enable on every exit path — a guard placed after an `await` still races a fast second click
- **Verify JWT OFF** (called from public/unauthenticated contexts — website forms, webhooks): `send-transactional`, `send-digest`, `send-warnings`, `send-push`, `stripe-webhook`, `hubspot-sync`. **Verify JWT ON** (called from a logged-in app session): `create-checkout-session`, `ai-generate`, `invite-child`. Toggle is sticky and can revert on redeploy — always re-check after deploying any Edge Function.

---

## Tech Debt

- ~~index.html ~4,800+ lines~~ ✅ **Done in Session 11** — split into `index.html` (1522 lines) + 7 `js/*.js` files
- ~300 inline style attributes, duplicated patterns — extract to CSS classes when touched
- Consider one-off human developer review (bus-factor insurance)
- Long term: migrate domains from Crazy Domains to Cloudflare Registrar
- ~~`ANTHROPIC_KEY` baked into client JS~~ ✅ **Done ~Session 13** — client now calls the `ai-generate` Edge Function (`AI_PROXY_URL` in `js/01-config.js`); Anthropic key lives only in the function's server-side secret. Note: the app's original model `claude-sonnet-4-20250514` was retired 2026-06-15 — `ai-generate` maps any unrecognised/retired model string to the current default (`claude-sonnet-5`) so old cached clients keep working without a redeploy.
- `phone` column on `profiles` exists but no signup field collects it — admin CSV Mobile column stays blank until that's wired up
- Full visible-effect button audit completed (Session 12) — no live dead buttons found; three orphaned handlers targeting already-removed elements were deleted

---


---

## Post-MVP Feature Roadmap

### 🧠 High Priority — High Impact

**Brain Dump Mode** ⭐ TOP PRIORITY
- Student voice-records or free-types everything on their mind
- Claude API organises it into structured tasks automatically
- Voice or text → AI parses → tasks appear in their list
- Most ADHD-native feature on the roadmap — unique differentiator
- Leverages existing Claude API integration

**Streak Freeze**
- Spend XP to protect a streak (Duolingo mechanic)
- ADHD users are highly streak-motivated — losing one is devastating
- Simple XP deduction + streak_freeze_count on profiles table

**Daily Digest Push Notification**
- Morning summary: tasks due this week, trust score movement, XP earned
- Uses existing push notification infrastructure (VAPID/send-push Edge Function)
- Configurable time in Settings

**Overdue Task Escalation**
- Auto-notifies parent when task is 24hrs overdue
- Edge Function cron job checking due dates
- Parent gets push + optional email

**Parent Weekly Email Summary**
- Tasks completed, trust score movement, XP earned, streaks
- Sent every Sunday evening
- Resend or SendGrid integration (~$0/month at this scale)

### 🎯 Differentiating Features

**Assignment Templates**
- Pre-filled AI step structures for common types: Essay, Lab Report, Presentation, Case Study
- Student picks template → AI pre-populates steps → they customise
- Reduces friction for common assignment types

**Mood Check-in**
- "How are you feeling today?" on app open (optional, dismissable)
- Affects XP multiplier for the day
- Flags to parent if consistently low (3+ days)
- ADHD-aware — acknowledges emotional regulation is part of the challenge

**Celebration Moments**
- Confetti + sound + animation on task completion
- Dopamine hit — critical for ADHD engagement
- Configurable in Settings (some users find it distracting)

**Study Music Integration**
- Built-in lo-fi playlist / focus music
- YouTube embed or Spotify Web Playback SDK
- ADHD users widely report music helps focus

### 👥 Social / Community Features

**Anonymous Class Leaderboard**
- XP leaderboard within a class (anonymous usernames)
- Friendly competition — opt-in per teacher
- Teacher controls visibility

**Study Buddy**
- Pair two students working on same assignment
- See each other's progress (steps completed)
- Encouragement notifications

**Teacher Shoutouts**
- Teacher sends a "Great work!" badge to a student
- Appears in student's notification bell + XP bonus
- Simple, high-value teacher engagement feature

### 🚀 Platform Expansion

**Solo App (Uni/Older Teen) — Separate Product**
- Same Supabase/Claude/Stripe infrastructure
- No parent-teacher loop — pure personal productivity
- Microsoft Teams OAuth (student connects own school account)
- Canvas LMS integration
- Calendar view with study block planner
- Target: 18-25 ADHD students at university
- Natural cross-sell from Focably family product
- Same ADHD marketing communities
- Marginal infrastructure cost (~$0 additional fixed)
- Working names explored: Meridian, Chisel, Briefd, Clairo
- Business case: same CAC, same infrastructure, second revenue stream

**In-App Support Agent**
- Claude-powered chat widget in hamburger menu
- Context-aware — knows user's profile, role, subscription
- Handles: login issues, billing questions, how-to walkthroughs, bug reports
- Logs unresolved issues to Supabase support_tickets table
- Escalates to Steve only when genuinely needed
- Cost: ~$0.01-0.03 per conversation — essentially free at this scale
- Competitive advantage in ADHD market — instant, patient, never makes user feel stupid

**Microsoft Teams OAuth (Student-initiated)**
- Student taps "Connect Microsoft Teams" in Focably
- Standard OAuth popup — signs in with school account
- Requests EduAssignments.Read scope only
- Pulls assignments directly — no school IT involvement
- Dev mode: up to 25 users before Microsoft verification required
- Requires Azure AD app registration (free, ~10 mins)

---

## Session Log

> _Most recent at top._

### 13 Jul 2026 (Session 15, App #5 continued) — Concertina tiles closed by default, Add Task step builder, AI step-count fix, churn tracking

Continuing on `claude/facablyed-app-5-ujuz6p`, on top of Session 14's PRs #37–#41. The tiles/step-builder/AI-step-count work landed via PR #44.

- **All concertina tiles now default to closed on load/login** — Parent's per-class card auto-opened the first class in the list (`ci===0`); every other tile (class, category, Home Task, across all roles) already defaulted closed. Now all start closed everywhere.
- **Parent "Add Task for Child" got the same optional step builder as Create Assignment** — manual "+ Add Step" or "✨ AI Generate", both reviewable/editable before and after generation, plus a Require Proof toggle. This screen had been deliberately stripped of step creation after a past bug (AI always generated a fixed step count, each paying the FULL chosen star value). The new design keeps that safe: zero steps = unchanged single-task-worth-N-stars flow; any steps = each worth 1 star flatly (matches Create Assignment), so the reward can't inflate with step count.
- **AI step-count prompts fixed in both Parent's Create Assignment and Teacher's New Assignment** — both hardcoded a step-count range ("3-5" / "4-6"); now both generate exactly as many steps as the content actually calls for, no padding or trimming to hit a target count.
- Confirmed the Session 14 deferred bug (parent tags a private task to a real class → `className` can arrive `undefined` in the notification/email payload) is untouched by this work — still deferred per Steve's request for a broader fix, not a point-fix.

**Paid vs unpaid churn tracking added** — Steve is building a separate central reporting dashboard and needed the underlying data captured, DB-only (no in-app UI):
- `families.first_paid_at` — stamped once by `stripe-webhook` on the family's first `checkout.session.completed`, never cleared by a later cancellation. This is the durable "was this family ever a paying customer" signal that `subscription_status` alone can't give once it resets to `'free'`.
- New `churn_events` table — one row per churn moment. `event_type` is `subscription_canceled` (logged by `stripe-webhook` on `customer.subscription.deleted`, carries Stripe's `cancellation_details` in `metadata` when Stripe provides them) or `account_deleted` (logged by `confirmDeleteAccount()` right before the hard delete). `was_ever_paid` is always `true` for a cancellation event, and for an account deletion reflects whether the account's family (a parent's own, or a student's linked family) had `first_paid_at` set. Paid churn = `was_ever_paid=true` rows; unpaid churn = `was_ever_paid=false`.
- RLS on `churn_events`: only `INSERT ... WITH CHECK (auth.uid() = user_id)` — a user can log their own deletion event, nothing else. No SELECT policy for anon/authenticated at all; only `service_role` (Steve's dashboard) can read it.
- `stripe-webhook` redeployed (v10) with both changes; **Verify JWT confirmed OFF** post-deploy (this function's toggle is sticky per the note below — always re-check after any redeploy).

**Next session TODO:**
- Revisit the deferred `className`-undefined gap once Steve scopes the "broader change" he wants there
- Once Steve's separate reporting dashboard is live, sanity-check its churn queries against a real cancellation/deletion in a test environment

---

### 12 Jul 2026 (Session 14) — Notification completeness, `send-transactional` full restore, name-edit sync, invite/password-reset fixes, Home Task UI unification

Two Claude Code web sessions ran in parallel this session and both landed work on `main`: **"App #4"** (branch `claude/focablyed-app-4-pqes9n`, PR #42) and **"App #5"** (branch `claude/facablyed-app-5-ujuz6p`, PRs #37–#41). Going forward, work consolidates into the App #5 session — see the new note under Working Method.

**Notification audit (App #4) — static trace of every push/email/in-app trigger in the codebase, two gaps found and fixed:**
- `notifyProofSubmitted()` fired push + in-app to the parent but never called `sendTransactionalEmail` — parent got no email when a child submitted proof. Fixed: now also sends `proof_submitted` with `parentId`.
- Parent's "Import Assignment" (private/Home Task branch of `saveImportedAssignment`) never notified the student at all — no push, no in-app row, no email. Fixed: now sends all three, mirroring `parentAddTask()`/`publishParentAssignment()`.
- Also fixed in passing: an escaped `\${cls.name}` was printing literally instead of interpolating in the join-class success toast.
- A third gap was found (`className` can be undefined when a parent tags a task to a real class rather than Home Tasks) but **deliberately deferred** — Steve wants a broader change here, not a point-fix; see Known Bugs / Issues.

**`send-transactional` Edge Function — full restore (App #4):**
- The function had drifted into a partially-broken production state from an earlier session's incremental redeploys: `tpl-parent.ts` and `tpl-teacher.ts` had been left as empty stubs (`{}`), meaning every parent- and teacher-facing transactional email was silently 500ing with "Template not found" — the router (`index.ts`) and student templates were fine, only two of the four template files were empty.
- Root cause of the drift: testing payload-size limits by deploying placeholder `index.ts` content (to isolate whether the tool call itself was the bottleneck) actually deployed non-functional code to production each time, because Deno's bundler never traverses `import` statements an entrypoint doesn't reference — so a "successful" deploy call doesn't guarantee the real templates shipped.
- Fixed with one complete, verified 6-file deploy (`index.ts`, `templates.ts`, `tpl-parent.ts`, `tpl-teacher.ts`, `tpl-student1.ts`, `tpl-student2.ts`) restoring all 22 templates (5 parent + 3 teacher + 14 student across primary/secondary), including the new `parent__05_proof_submitted` template and preserving the Outlook `bgcolor` attribute fixes on every gradient background.
- Confirmed post-deploy (v14) by pulling the live function source back and regex-scanning for all 22 expected template keys with no empty `Record<string,string> = {}` stubs remaining.
- **Lesson for future large Edge Function deploys:** don't test size limits with placeholder/non-real file content — a bundler-success response only proves the files you sent are internally consistent, not that they contain what you meant to ship. If probing payload limits, use a disposable test function slug, never the live one.

**App #5 — five separate fixes/features landed via PRs #37–#41:**
- **Password-reset link fix** — Supabase's recovery-link click established a session that `onAuthStateChange`/`window.load` treated as a normal sign-in, routing straight into the app instead of prompting for a new password. Now `PASSWORD_RECOVERY` routes to the set-password screen first; `loadProfile()` only runs after the password is actually updated.
- **Editable display name in Settings** — new edit affordance on the existing "My Profile" card (kept separate from the billing-only Upgrade drawer item). Syncs `children.name` for students (a denormalised copy read by teachers/parents in rosters and emails).
- **Name-edit sync to home-tile greeting** — `saveProfileName()` updated the header and Settings card but not each role's "Welcome back" home tile (`parentName`/`heroName`/`hsName`), since those were only set once at app load. Now kept in sync live.
- **Notifications never actually marked as read — fixed.** `markNotifRead`/`markAllNotifsRead` wrote to a `read_at` column that doesn't exist on `notifications` (the real column is a `read` boolean); the unread check also read the nonexistent column. Every "mark as read" silently no-opped — confirmed live, all 9 rows in the table were `read=false` before the fix.
- **Home Task tile UI unified + shared category grouping** — Child's Home Task tile used to share the dark "quest" gradient styling with real teacher classes; now uses the same light card structure as Parent's (teacher classes untouched). Both roles now group Home Tasks by category (`assignments.subject`) via a shared `groupAssignmentsByCategory()`, rendered as collapsible tiles.
- **Per-step stars + assignment sort order unified** — Child's inline step view now shows the same star badge Parent's assignment detail view already had. All assignment lists (class or category buckets) now sort soonest-due-first with completed ones sunk to the bottom via one shared `sortAssignmentsForDisplay()`.
- **`invite-child` accept flow made email-scanner-safe** (landed earlier in App #4, documented here since undocumented until now) — the function used to send Supabase's raw one-time `/verify` link directly; any GET to that URL — including Microsoft Defender Safe Links and similar prefetchers common on the M365 school email systems FocablyED's actual market uses — silently burned the token before a human ever clicked it. The function now sends the app's own URL carrying the raw `hashed_token`; a new Accept Invite screen only exchanges it for a session (`auth.verifyOtp`) on an explicit button click, so a scanner prefetch just loads an inert page.

**Facebook Pixel added to the landing page** (separate repo, `stevothomo99-cpu/focably-Landing`) — pixel ID `2345775142620009`, fires a `Lead` event on successful waitlist form submission. Pushed directly to `main` (no PR workflow on that repo; Vercel deploys straight from it).

**Next session TODO:**
- Deliver the consolidated "list every notification trigger + its push/email/in-app destinations" table Steve asked for — audited but not yet written up as a standalone reference (Session 14's fixes are captured above; a clean table format is still pending)
- Scope the "broader change" Steve wants for the deferred `className`-undefined gap (parent tags a task to a real class) before touching that code path again
- Manual smoke test of Import Assignment (parent → student notify) and proof-submission (student → parent email) in the live app — not yet done post-deploy
- Consider a lightweight cross-session check-in step (see new Working Method note) so parallel sessions don't leave the context doc out of date again

---

### 05–07 Jul 2026 (Session 13) — Import/star-inflation fixes, Parent Create Assignment, Edge Function fixes, production data reset

**Bug fixes:**
- **Teacher Import Assignment wasn't reaching students** — `saveImportedAssignment`'s teacher branch inserted one `assignments` row with `class_id` but no `child_id`, so imported assignments never appeared for any student. Now mirrors `publishAssignment`'s fan-out: one row per class member, task rows per student, notifications sent.
- **Create-a-Task star inflation** — `parentAddTask()` was auto-breaking every task into 3-4 AI-generated steps, each carrying the FULL star value the parent picked (a 3-star task could pay out up to 12 stars). Now saves a single task worth exactly the chosen stars — Create a Task has no steps UI, so it shouldn't have been creating multiple star-bearing steps at all.
- **Fallback task guarantee** — `publishParentAssignment()` and the teacher's `publishAssignment()` only created task rows when steps were explicitly added, so publishing with zero steps (e.g. toggling Require Proof without adding a step) left nothing for the child to tap or submit proof against. Both now fall back to a single step named after the assignment title, carrying over the master proof toggle.

**New feature — Parent "Create Assignment":**
- New screen mirroring the teacher's New Assignment builder: title, due date, instructions, manual/AI-generated multi-step checklist, require-proof toggle, file attachment
- No Class field (parents can't create a real class) — reuses the Category field/datalist from Create a Task, always saves as a private Home Task (`class_id` null) tied to one child
- Gives parents a real multi-step breakdown option alongside the simpler single-task "Add a Task"

**Email Edge Functions — redeployed with the documented live contract:**
- `send-warnings` — rewritten to query `assignments` directly (matches production schema), 4-bucket due-date window (overdue / due today / +1-2 days / +3-7 days) preserved rather than narrowed
- `send-transactional` — rewritten to the exact live `{type, data}` payload contract, routing to parent/student(age-gated primary vs secondary copy)/teacher templates for all 12 event types (assignment published, home task, nudge, proof approved/rejected/submitted, reward requested/approved/rejected, child joined family, school approved, student joined class)
- Both redeployed a second time after a mid-session MCP disconnect silently dropped the first `send-warnings` deploy — confirmed via `list_edge_functions` version numbers before retrying; don't assume a deploy landed just because the tool call was made before a disconnect

**HubSpot waitlist sync — fixed, was broken since it was first built in Session 8:**
- `hubspot-sync` had **Verify JWT ON**. The landing page waitlist form calls it from an anonymous visitor (no Supabase session, no JWT) — every call was rejected with 401 at the gateway before ever reaching the function. Zero log entries for `hubspot-sync` ever existed, vs. regular traffic on every other function — that was the tell.
- All the other public-facing functions (`send-transactional`, `send-digest`, `send-warnings`, `send-push`, `stripe-webhook`) were already documented as needing Verify JWT OFF; `hubspot-sync` just never got that treatment when it was built.
- Fixed: redeployed with Verify JWT OFF (same code, no logic changes).
- Verified the fix by manually pushing Alison's (real, pre-fix) waitlist signup into HubSpot as a Contact + Deal, backfilled with her original form data — confirms the Contact/Deal/association shape is correct end-to-end.

**Production data reset for real-user testing (07 Jul 2026):**
- Full wipe of demo/test data ahead of onboarding real users: `profiles`, `families`, `children`, `classes`, `class_members`, `assignments`, `tasks`, `rewards`, `notifications`, `push_subscriptions`, `redemptions`, `licenses` truncated; all 20 `auth.users` test accounts deleted
- `waitlist` kept only the one genuine signup (Alison, `daretodancecanberra.com.au`) — the other 17 rows were test data (`@tph.net.au` domain, joke names/content)
- Confirmed the landing page's waitlist submission is a *separate* integration from the app itself (landing repo `stevothomo99-cpu/focably-Landing` posts to Supabase `waitlist` + `hubspot-sync` directly) — nothing in this repo calls either

**Next session TODO:**
- Watch first real signups through the reset environment — confirm `hubspot-sync` fires correctly on a live (non-manual) form submission
- Rotate ALL exposed keys — still outstanding from Sessions 8/9/10 (Anthropic, Resend, GitHub PATs, HubSpot Service Key)
- Delete remaining old test contacts/deals in HubSpot from before this reset (Peter, Sue, John, Kevin, Kerry test entries — see Session 8/9 TODOs)

---

### 05 Jul 2026 (Session 12) — Due-date urgency system, family privacy fixes, notification completeness, cleanup

Landed via a systematic code-review pass (branch `claude/focablyed-3-code-review-jtd3ef`, PRs #19–#34), one fix/feature per PR.

**Due-date urgency system — unified across the whole app:**
- Five different inconsistent colour implementations (different thresholds, one with no "due soon" bucket, a stray 14-day cutoff) replaced with one shared `getDueUrgency(dueDate, isComplete)` in `07-shared.js`: overdue/≤48h → red, ≤7d → orange, beyond/none → green, complete → grey + strikethrough (strikethrough was missing on Teacher/Parent views before)
- Added optional per-step `due_date` (migration `add_due_date_to_tasks`) — teacher step builder gets a small 📅 toggle per step; AI step generation/fallback extracts a per-step date from assignment text when one is actually mentioned
- New `getAssignmentUrgency(assignment)` — an assignment's colour is the worst of its own due date and any incomplete step's own due date, so one overdue step turns the whole assignment (and its class tile) red even if the assignment itself isn't due for weeks
- Parent views (Subject Progress, Manage Children, Assignment Detail) now tint the whole card background + coloured left border, not just a thin progress bar — matching Student's already-fully-tinted tiles
- Individual step cards also tint by their own due date, not just a small badge
- Fixed two real bugs found while unifying: `updateTileProgress()` threw on an undefined variable, silently aborting re-colouring after checking off a task; dead duplicate `getTileClass()` removed

**Family privacy & self-service fixes:**
- **Privacy leak fixed:** the "Link to Family" screen let a student type ANY 6-char code and see that family's + parent's name — nothing stopped guessing codes that weren't theirs. Replaced with "Your Family" (own family only, via new `get_my_family_info()` RPC scoped to the caller's own child row) + "Add a Code" (the existing secure linking flow, reused).
- **Removed student self-unlink** — this was already silently failing (RLS on `children` only allows a parent to delete a child row) and showing a fake "✅ Unlinked!" toast for an action that never happened.
- `find_family_by_code` RPC extended to also return the parent's name for the new read-only lookup path.

**Other fixes/features:**
- Require Proof toggle now actually gates the per-step 📸 checkbox (was visible regardless of the master toggle before, and didn't clear existing checks when turned off)
- "+ Add Another Class" fixed — was toggling the wrong (inner) element, leaving the outer card hidden; traced to a stale leftover from PR #3's refactor
- New assignments backfilled to a student who joins a class after they were published (new `copy_class_assignments_to_member` RPC)
- Primary student home tile now shows a saved photo avatar (was only ever showing the emoji fallback, unlike the HS header which already worked)
- AI step-breakdown failures (naive `JSON.parse`, no schema validation) now fall back to recovering a numbered list already present in pasted text (`extractNumberedSteps()`) before resorting to one placeholder step
- Class year group now shown on Parent + Student class tiles (was Teacher-only)
- Push + email notification triggers completed: new class assignment, new home task, reward decline push, teacher approved to join school, student joined class, teacher gets proof-submission email
- Browser-blocked notification permission now shows device-specific unblock instructions instead of silently doing nothing

**Evening cleanup pass:**
- Full visible-effect button audit (handler resolution, missing `getElementById` targets, hidden-ancestor `show()` calls, click smoke test of all 112 static buttons) — no live dead buttons, but three functions referencing already-removed elements deleted (`loadClassProgress`, `renderClassDropdown`, `updateNotifStatus`)
- **Double-submit fix:** rapid double-click on "+ Add Task" (Parent) created duplicate tasks — no guard existed. Same bug found in `publishAssignment` (Teacher) with worse blast radius (double-publishes to the whole class); first fix attempt still raced because the button was disabled after an `await` — moved the disable to before the first `await`.

---

### 28 Jun 2026 (Session 11) — Admin Dashboard + Codebase Refactor

**Admin dashboard built (`admin.html`):**
- Single self-contained page at `app.focablyed.com/admin.html` — own auth, own styles, sits next to `index.html`
- Email-gated via `ADMIN_EMAILS = ['steve@yourfinancedept.com.au']` + matching RLS policy
- Three sections:
  - **New Users** with week / month / year / all-time slicer (queries `profiles.created_at`)
  - **Active Users** with 7d / 14d / 30d / year / all slicer (queries `profiles.last_active_at`)
  - **Revenue Estimate (ARR)** — hardcoded `MONTHLY_PRICE_AUD = 49`, two tiles: all-users ARR + new-ARR-this-month
  - **Inactive Users CSV export** — slicer for >30d / >60d / >90d / never. CSV with UTF-8 BOM + CRLF (Excel-friendly). Columns: Name, Email, Mobile, Role, Last Activity, Joined.
- Currency formatting via `Intl.NumberFormat('en-AU', { style:'currency', currency:'AUD' })`

**Supabase migration (`admin-migrations.sql`):**
- Added `profiles.last_active_at timestamptz` + index
- Added `profiles.phone text` (column exists, no signup field collects it yet — Mobile column in CSV is blank for now)
- RLS policy `"Admins can read all profiles"` granting `SELECT` on whole `profiles` table for emails matching `ADMIN_EMAILS`
- Backfilled `last_active_at` from `auth.users.last_sign_in_at` so dashboard had history immediately
- `js/03-auth-onboarding.js` stamps `last_active_at = now()` on every successful profile load (fire-and-forget)

**Admin user setup:**
- No `steve@yourfinancedept.com.au` existed in `auth.users` originally — created directly via Supabase Studio → Authentication → Users → "Add user" → Auto Confirm. Admin doesn't need a `profiles` row (only reads from `profiles`, doesn't expect own profile).

**Major refactor — `index.html` split:**
- Before: `index.html` was 7138 lines with a 5621-line inline `<script>` block
- After: `index.html` is 1522 lines (HTML + 7 `<script src>` tags); JS lives in `js/*.js` (see Architecture Summary)
- Pure code-organisation refactor — zero behaviour changes intended
- All 7 files pass `node --check`; brace counts balance per file; all HTML `onclick` handlers resolve to top-level functions
- Service worker cache bumped `focably-v1` → `focably-v2-modular`; all 7 JS files added to `OFFLINE_URLS`
- Original 7138-line file backed up at `backup/index-pre-refactor.html` in case of rollback
- Steve smoke-tested login post-deploy: working ✅

**Two key architecture clarifications:**
- `focablyed.com` (no `app.`) is served by a *separate* `focably-landing` Vercel project from a *different* repo (`stevothomo99-cpu/focably-Landing`). The actual app at `app.focablyed.com` is THIS repo (`stevothomo99-cpu/focably`).
- Each Claude Code (web) session clones one repo into its container — so Focably app, Focably landing, Sitemargin app each need their own session.

**Branches this session:**
- `claude/focably-data-access-npvurc` — admin dashboard + ARR + last_active_at patch (merged to main, deployed)
- `claude/refactor-index-split` — codebase refactor (merged to main, deployed)

**Next session TODO (Session 12):**
- Wire a Mobile field into signup so admin CSV's Mobile column populates
- Optional: ops console / support tickets table (discussed but deferred — see prior chat)
- Optional: proxy `ANTHROPIC_KEY` via Supabase Edge Function so it's not in client JS

---

### 16 Jun 2026 (Session 7) — Unlink Child, Rewards Flow, Subscription Screens, Teams OAuth

**Manage Children (parent hamburger):**
- New drawer screen showing all linked children with name, stars, streak, trust score
- Unlink button per child — confirms, deletes children row, refreshes child tabs live
- Fixed syntax error (single quotes in onclick)
- Empty state with Add a Child button

**Rewards flow — fixed and completed:**
- Created `redemptions` table in Supabase (was missing — caused 404)
- Added missing columns to `rewards` table: `created_by`, `child_id`, `emoji`, `star_cost`, `is_active`
- Fixed `respondToRedemption` calling wrong function (was `loadManageRewards`, now `loadParentRedemptions`)
- Made `handleNotifAction` async (was throwing await error)
- Fixed `loadStudentRewards` to track `approved` state — tiles show ✅ Enjoyed! and are non-clickable after approval
- Reward tiles refresh immediately after student redeems (no waiting for poll)
- Student tiles refresh when `reward_approved`/`reward_rejected` notification arrives

**Reward alert card — parent dashboard:**
- Moved redemption card to TOP of parent dashboard (above stat grid)
- Styled as amber/orange alert with pulsing red dot — impossible to miss
- History → button opens Reward History drawer

**Reward History drawer:**
- Shows all redemptions (pending/approved/rejected) with status badge, date, child name, stars
- Accessible from parent hamburger (📜 Reward History) and student hamburger (both primary + HS)
- Auto-loads when screen opens

**Subscription Status screens — two types:**
- **Family Pro screen** (parent hamburger ⭐): active status, plan info, 💳 Update Payment Method (prominent), "Manage subscription ›" expands nested menu with billing history + Cancel (buried, confirm dialog before portal opens)
- **School License screen** (teacher hamburger 🔑, admin only): school name, status badge, tier, price, activated/expiry dates, contact email for renewals
- Free users see upgrade prompt; school_attached users see read-only school coverage notice
- Stripe Customer Portal URL: `https://billing.stripe.com/p/login/bJe14meC37jBbNu6ko6J200`
- `confirmCancelSubscription()` — confirm dialog lists everything they lose before opening portal
- `toggleManageSubMenu()` — shows/hides nested cancel menu

**FocablyED branding fix:**
- Nav logo, auth screen, loading screen, onboarding — all had "Focably ED" gap caused by flex gap treating span as separate child
- Fixed: outer `white-space:nowrap` span keeps word together; "Focably" = white, "ED" = #A78BFA (light violet)

**Microsoft Teams OAuth — student + teacher import:**
- Azure AD app registered: FocablyED, client ID `2593af2c-94ef-47ec-aa9a-40de24336aca`
- Permissions: `User.Read`, `EduAssignments.ReadBasic`
- Redirect URI: `https://focably.vercel.app` (SPA type)
- MSAL 2.38.0 loaded via CDN
- Import Assignment screen now has Teams connect card (student + teacher only, hidden for parent)
- Connect → OAuth popup → MS login → pulls last 20 Teams assignments via Graph API
- Each assignment has Import button → pre-fills confirmation card (class picker for teacher, standard for student)
- Disconnect button clears sessionStorage and resets UI
- Session persists until tab close (sessionStorage) or manual disconnect

**Next session TODO (Session 8):**
- Push notifications end-to-end test (proof submit → parent, approved/rejected → student)
- License gate on Create School (validate FOCABLY-XXXX-XXXX against licenses table)
- HubSpot waitlist debug
- Brain Dump mode ⭐ top post-MVP priority
- Code refactor — split ~6,500 line index.html before building second product
- Manual: Add ABN to privacy policy
- ✅ Manual: privacy@focablyed.com set up as alias on steve@focablyed.com
- Manual: Confirm Supabase Pro + Sydney (ap-southeast-2) region
- Manual: Rotate Anthropic API key — current key was pasted in chat (exposed). Regenerate at console.anthropic.com, update directly in index.html on GitHub (line ~1461, the ANTHROPIC_KEY constant)
- Manual: Add focablyed.com.au to Vercel


### 15 Jun 2026 (Session 3, wrap-up chat) — Strategy, monetisation, pricing finalised
- **Go-to-market confirmed:** Parent-first — target 50 Family Pro families before active school sales
- **School build stays in** — credibility layer for future B2B, not removed
- **Themes reframed:** ADHD engagement/retention tool, not a monetisation line
  - Free: 2-3 presets; Pro: full library + AI generator; Store: future (10K+ users only)
- **Stripe confirmed from day 1** — Steve has existing account, test mode first
- **Annual price revised:** $89/yr (was $79/yr) — avoids deep discount training
- **App Store strategy documented:** Web/PWA first, Capacitor wrapper when 500+ users
  - Steve can do iOS build himself on a Mac (Xcode + $149 AUD Apple Dev account)
  - Android: easier, $30 USD Play Store fee
  - Google Play: 15% flat vs Apple's 30% year 1
- **Web funnel strategy:** Drive parents to focablyed.com → Stripe → then download app
- **Session 4 build plan locked** (see Session 4 Build Plan section)

### 16 Jun 2026 (Session 6) — HS Theme System, Photo Avatar, CSS var refactor, Bug fixes

**HS Theme System — fully built:**
- 10 evocative themes: ✨ Vanilla, 🌙 Midnight (free); ⚡ Ancient Lightning, 🌸 Soft Hour, 🤖 Neural, ⚽ Match Day, 🎮 Respawn, 🌿 Off Grid, 🎨 Studio, 🔥 Grunge (Pro)
- `HS_THEMES` object with full CSS var sets per theme (header grad, body bg, card bg, card text, subtext, accent, XP fill, trust bar, badge colours)
- `applyHSTheme(key, save)` — injects CSS vars into `:root`, updates `currentProfile.theme` synchronously, persists to Supabase
- Theme picker as **own drawer page** — 🎨 My Theme in student hamburger menu (HS only)
- Tile previews show actual header gradient + card background so themes are instantly distinguishable
- Pro gate: free users see 2 tiles + locked grid + Upgrade button; Pro users see all 10
- First-login prompt: after HS onboarding completes, theme drawer opens automatically (400ms delay)
- Active tile updates on first tap (sync fix — was async before)

**CSS var refactor — comprehensive:**
- `.card`, `.stat-card` → `var(--hs-card-bg, white)` + `var(--hs-card-text, indigo)`
- `.card-title`, `.nav-label`, task text → `var(--hs-subtext)`
- `.bottom-nav` → `var(--hs-card-bg)` background
- `.hs-task-row` → `var(--hs-body-bg)` background
- `.hs-task.done/pending/rejected` → rgba backgrounds (work on dark themes)
- Trust badges → rgba backgrounds
- Nav active state → `var(--hs-primary)`
- XP ring/bar → `var(--hs-xp-fill)` + `var(--hs-primary-light)`
- `screen-app` → `var(--hs-body-bg)` background
- All HS text elements use CSS vars — no JS card override needed

**Photo Avatar:**
- Change Avatar drawer now has two tabs: 🎭 Emoji and 📸 Photo
- Photo tab: tap to open camera (selfie) or gallery (`capture="user"` on file input)
- Client-side compress + crop to 200×200 circle via Canvas (~15-30KB output)
- Saves as base64 to new `profiles.avatar_photo` column (run SQL above)
- Displays in HS header, Settings card, updates live on save
- Switching back to emoji clears photo and vice versa

**Bug fixes:**
- `loadProfile` triple-fire fixed — `profileLoadInProgress` flag prevents onAuthStateChange racing with window.load
- Settings screen scroll fixed — `overflow-y:auto; max-height:calc(100vh - 60px)`
- Theme card insertion made bulletproof — static `<div id="hsThemeCardPlaceholder">` in HTML

**Pro subscription propagation — fully built:**
- `profiles.subscription_status` is the runtime source of truth for students (not `currentFamily`)
- `linkToFamily()` — child joining a Pro family inherits `subscription_status` immediately on link
- `stripe-webhook` Edge Function updated — `setFamilySubscription()` helper fetches all children in family and updates each `profiles.subscription_status` on payment AND on cancellation
- Three scenarios covered: ✅ parent pays → existing kids Pro, ✅ child joins after payment → inherits Pro, ✅ parent cancels → all kids back to free
- **Remember:** JWT verification must be OFF on stripe-webhook after every redeploy

**Next session TODO (Session 7):** ✅ COMPLETED — see Session 7 log

**Privacy & Legal — completed Session 6:**
- Privacy Policy drafted and deployed to both focablyed.com and focably.vercel.app (/privacy-policy.html)
- Covers AU (Privacy Act 1988, APPs, NDB scheme) and NZ (Privacy Act 2020) in single document
- Data residency: assumed Sydney ap-southeast-2 (Supabase Pro) — update Supabase plan to confirm
- All third parties disclosed: Supabase, Stripe, Anthropic, Vercel, HubSpot
- Privacy Policy link added to landing page footer
- ⚖️ Legal & Privacy card added to app Settings screen (Privacy Policy link + Delete Account)
- confirmDeleteAccount() function built — double-confirmed, deletes in correct FK order
- ⚠️ Manual TODO: Add ABN to privacy policy ("ABN to be inserted" placeholder)
- ✅ privacy@focablyed.com set up as alias on steve@focablyed.com (M365)
- ⚠️ Manual TODO: Confirm Supabase plan is Pro with ap-southeast-2 (Sydney) region selected

### 16 Jun 2026 (Session 5) — Landing rebrand, Stripe payments, AI cap

**Landing page (focably-Landing repo):**
- Full colour rebrand from amber/brown/cream → app palette (indigo #0F172A bg, violet #7C3AED primary, mint #10B981 accents). Amber #F59E0B kept as warm accent on dark.
- "Our story" section moved to immediately after hero (second thing visitors read).

**Stripe payments (main app) — WORKING END-TO-END (verified to checkout page):**
- Server-side Checkout Session architecture (client-only `redirectToCheckout` is DEPRECATED by Stripe — no longer available, do not attempt).
- Two Supabase Edge Functions deployed:
  - `create-checkout-session` — takes priceId/email/userId, calls Stripe API with secret key, returns hosted checkout URL. Has CORS headers.
  - `stripe-webhook` — verifies Stripe signature (Web Crypto HMAC-SHA256), handles `checkout.session.completed` → sets families.subscription_status='pro' + stripe IDs; handles `customer.subscription.deleted` → sets 'free'. Uses service_role key to bypass RLS.
- App flow: paywall modal → startStripeCheckout() POSTs to create-checkout-session Edge Function → window.location redirect to Stripe → returns with ?checkout=success → handleStripeReturn() refreshes family record.
- Stripe config in app: STRIPE_PK (pk_live), STRIPE_PRICE_MONTHLY = price_1TiYduBClvRtlFVHK1JSodkf ($9.99/mo inc GST), STRIPE_PRICE_ANNUAL = price_1TiYeWBClvRtlFVH8KKVA20U ($89/yr inc GST). NOTE: these were initially swapped, now correct.
- LIVE MODE (pk_live/sk_live). GST-inclusive pricing for AU B2C.
- Webhook signing secret + service_role key are hardcoded in the Edge Functions.
- **CONFIRMED WORKING END-TO-END (16 Jun):** real $9.99 purchase → webhook fired → families row flipped to pro → app shows ⭐ PRO badge + "Pro Active" drawer. Full loop verified.

**Paywall gates (freemium) — all built:**
- isPro() helper checks subscription_status (pro OR school_attached). MUST be defined early in main script (hoisting bug fixed — was throwing "isPro is not defined").
- Join a Class (parent) — gated, fires paywall.
- 2nd child via family invite — gated.
- AI Import cap: 3 per user per month, all roles, resets 1st of month. Tracked in profiles.ai_import_count + ai_import_reset_at columns. Gates parseImportedAssignment, breakdownTask, breakdownHS. Usage hint shows remaining count. Pro = unlimited.
- ⭐ PRO badge next to parent name; drawer shows Upgrade vs Active.

**DB columns added this session:**
- licenses table (re-run); families: subscription_status/school_id/stripe_customer_id/stripe_subscription_id; profiles: ai_import_count/ai_import_reset_at.

**Key learnings:**
- WEBHOOK 401 FIX: Supabase gateway rejects Stripe (no Supabase JWT) with 401 UNAUTHORIZED_NO_AUTH_HEADER before code runs. Must turn OFF "Verify JWT" on the function (Edge Functions > stripe-webhook > Settings). TOGGLE IS STICKY — reverts to ON, especially on redeploy. Always re-check after deploying.
- WEBHOOK 500 FIX: db.auth.admin.getUserByEmail() does NOT exist on supabase-js v2. Use the user_id passed via Stripe metadata.user_id / client_reference_id instead (app passes userId in create-checkout-session body → flows to session metadata). Match families on parent_id.
- Service worker aggressively caches — must Unregister + Clear site data to see new deploys. Recurring pain point.
- String-replace pushes can SILENTLY MISS — always verify function defs landed (Stripe JS block was lost once, caused "handleStripeReturn is not defined").
- All paywall/Stripe/AI functions must live in the SAME <script> block as main app (single inline script in this app).

**Next session TODO:**
- (DONE) Webhook confirmed working on real purchase.
- Possible: Subscription Status screen (plan, renewal date, Stripe customer portal manage/cancel link) — currently drawer just shows "Pro Active" + toast.
- (DONE) Post-checkout login bounce FIXED: on Stripe return (?checkout= in URL), getSession now retries up to 5x (1.2s apart) before showing auth, so the rehydrating session isn't missed. If session genuinely drops, checkout result is stashed in sessionStorage and replayed (success toast + badge refresh) after re-sign-in. handleStripeReturn also re-checks families row up to 3x to cover webhook timing.
- License gate on Create School (B2B).
- THEME SYSTEM — still not built. Design locked (Free 2-3 presets / Pro full library + AI generator; 10 themes named; profiles.theme column exists; AVATARS_HS vs AVATARS_PRIMARY split done). This is the next big feature.

### 13 Jun 2026 (Session 3, part 3) — Logo, pricing, themes, story, email
- Squirrel logo deployed everywhere (app + landing page)
- Pricing model locked including Platinum enterprise tier
- Theme marketplace designed (Steve's idea)
- AI photo theme generator (Zoe's idea)
- Landing page story rewritten: Kim as idea person, Steve as builder, real ADHD family narrative
- M365 email setup started: MX record added to focablyed.com, awaiting DNS propagation

### 13 Jun 2026 (Session 3, part 2) — School Admin, rebrand, pricing design
- Rebranded AchievED → FocablyED
- School Admin dashboard, teacher approval flow, direct student enrolment
- Pricing model designed

### 13 Jun 2026 (Session 3, part 1) — Archive, footer nav, rewards
- Archive persisted, footer nav wired, full rewards loop

### 13 Jun 2026 (PM) — Naming, branding, landing page, domains

### 13 Jun 2026 (AM) — School concept, avatars, smart import, business planning

### 12 Jun 2026 — Auth fix, parent detail, dynamic codes, teacher view polish

### 11 Jun 2026 — Nav, approvals, notifications, archive, parent grouping

---

## How to Use This File

**Session start:** paste this file, state what to build.
**Session end:** ask Claude to update CLAUDE_CONTEXT.md.

### 24 Jun 2026 (Session 10) — linkToFamily Bug Resolution, Google Play Internal Testing Live

**linkToFamily bug — fully resolved:**
- Root cause: `loadStudentAssignments` queried DB immediately after insert — Supabase propagation delay meant child row returned null, showing link card again
- Fix 1: `linkToFamilyInProgress` flag + button disabled on first tap — prevents double-tap race condition
- Fix 2: `dbQuery` wrapper added to family lookup (was bare `db.from()`)
- Fix 3: `newChild` passed directly from insert result through `loadStudentApp(knownChild)` → `loadStudentAssignments(ageGroup, knownChild)` — bypasses DB query entirely on first link, no propagation delay
- Fix 4: Unique constraint violation (error code 23505) handled gracefully — treated as "already linked", finds existing row and loads app
- Fix 5: `completeOnboarding` now uses `dbQuery` wrapper for profile save, shows error toast if save fails
- Fix 6: `completeOnboarding` also updates `children.age_group` in case it was null at link time
- `children_profile_id_unique` UNIQUE constraint added to Supabase — duplicate inserts impossible at DB level
- **Confirmed working:** 3rd child links correctly, parent sees all 3 children, no duplicates. Cache was masking fixes during testing — always use incognito for definitive test.

**Google Play Store — Internal Testing LIVE:**
- App published as `FocablyED_Beta_1.0` on Internal testing track
- Package name: `app.focablyED.com`
- TWA (Trusted Web Activity) wrapping PWA at `https://focably.vercel.app`
- Generated via PWABuilder — AAB uploaded to Play Console, signed by Google (recommended option selected)
- Store listing complete: short description, full description, category (Education), tags, privacy policy URL, data safety, content rating, target audience, sign-in details (steve@tph.net.au)
- 2 testers added (Test_list_1), tester invite link copied
- `assetlinks.json` updated with correct SHA-256 fingerprint (`25:97:9B:1B:92:80:DC:4E:33:C7:50:C3:3A:D4:70:71:C6:E0:DB:12:52:0F:A8:FD:A8:B0:D0:1A:80:8C:9A:43`) and correct package name (`app.focablyED.com`)
- Feature graphic created in Canva (brand kit kAHMhpLdWlw "Focably") — YouTube banner format resized to 1024×500px
- **Address bar:** TWA will run fullscreen now that `assetlinks.json` fingerprint matches — verify on device

**PWABuilder notes (important for future runs):**
- Package name must be `app.focablyED.com` — Play Console locks this in on first upload
- Version code must increment on each new upload (Play Console rejects reused version codes)
- Select "Let Google manage signing key" — do NOT upload own keystore
- SHA-256 from signed APK: `25:97:9B:1B:92:80:DC:4E:33:C7:50:C3:3A:D4:70:71:C6:E0:DB:12:52:0F:A8:FD:A8:B0:D0:1A:80:8C:9A:43`

**Canva brand kit — correct ID confirmed:**
- ✅ Correct brand kit: `kAHMhpLdWlw` (named "Focably")
- ❌ Wrong: `kAGUTESm9aE` — do not use
- For landscape outputs use `facebook_cover` or `youtube_banner` design types (not `poster` which defaults to portrait)

**Rewards bug — partially resolved:**
- RLS on `rewards` table was blocking both students and parents — policies added
- Student rewards now showing correctly in Rewards tab ✅
- Parent Manage Rewards still not showing created rewards — debug console logs added to `loadManageRewards`. Suspect `rewardChildPicker` value not matching or `currentChildren` stale. Needs desktop console investigation next session.
- Duplicate `families` rows bug fixed — `loadParentApp` now picks family with children rather than using `.maybeSingle()` which fails on multiple rows
- `families_parent_id_unique` constraint added to Supabase — prevents duplicate family rows
- Dave's duplicate family rows cleaned up via SQL**
- ⬜ iOS Capacitor wrapper — Apple Developer Program enrollment pending (enrolling as organisation tonight). Once approved, set up Capacitor on Mac, build iOS IPA, submit to App Store Connect
- ⬜ Pull-to-refresh — still reloading app on TWA. Three fixes attempted (overscroll-behavior, preventDefault on touchmove, manifest display_override + launch_handler). May require Capacitor to fix properly at native level.
- ⬜ Install app on Android device via tester link — verify fullscreen (no address bar) ✅ confirmed working
- ⬜ Screenshots for Play Store (minimum 2 — use Chrome DevTools device toolbar or shots.so)
- ⬜ App icon 512×512px in Canva (brand kit kAHMhpLdWlw)
- ⬜ Test email notifications end-to-end (submit proof → parent email, approve reward → student email)
- ⬜ Rotate ALL exposed keys: Anthropic API key, Resend API key, GitHub PATs, HubSpot Service Key
- ⬜ Landing page rewrite with new brand copy
- ⬜ Delete test contacts/deals from HubSpot

### 23 Jun 2026 (Session 9) — Go-to-Market Strategy, Store Listing, Bug Fixes

**Google Play Console:**
- Identity verification approved ✅
- Apple Developer Program — signing up tonight (enroll as organisation, not individual — cleaner for future entity transfer)

**Brand strategy locked:**
- Tagline: `The system isn't broken. It just wasn't built with your child in mind.`
- Hero message: `Stop asking "what homework do you have?" FocablyED already knows.`
- Squirrel origin story: named after ADHD distraction reflex ("SQUIRREL!" from Pixar's UP — Zoe's lived experience). Acorn parable = one small step builds into something bigger.
- Two-audience funnel: Parent downloads (empathy/credibility sell) → Child uses (cute squirrel mascot works for ADHD kids who also like cutesy things)

**Freemium vs Pro value proposition — locked:**
- Freemium: Squirrel breaks down assignments once parent/child have the info. Parent still has to extract assignment details from child.
- Pro: Teacher connects → assignments arrive automatically before child gets home. Nobody has to ask anyone anything.
- Teacher is always FREE to use. Parent pays to connect and see teacher-assigned tasks.

**Play Store listing copy — locked:**
- App name: `FocablyED`
- Short description: `The system wasn't built for your child. FocablyED was.`
- Full description: Written around parent pain narrative (week after week, year after year), three-way loop (student/parent/teacher), Squirrel AI, freemium/Pro split. See store listing draft in session chat.

**Founder Facebook post — locked:**
- Post as Steve (dad), not as brand
- Strategy: join ADHD parent Facebook groups, participate genuinely 2-3 weeks, then post
- Post text finalised — leads with "My daughter has ADHD. She's 15." / nightly homework question / "How did you manage this?"
- Follow-up post (day 2) reveals the app after comments roll in
- Target metric: 50 paying families, not follower count

**Bug fix — linkToFamily duplicate children:**
- Symptom: entering family invite code kept creating duplicate child records in `children` table without navigating away from link screen
- Root cause 1: `existingRows` check used bare `db.from` (not `dbQuery`) — timed out silently, returned nothing, bypassed duplicate check
- Root cause 2: `dbQuery` default fallback was `[]` not `null` — length check on empty array always false
- Fix 1: Changed `existingRows` query to use `dbQuery` with `null` default
- Fix 2: Changed check to `existingRows && existingRows.length > 0`
- Fix 3: If already linked, load the app instead of dead-ending with toast
- Fix 4: Added 800ms delay after insert before `loadStudentApp()` to allow Supabase propagation
- Status: pushed, still investigating — console logs added to confirm which path fires

**Session 10 continued — Testing & Bug Fixes:**
- ✅ Star value picker (1-5⭐) added to Add Task screen for parents — `selectedTaskStars` variable, `selectTaskStars()` function, wired into `parentAddTask()`
- ✅ Enrolled Classes card added to parent dashboard — always shows classes child is in even with no assignments, with subject/year group/teacher name
- ✅ Assignments query in `loadChildStats` wrapped in `dbQuery` — was bare `db.from()`, silently timing out
- ✅ Private tasks appear in Subject Progress as "📚 Home Tasks — Added by you" tile
- ⚠️ TWA cache issue — Android requires "Clear Data" (not just Clear Cache) after deploys to pick up latest code. Recurring pain point until Capacitor wrapper built.
- ⚠️ Manage Rewards still not showing for parent Dave — debug logs added, needs desktop console investigation
- ⚠️ Pull-to-refresh — 3 fix attempts (overscroll-behavior, preventDefault, manifest launch_handler). Still reloading. Needs Capacitor.

**Next session TODO (Session 11):**
- ⬜ Manage Rewards display bug — open desktop console as Dave, check loadManageRewards logs (childId value and query result)
- ⬜ TWA cache issue — Clear Data (not just Clear Cache) needed on Android after every deploy. Capacitor wrapper will fix permanently.
- ⬜ iOS Capacitor wrapper — Apple Developer Program enrollment pending (enrolling tonight as organisation)
- ⬜ Pull-to-refresh — still reloading on TWA, needs Capacitor for proper fix
- ⬜ Screenshots for Play Store (minimum 2)
- ⬜ App icon 512×512px in Canva (brand kit kAHMhpLdWlw)
- ⬜ Test email notifications end-to-end
- ⬜ Rotate ALL exposed keys: Anthropic API key, Resend API key, GitHub PATs, HubSpot Service Key
- ⬜ Landing page rewrite with new brand copy
- ⬜ Delete test contacts/deals from HubSpot

**Next session TODO (Session 10):**
- ⬜ Confirm linkToFamily bug fully resolved (check console logs, clean duplicate Chewies from children table)
- ⬜ Test email notifications end-to-end (submit proof → parent email, approve reward → student email)
- ⬜ Rotate ALL exposed keys: Anthropic API key, Resend API key, GitHub PATs, HubSpot Service Key
- ⬜ Screenshots for Play Store (Chrome DevTools → device toolbar → Capture screenshot, or shots.so)
- ⬜ Feature graphic 1024×512px in Canva (brand kit kAGUTESm9aE, deep purple #7B2FBE, XP gold #F9CA24)
- ⬜ App icon 512×512px in Canva
- ⬜ Apple Developer Program enrollment (as organisation)
- ⬜ Landing page rewrite with new brand copy
- ⬜ Delete test contacts/deals from HubSpot

### 17 Jun 2026 (Session 8) — Resend Email Notifications

**Email infrastructure — fully built and live:**
- 3 Supabase Edge Functions deployed: `send-transactional`, `send-digest`, `send-warnings`
- `send-transactional` — instant triggers: proof submitted → parent, proof approved/rejected → student, reward approved/rejected → student, reward requested → parent
- `send-digest` — weekly Sunday 6pm AEST summary to all parents (tasks done, stars, XP, streaks, overdue count)
- `send-warnings` — daily 7am AEST overdue/due-soon alerts to parents (grouped by child, colour-coded urgency)
- All emails branded: squirrel logo, indigo/violet gradient header, FocablyED footer with privacy policy link
- Sends from `notifications@focablyed.com` (Resend domain verified ✅)
- Resend API key stored as Supabase Edge Function secret `RESEND_API_KEY`
- pg_cron enabled, both scheduled jobs registered (`weekly-digest`, `daily-warnings`)
- All 4 Edge Functions have Verify JWT OFF: `send-transactional`, `send-digest`, `send-warnings`, `send-push`, `stripe-webhook`
- App wired: `sendTransactionalEmail(type, data)` helper added, called at all trigger points

**HubSpot waitlist pipeline — fully built and live:**
- Waitlist form → Supabase → `hubspot-sync` Edge Function → HubSpot Contact + Deal
- HubSpot Service Key stored as `HUBSPOT_TOKEN` Supabase secret
- Contact properties: `focably_role`, `focablyed_challenge`, `focablyed_interests`, `focablyed_source`, `focablyed_num_children`, `focablyed_school_year`, `focablyed_adhd_flag`, `focablyed_school_type`
- Deal at stage `appointmentscheduled`, linked to Contact via v4 associations API (associationTypeId: 3)
- Form validation: Name, Email, Role (step 1) + How you heard about us + Mobile (step 3) all required
- Vercel Pro plan activated this session

**Next session TODO (Session 9):**
- ⬜ Test email notifications end-to-end (submit proof → check parent email, approve reward → check student email)
- ⬜ V1.0 launch checklist review — what's left before handing link to real families
- ⬜ Rotate ALL exposed keys: Anthropic API key + Resend API key + GitHub PATs + HubSpot Service Key
- ⬜ Delete test contacts/deals from HubSpot (Peter, Sue, John, Kevin, Kerry test entries)

### 16 Jun 2026 (Session 7, continued) — Brain Dump, Squirrel AI, License Gate, Landing Page AI Section

**Brain Dump mode — fully built:**
- 🐿️ Brain Dump button on both primary and HS student home screens (pulsing, prominent)
- Drawer screen: text input + 🎤 voice button (Web Speech API, en-AU, Chrome/Safari)
- Claude API (claude-sonnet-4-20250514) extracts tasks into JSON array with title, subject, due_date, notes
- Results render as editable cards (title, subject, due date, checkbox)
- Save All Tasks → saves checked tasks to assignments table, refreshes student view
- Gated: counts against AI import cap (3/month free, unlimited Pro)
- Fixed: CORS issue (wrong model string), broken regex, broken prompt string (literal newlines)

**Squirrel AI character — introduced throughout app:**
- Squirrel is FocablyED's AI mascot (the orange squirrel from the logo, named by the team)
- Brain Dump: "Tell Squirrel everything — she'll sort it out 🐿️" / "🐿️ Squirrel, sort this!" / "🐿️ Squirrel found N tasks!"
- Task Breakdown: "🐿️ Ask Squirrel — Break Any Task" / "🐿️ Ask Squirrel" button
- Smart Import: "Squirrel will pull out the key details automatically 🐿️" / "🐿️ Ask Squirrel" button
- Hamburger menu: 🐿️ Ask Squirrel (replaces ✨ Break Any Task)
- Subscription screen: "🐿️ Unlimited Squirrel requests"
- Squirrel referred to as "she"

**License gate on Create School:**
- License key field added to Create School screen (FOCABLY-XXXX-XXXX format)
- Regex validation before hitting Supabase
- Checks: key exists, not already assigned to a school, not expired
- On success: school created with subscription_status='active', license row updated with school_id + activated_at
- To issue a key: INSERT INTO licenses (key, tier, max_students, expires_at) VALUES ('FOCABLY-XXXX-XXXX', 'small', 300, '2027-12-31')

**Landing page — AI features section added:**
- New dark indigo section between "How it works" and screenshots
- Six feature cards: Brain Dump, AI Task Breakdown, Smart Import, Themes, Teams Import, Stars/XP/Rewards
- Each card has colour-coded badge (ADHD-first / For everyone / Smart import)
- Copy focused on student pain points

**ABN added to privacy policy (both repos):**
- Your Finance Dept Pty Ltd (ABN 95 129 679 205)

**FocablyED.com.au DNS:**
- Already added to Vercel (focably-landing project)
- DNS records added in Crazy Domains — awaiting propagation

**Microsoft Teams OAuth:**
- Azure AD app: FocablyED, client ID 2593af2c-94ef-47ec-aa9a-40de24336aca
- Permissions: User.Read, EduAssignments.ReadBasic
- Redirect URI: https://focably.vercel.app (SPA)
- Disconnect button added — clears sessionStorage

**Next session TODO (Session 8):**
- Email notifications system (Resend or SendGrid):
  - Overdue task warnings to parents
  - Weekly digest for parents (Sunday evening)
  - Task completion notifications
  - Reward approval/rejection to student
- Push notifications end-to-end test
- HubSpot waitlist debug
- Celebration moments (confetti on task complete)
- V1.0 launch checklist review
