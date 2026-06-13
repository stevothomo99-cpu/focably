# FocablyED — Claude Session Context

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
- **Mascot:** Squirrel 🐿️ — named by Zoe (Steve's daughter, 15, ADHD), inspired by Doug from Pixar's UP ("SQUIRREL!")
- **Logo:** `squirrel.png` committed to app repo — orange squirrel holding acorn, dark teal rounded-square. Deployed as favicon, PWA icon, nav logo, auth screen, settings card, install banner, landing page hero + nav + footer.
- **Logo URL:** `https://raw.githubusercontent.com/stevothomo99-cpu/focably/main/squirrel.png`
- **Domains (all via Crazy Domains):**
  - focablyed.com ✅ (primary)
  - focablyed.com.au ✅ (Australian market)
  - focablyed.app ✅ (app-specific)
  - facably.com, facably.app, facablyed.com, facablyed.app ✅ (typo purchases — keep as redirects)
- **DNS:** Crazy Domains nameservers → Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- **M365 email setup in progress:** MX record added to focablyed.com in Crazy Domains (ms14690949.msv1.invalid, priority 50). Awaiting DNS propagation + verification. TXT/CNAME records still to add. Target mailboxes: steve@, kim@, hello@, schools@, support@focablyed.com
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

---

## Business Model & Pricing

### Core principle
**Everyone signs up free. You only pay when you want to connect roles.**
- Students never pay
- Teachers never pay directly
- Money flows from parents (Family Pro) and schools (license)

### Full pricing structure

| Tier | Price | Students | Parents | Notes |
|---|---|---|---|---|
| Freemium | Free | — | 1 child, no teacher connection | Top of funnel |
| Family Pro (standalone) | $9.99/mo or $79/yr | — | Full features + teacher connection | Standalone families |
| Family Pro (school-attached) | $4.99/mo or $39/yr | — | Full features + teacher connection | Detected via school_id on family |
| School Small | $990/yr | ≤300 | Discounted at $4.99/mo | Dept head approval |
| School Medium | $1,990/yr | ≤800 | Discounted at $4.99/mo | Dept head approval |
| School Large | $3,490/yr | Unlimited | Discounted at $4.99/mo | — |
| School Platinum | $5,990/yr | Unlimited | **Fully included** | Enterprise — whole school covered |

### Freemium gates (not yet built — Session 4 priority)
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

## Theme System (major roadmap item — Steve's idea)

### The insight
ADHD students hyperfocus — one week Percy Jackson, next week something else entirely. Themes need to be switchable on a whim, not a one-time setting. Switching themes is itself a dopamine hit that makes opening the app feel fresh.

### Theme marketplace
- **Free tier:** 5-6 preset themes
- **Pro tier:** full theme library + 1 AI custom theme
- **Theme store:** buy individual themes ($0.99–$2.99) or unlock via XP milestones
- **Unlimited custom:** premium store feature
- Limited/seasonal drops create urgency and social currency

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
- Official collabs = press release + revenue share + mass signups
- Keep themes evocative (not explicit) until then — legally safe

### Zoe's AI photo theme generator (Zoe's idea — unofficial head of product 🐿️)
- Student uploads 3-5 photos (their aesthetic, vibe, fandom)
- AI analyses colours, mood, style → generates unique custom theme
- Every generated theme is one-of-a-kind — huge for teenage self-expression
- Completely sidesteps IP issues — user-generated from their own photos
- **Desktop-first** for generation (bigger screen, file access, processing time) → syncs to mobile instantly
- Monetisation: Free = preset only; Pro = 1 AI theme; Store = unlimited regeneration
- Tech: colour palette extraction + Claude API mood/style analysis → theme generation

### HS theme considerations
- Must cover both younger (12-13) and older (15-16) HS students
- Dark mode is non-negotiable for older students
- Themes should feel chosen/earned, not assigned
- Switching must be instant and frictionless

---

## License System (build Session 4)

### Design decisions
- **Create School requires a license key** — no free school creation
- **Join School is free** — teacher uses school invite code; school license covers them
- **License key format:** FOCABLY-XXXX-XXXX (manually issued for pilot, Stripe-generated later)
- **Pilot phase:** Steve manually inserts license rows in Supabase, hands keys to pilot schools

### SQL to run when building license gate (NOT YET)
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

### SQL needed before testing school features
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_school_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_school_role_check
  CHECK (school_role IN ('admin', 'member', 'pending'));
ALTER TABLE classes ADD COLUMN IF NOT EXISTS direct_student_enrol boolean DEFAULT false;
```

### Known Bugs / Issues
- (none currently open)

### Next Priorities (Session 4)
1. **License gate on Create School**
2. **Freemium/Pro paywall** — parent joining a class
3. `subscription_status` + `school_id` on families table
4. HS theme system — switchable themes, dark mode, theme store foundation
5. Complete M365 email setup (TXT/CNAME records still needed)
6. End-to-end test all features
7. Fix landing page remaining "Focably" instances
8. Add focablyed.com.au to Vercel

---

## Future Features Roadmap

### Near-term (next 2–3 sessions)
- License gate on Create School
- Freemium paywall — Join a Class gate, 2nd child gate
- Stripe integration
- HS theme system — switchable themes, dark mode, XP unlocks
- School-attached parent discount detection
- Platinum parent inclusion bypass

### Medium-term
- Theme marketplace — store, purchases, limited drops
- AI photo theme generator (desktop-first, syncs to mobile)
- Evocative fandom themes (legally safe aesthetics)
- School Admin: student count enforcement, Stripe billing portal
- Custom school branding (Platinum)
- Profile photo + reward image uploads (Supabase Storage)

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
| families | id, parent_id, invite_code, invite_code_expires_at, family_name | **needs** subscription_status + school_id (Session 4) |
| children | id, profile_id, name, family_id | |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id, direct_student_enrol | |
| class_members | id, class_id, child_id | |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order | |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read_at, created_at | |
| waitlist | id, email, created_at | landing page — RLS disabled |
| rewards | id, family_id, created_by, child_id, title, emoji, star_cost, is_active, created_at | |
| redemptions | id, reward_id, child_id, family_id, status, requested_at, responded_at | |
| licenses | **NOT YET CREATED** | key, tier (small/medium/large/platinum), max_students, school_id, activated_at, expires_at, stripe_subscription_id |

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

---

## Tech Debt

- index.html ~4,800+ lines — style cleanup pass once features stable
- ~300 inline style attributes, duplicated patterns
- Consider one-off human developer review (bus-factor insurance)
- Long term: migrate domains from Crazy Domains to Cloudflare Registrar

---

## Session Log

> _Most recent at top._

### 13 Jun 2026 (Session 3, part 3) — Logo, pricing, themes, story, email
- Squirrel logo deployed everywhere (app + landing page)
- Pricing model locked including Platinum enterprise tier
- **Theme marketplace designed (Steve's idea):**
  - Switchable on a whim — dopamine hit for ADHD students
  - Evocative aesthetics (not licensed IP) + studio licensing roadmap at scale
  - XP unlock milestones, limited drops, social currency
  - Free presets / Pro custom / store unlimited
- **AI photo theme generator (Zoe's idea):**
  - Upload 3-5 photos → AI generates unique personal theme
  - Desktop-first, syncs to mobile
  - Completely sidesteps IP issues
- Landing page story rewritten: Kim as idea person, Steve as builder, real ADHD family narrative, "out of sight out of mind" insight
- M365 email setup started: MX record added to focablyed.com, awaiting DNS propagation
- Files changed: index.html, focably-Landing/index.html, squirrel.png, CLAUDE_CONTEXT.md

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
