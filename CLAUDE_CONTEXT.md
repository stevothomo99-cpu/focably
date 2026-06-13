# Focably (FocablyED) — Claude Session Context

> **Instructions:** Paste this file (or relevant sections) at the start of each Claude session.
> Update the "Current Status" and "Session Log" sections after each session.

---

## Project Overview

**App:** FocablyED — gamified school task and accountability tool for parents, students, and teachers. ADHD-friendly design is a core value proposition.
**Live App URL:** https://focably.vercel.app
**Landing Page URL:** https://focablyed.com
**Stack:** Single-file vanilla HTML/CSS/JS app, Supabase backend, deployed on Vercel
**Supabase project:** mxgnrgajspprupzxaeld.supabase.co
**GitHub repo (app):** stevothomo99-cpu/focably
**GitHub repo (landing page):** stevothomo99-cpu/focably-Landing

> **IMPORTANT:** The live app is **`index.html`** (the FocablyED build with real Supabase auth).
> `focably.html` is an OLD prototype — **IGNORE IT.** All work goes into `index.html`.

---

## Branding

- **Name:** FocablyED (made-up word: Focus + Ability + ED suffix for education)
- **Mascot:** Squirrel 🐿️ — named by Zoe (Steve's daughter, 15, ADHD), inspired by Doug from Pixar's UP ("SQUIRREL!"). Placeholder emoji in use until proper illustration sourced.
- **Domains (all via Crazy Domains):**
  - focablyed.com ✅ (primary)
  - focablyed.com.au ✅ (Australian market)
  - focablyed.app ✅ (app-specific)
  - facably.com, facably.app, facablyed.com, facablyed.app ✅ (accidental typo purchases — keep as redirects)
- **DNS:** Crazy Domains nameservers pointed to Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- **Note:** focably.com was front-run/domain-sniped by Namecheap after searching — do not use Namecheap again. Use Crazy Domains or Cloudflare Registrar.

---

## Architecture Summary

- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres with RLS enabled
- **Frontend:** ONE file — `index.html` (~4,800+ lines). Vanilla JS, no framework, no build step.
- **User roles:** Student (primary + high-school modes), Parent, Teacher
- **Deploy:** push to GitHub `main` → Vercel auto-deploys

---

## Landing Page

- **Repo:** stevothomo99-cpu/focably-Landing
- **Live at:** focablyed.com
- **Stack:** Single file index.html — vanilla HTML/CSS/JS, no framework
- **Fonts:** Fraunces (display serif) + Inter (body)
- **Palette:** Warm amber/cream — #E8A020 amber, #FBF7F0 cream, #1E1712 ink
- **Waitlist:** Form submits email to Supabase `waitlist` table (same project: mxgnrgajspprupzxaeld)
- **Waitlist table columns:** id (int8 PK), email (text, not null), created_at (timestamptz, default now())
- **RLS:** Disabled on waitlist table (public inserts allowed)
- **TODO:** Nav + body copy still says "Focably" in a couple of places — needs final pass

---

## Working Method (how Claude edits this app)

- Claude pulls `index.html` from GitHub via the API, edits locally, pushes back (commits to `main`).
- A GitHub personal access token is used for this. **If a token is ever pasted in chat, revoke + rotate it** at https://github.com/settings/tokens.
- Steve cannot code — he is the product owner / tester. He finds bugs by using the live app; Claude writes the code.
- Common bug pattern to watch: **inline onclick with JSON/quotes breaks the HTML attribute**. Prefer data-* attributes + a handler function.

---

## Current Status

### Working
- Student sign-up + family linking (student ↔ parent via family invite code)
- Auth + profile loading; sign-up/sign-in/forgot-password screens all functional
- Teacher view: class selector, assignments (by assignment / by student), class-filtered
- Unified approval queue (teacher + parent share one queue; approve/reject cross-clears both)
- Notifications: in-app bell (top nav) + Supabase notifications table, polls every 60s
- Archive: Supabase-persisted — survives page refresh; restore works
- Hamburger drawer nav for secondary actions (all 3 roles)
- Date-based assignment status colours (red ≤7d / amber ≤14d / green 15d+ / grey complete)
- Parent Subject Progress: assignments grouped under collapsible class headings
- Parent: tap an assignment → full Assignment Detail screen
- Parent Add Task: Private vs Tag to enrolled class
- Dynamic invite codes (family + class): 48h expiry, no ambiguous chars
- Top nav shows user's first name (all roles)
- Emoji avatars: picker on onboarding, Change Avatar in drawer
- Smart Import Assignment: paste any text → Claude API extracts details → confirmation card
- Footer nav wired: Home / Tasks / Rewards / Settings active; Messages = coming soon toast
- Settings screen: profile card, avatar change (student), notifications, Sign Out
- **Rewards system (full loop):** parent creates rewards → student redeems → parent approves → stars deducted → notifications both ways
- **In-app rebrand:** AchievED → FocablyED throughout (title, meta, logo, tagline, install banner)
- **School Admin dashboard** (teacher admin → hamburger → School Admin):
  - School info, subscription badge, invite code + copy + regenerate
  - Pending teacher approvals (approve ✓ / remove ✗) — approved teacher gets notified
  - Active teachers list with remove option
  - All school classes with student counts + direct enrol badge
- **Teacher approval flow:** teachers who join a school land in `pending` state until admin approves
- **Direct student enrolment:** class creation has "Students can join directly" toggle — school-approved teachers only. Students gated: if flag off → "Ask your parent to join this class for you"
- **Student hamburger:** now includes "Join a Class" item
- **Enrolment matrix:**
  - Standalone teacher + parent: Teacher → Parent → child enrolled
  - School teacher (approved) + no parent: Teacher → Student directly (if direct_student_enrol on)
  - School teacher (approved) + parent linked: class appears in parent view automatically (retrospective — driven by class_members)
  - Freemium parent: creates tasks, no teacher involved

### In Progress / Needs Testing
- Full end-to-end test across all 3 roles with real data
- Test school create → teacher join → admin approve → direct enrol flow
- Test rewards loop end-to-end
- Run SQL for pending constraint + direct_student_enrol column (see below)

### Known Bugs / Issues
- (none currently open)

### Next Priorities
- **License gate on Create School** (see License System below) — next session
- End-to-end test all features
- Stripe paywall integration
- School Admin dashboard — student count enforcement (deferred to Stripe build)
- Fix landing page remaining "Focably" references → "FocablyED"
- Add focablyed.com.au as second domain in Vercel

---

## SQL Needed (run before testing school features)

```sql
-- Allow 'pending' as a school_role value
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_school_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_school_role_check
  CHECK (school_role IN ('admin', 'member', 'pending'));

-- Direct student enrolment flag on classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS direct_student_enrol boolean DEFAULT false;
```

---

## License System (planned — build next session)

### Design decisions made
- **Create School requires a license key** — no free school creation
- **Join School is free** — teacher uses school's invite code; school license already covers them
- **License key format:** FOCABLY-XXXX-XXXX (human-readable, manually issued for pilot)
- **Pilot phase:** Steve manually inserts license rows in Supabase and hands keys to pilot schools
- **Stripe phase:** webhook auto-creates license row after payment, emails key to purchaser

### License tiers (maps to school size pricing)
| Tier | Price | Max students |
|---|---|---|
| small | $990/yr | 300 |
| medium | $1,990/yr | 800 |
| large | $3,490/yr | Unlimited |

### Student cap enforcement
- Store `max_students` on `schools` table (set at license activation)
- **Enforcement deferred to Stripe build** — store the tier now, check it later
- When enforced: block student enrolment if school count >= max_students, notify admin to upgrade

### SQL to run when building license gate (NOT YET)
```sql
CREATE TABLE licenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  tier text CHECK (tier IN ('small','medium','large')),
  max_students integer,
  school_id uuid REFERENCES schools(id),
  activated_at timestamptz,
  expires_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now()
);
```

---

## Business Model & Roadmap

### Pricing (planned)
- **Freemium individual:** free, 1 child, basic features — top of funnel
- **Family Pro:** ~$9.99/month or $79/year AUD — unlimited children, full features
- **School subscription (flat annual):** small $990 / medium $1,990 / large $3,490
- Key threshold: keep school pricing under ~$2,000 so head of department can approve without board sign-off
- **Freemium = no school features** — school concept is school-license only

### Market sizing
- Australia: ~4,500 addressable schools (secondary + upper primary)
- NZ: ~1,200 / UK: ~8,000 / Canada: ~6,000 / USA: ~50,000 (last — COPPA complexity)
- Total addressable: ~70,000+ schools

### Go-to-market
- Parent-led discovery → Family Pro → parent brings app to school → school subscription
- ADHD/learning support angle: target SENCOs (UK), learning support coordinators (AU)
- NDIS/wellbeing budgets in AU schools can fund outside normal IT procurement

### Future features (roadmap)
- **License gate on Create School** — next session
- **Stripe billing:** webhook → Vercel serverless function → creates license record → updates school subscription_status
- **Profile photo + reward image uploads:** Supabase Storage, signed URLs, school-admin moderation toggle. Pro/school only.
- **Microsoft Teams for Education integration:** near-term Power Automate webhook; long-term MS Graph API
- **School Admin dashboard:** student count enforcement, link to Stripe billing portal
- **Data residency:** Supabase EU project for UK (GDPR)
- **COPPA compliance** before US launch

---

## Navigation Structure (current)

**Top nav (all roles):** logo | first name | 🔔 bell | ↻ refresh | ☰ hamburger

**Teacher main screen:** Class selector → Assignments → Step Approvals
**Teacher hamburger:** New Assignment, Import Assignment, Archive & Archived, Create New Class, School Admin (admin) / School Name (member) / Set Up or Join (none) / Awaiting Approval (pending), Sign Out

**Parent main screen:** child stats → Redemption Requests (if any) → Subject Progress → Step Approvals
**Parent hamburger:** Add Task for Child, Manage Rewards, Import Assignment, Family Invite Code, Join a Class, Sign Out

**Student main screen:** quest/XP header → Trust Score → class tiles → Treasure Chest (dynamic rewards)
**Student hamburger:** Break Any Task (AI), Import Assignment, Join a Class, Change Avatar, Sign Out

**Footer nav:** 🏠 Home | 📋 Tasks | 🏆 Rewards | 💬 Messages (coming soon) | ⚙️ Settings

---

## Database Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| profiles | id, role, full_name, age_group, theme, avatar, school_id, school_role | school_role = null/admin/member/pending |
| schools | id, name, invite_code, invite_code_expires_at, subscription_status, max_students | subscription_status = trial/active/past_due/cancelled |
| families | id, parent_id, invite_code, invite_code_expires_at, family_name | 48h dynamic codes |
| children | id, profile_id, name, family_id | profile_id links to student's auth profile |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id, direct_student_enrol | direct_student_enrol = school-approved teachers only |
| class_members | id, class_id, child_id | enrolment join |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order | |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read_at, created_at | |
| waitlist | id, email, created_at | landing page — RLS disabled |
| rewards | id, family_id, created_by, child_id, title, emoji, star_cost, is_active, created_at | parent-created rewards per child |
| redemptions | id, reward_id, child_id, family_id, status, requested_at, responded_at | status = pending/approved/rejected |
| licenses | **NOT YET CREATED** — see SQL above | key, tier, max_students, school_id, activated_at, expires_at, stripe_subscription_id |

---

## Conventions & Patterns

- Role is stored in `profiles.role` — always check this
- Student↔child link: `children.profile_id = auth user id`
- `dbQuery(promise, timeoutMs, fallback)` wrapper used for all Supabase calls
- Use `.maybeSingle()` not `.single()`
- Avoid inline onclick with JSON args — use data-* attributes + handler fn
- Status colours: red ≤7d, amber ≤14d, green 15d+, grey done
- `currentSchool` loaded at teacher login from `profiles.school_id`
- Avatar emoji sets: `AVATARS_HS` (cool/neutral 20 emoji), `AVATARS_PRIMARY` (fun/playful 20 emoji)
- Import flow uses Claude API (`claude-sonnet-4-20250514`) to extract assignment details
- `ALL_DRAWER_SCREENS` array must include any new screen — used by open/closeDrawerScreen
- Footer nav: `setFooterActive(tab)` sets active state; `footerNav(tab)` handles routing
- School role states: `null` (no school) → `pending` (joined, awaiting approval) → `member` (approved) → `admin` (created school)

---

## Tech Debt / Future

- index.html is ~4,800+ lines. Style cleanup pass once features stable.
- Consider a one-off human developer review (bus-factor insurance)

---

## Session Log

> _Brief entry after each session. Most recent at top._

### 13 Jun 2026 (Session 3, part 2) — School Admin, rebrand, license design
- **Rebranded app:** AchievED → FocablyED throughout (title, meta, logo, tagline "Focus. Achieve. Grow. 🐿️", install banner, settings card, AI breakdown copy)
- **School Admin dashboard built:**
  - Teacher who creates school = admin; others join as `pending` until approved
  - Admin screen: school info, subscription badge, invite code copy/regen, pending approvals, active teachers (remove), classes overview with student counts
  - Approved teacher gets notification on approval
- **Direct student enrolment:** `direct_student_enrol` flag on classes (school-approved teachers only). Students gated in joinClass() — blocked if flag off.
- **Student hamburger:** added "Join a Class" item
- **Enrolment model locked:**
  - Standalone: Teacher → Parent → child enrolled
  - School (approved teacher, no parent): Teacher → Student directly
  - Parent always gets retrospective visibility via class_members
- **License system designed (not yet built):**
  - Create School requires license key (manually issued for pilot, Stripe-generated later)
  - Join School free (school license covers all teachers)
  - Tiers: small $990/300 students, medium $1,990/800, large $3,490/unlimited
  - Student cap enforcement deferred to Stripe build
  - `licenses` table SQL documented but NOT YET RUN
- SQL needed before testing: pending constraint + direct_student_enrol column (documented above)
- Files changed: index.html, CLAUDE_CONTEXT.md

### 13 Jun 2026 (Session 3, part 1) — Archive persistence, footer nav, rewards system
- Archive persisted to Supabase — no more in-memory loss on reload
- Footer nav wired: Home/Tasks/Rewards/Settings + Settings screen built
- Rewards system: parent create → student redeem → parent approve → stars deducted → notifications
- Files changed: index.html, CLAUDE_CONTEXT.md

### 13 Jun 2026 (PM) — Naming, branding, landing page, domain setup
- Settled on FocablyED — mascot squirrel 🐿️ named by Zoe
- Domains: focablyed.com/.com.au/.app via Crazy Domains
- Landing page built + deployed to focablyed.com
- Waitlist wired to Supabase
- Files changed: CLAUDE_CONTEXT.md; new repo focably-Landing created

### 13 Jun 2026 (AM) — School concept, emoji avatars, smart import, business planning
- School tables, teacher badge, create/join school flows
- Emoji avatar picker, Change Avatar in drawer
- Smart Import Assignment via Claude API
- Files changed: index.html, CLAUDE_CONTEXT.md

### 12 Jun 2026 — Auth fix, parent detail, dynamic codes, teacher view polish
- FIXED: "Sign up for free" broken
- Parent assignment detail screen
- Dynamic invite codes 48h expiry
- Files changed: index.html only

### 11 Jun 2026 — Nav restructure, approvals, notifications, archive, parent grouping
- Hamburger drawer nav, unified approval queue, notification bell
- Parent Subject Progress, Add Task visibility toggle
- Multiple bug fixes
- Files changed: index.html only

---

## How to Use This File

**At session start:** paste this file and state what you want to build.
**At session end:** ask Claude to update CLAUDE_CONTEXT.md.
