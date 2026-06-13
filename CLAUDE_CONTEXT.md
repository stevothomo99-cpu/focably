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
- **Mascot:** Squirrel 🐿️ — named by Zoe (Steve's daughter, 15, ADHD), inspired by Doug from Pixar's UP ("SQUIRREL!"). Placeholder emoji until proper illustration sourced.
- **Domains (all via Crazy Domains):**
  - focablyed.com ✅ (primary)
  - focablyed.com.au ✅ (Australian market)
  - focablyed.app ✅ (app-specific)
  - facably.com, facably.app, facablyed.com, facablyed.app ✅ (typo purchases — keep as redirects)
- **DNS:** Crazy Domains nameservers → Vercel (ns1.vercel-dns.com, ns2.vercel-dns.com)
- **Note:** focably.com was domain-sniped by Namecheap — never use Namecheap again.

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
- **TODO:** Nav + body copy still says "Focably" in a couple of places — needs final pass

---

## Working Method

- Claude pulls `index.html` from GitHub via API, edits locally, pushes back.
- **GitHub token:** paste in chat to use, then immediately revoke at https://github.com/settings/tokens
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

### Freemium gates
- Adding a 2nd child → upgrade prompt
- Parent joining a class (teacher connection) → upgrade prompt
- Student using a class code → family needs Family Pro (unless school license covers it)

### School Platinum positioning
- Enterprise/principal-level sale — one invoice covers everyone
- No parent billing friction, no chasing families
- Suitable for NDIS/wellbeing budget funding (single line item)
- Premium extras to justify price: priority support, dedicated onboarding session, custom school branding (logo in app header), early feature access, annual review call

### The natural upgrade moment
> Teacher sends class code to parent → parent taps "Join a Class" → paywall: "Upgrade to Family Pro to connect with your child's teacher"

### School license covers
- Small/Medium/Large: teachers + students. Parents get discounted Family Pro.
- Platinum: teachers + students + **all parents included at no extra cost**

### Student cap enforcement
- Store `max_students` on `schools` table
- **Deferred to Stripe build** — store tier now, enforce later
- When enforced: block enrolment if count >= max_students, notify admin to upgrade

### Market sizing
- Australia: ~4,500 schools / NZ: ~1,200 / UK: ~8,000 / Canada: ~6,000 / USA: ~50,000
- Total addressable: ~70,000+ schools
- Go-to-market: parent-led → Family Pro → parent brings to school → school license
- ADHD angle: target SENCOs (UK), learning support coordinators (AU), NDIS budgets

---

## License System (build next session)

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
  max_students integer,               -- 300 / 800 / null (unlimited)
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
- **Rewards system:** parent creates → student redeems → parent approves → stars deducted → notifications
- **In-app rebrand:** fully FocablyED throughout
- **School Admin dashboard:** school info, subscription badge, invite code copy/regen, pending teacher approvals, active teachers, classes overview
- **Teacher approval flow:** join school → pending → admin approves → member
- **Direct student enrolment:** `direct_student_enrol` flag on classes (school-approved teachers only)
- **Enrolment matrix:**
  - Standalone teacher + parent: Teacher → Parent → child enrolled (parent needs Family Pro)
  - School teacher (approved) + no parent: Teacher → Student directly (if direct_student_enrol on)
  - School Platinum: Teacher → Student directly, parents included
  - Parent always gets retrospective class visibility via class_members

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
1. **License gate on Create School** — entry point for all school monetisation
2. **Freemium/Pro paywall gate** — parent joining a class triggers upgrade prompt
3. `subscription_status` on families table (free/pro)
4. `school_id` on families table (for discount detection)
5. End-to-end test all features
6. Fix landing page remaining "Focably" → "FocablyED" instances
7. Add focablyed.com.au as second domain in Vercel

---

## Future Features Roadmap

### Near-term (next 2–3 sessions)
- **License gate on Create School** — manually issued keys for pilot, Stripe later
- **Freemium paywall** — gate on Join a Class (parent), 2nd child add
- **Stripe integration** — webhook → Vercel serverless → creates license / flips subscription_status
- **School-attached parent discount** — detect school_id on family, show $4.99 price
- **Platinum parent inclusion** — detect platinum tier, bypass Family Pro paywall

### Medium-term
- **School Admin enhancements:** student count enforcement, Stripe billing portal link
- **Custom school branding:** school logo in app header (Platinum feature)
- **Priority support / onboarding flows** (Platinum)
- **Profile photo + reward image uploads:** Supabase Storage, signed URLs, school-admin moderation toggle

### Longer-term
- **Microsoft Teams for Education:**
  - Near-term: Power Automate webhook (no MS verification needed, ~80% of value)
  - Long-term: MS Graph API (EduAssignments.Read, EduRoster.Read) — ~6-12 week build, school-tier premium
- **Wire footer nav Messages tab** — in-app messaging between roles
- **Wire footer nav Tasks tab** — dedicated task list screen
- **Student leaderboards / class XP competitions**
- **Teacher analytics dashboard** — completion rates, at-risk students
- **Data residency:** Supabase EU project for UK customers (GDPR)
- **COPPA compliance** before US launch
- **Annual review call workflow** (Platinum tier relationship management)

---

## Navigation Structure (current)

**Top nav (all roles):** logo | first name | 🔔 bell | ↻ refresh | ☰ hamburger

**Teacher hamburger:** New Assignment, Import Assignment, Archive & Archived, Create New Class, School Admin (admin) / School Name (member) / Set Up or Join (none) / Awaiting Approval (pending), Sign Out

**Parent hamburger:** Add Task for Child, Manage Rewards, Import Assignment, Family Invite Code, Join a Class, Sign Out

**Student hamburger:** Break Any Task (AI), Import Assignment, Join a Class, Change Avatar, Sign Out

**Footer nav:** 🏠 Home | 📋 Tasks | 🏆 Rewards | 💬 Messages (coming soon) | ⚙️ Settings

---

## Database Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| profiles | id, role, full_name, age_group, theme, avatar, school_id, school_role | school_role = null/pending/member/admin |
| schools | id, name, invite_code, invite_code_expires_at, subscription_status, max_students | subscription_status = trial/active/past_due/cancelled |
| families | id, parent_id, invite_code, invite_code_expires_at, family_name | add subscription_status + school_id columns (next session) |
| children | id, profile_id, name, family_id | profile_id links to student's auth profile |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id, direct_student_enrol | |
| class_members | id, class_id, child_id | enrolment join |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order | |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read_at, created_at | |
| waitlist | id, email, created_at | landing page — RLS disabled |
| rewards | id, family_id, created_by, child_id, title, emoji, star_cost, is_active, created_at | |
| redemptions | id, reward_id, child_id, family_id, status, requested_at, responded_at | status = pending/approved/rejected |
| licenses | **NOT YET CREATED** | key, tier (small/medium/large/platinum), max_students, school_id, activated_at, expires_at, stripe_subscription_id |

---

## Conventions & Patterns

- Role is stored in `profiles.role` — always check this
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

---

## Tech Debt

- index.html ~4,800+ lines — style cleanup pass once features stable
- ~300 inline style attributes, duplicated drawer back buttons, violet gradient repeated
- Consider one-off human developer review (bus-factor insurance)

---

## Session Log

> _Most recent at top._

### 13 Jun 2026 (Session 4) — CRM setup, HubSpot, landing page expansion

#### CRM / HubSpot
- Evaluated CRM options for Focably: HubSpot chosen (MCP already connected)
- Created fresh HubSpot free account for Focably (account ID: 443338489, steve@yourfinancedept.com.au)
- Created products: Focably Free ($0) and Focably Pro ($9.99 AUD/mo)
- Created Parent B2C pipeline with stages: Facebook/Insta Lead → Signed Up Free → Active Free User → Upgrade Email Sent → Converted to Pro → Churned
- Default Sales Pipeline repurposed for School B2B tracking
- Sample contacts and deals created and linked
- HubSpot upgrade path confirmed: Starter (A$11/seat) = no sequences; Professional (A$140/seat) = full sequences + workflows — skip Starter, go straight to Pro when selling
- HubSpot Private App token created for API access (stored in landing page JS)

#### Landing Page (focably-Landing repo)
- Replaced simple email-only waitlist forms with rich 3-step modal:
  - Step 1: First name, email, role (Parent/Teacher/School Admin/Student)
  - Step 2: Role-specific fields (children count, school name, ADHD flag, state, enrolment, admin role etc)
  - Step 3: Biggest challenge (free text), plan interest (checkboxes), lead source, phone
- Dual-write on submit: Supabase waitlist table + HubSpot CRM contact via Contacts API
- Supabase waitlist table expanded with 16 new columns (SQL run)
- Added Screenshots section with 5 real app screenshots in phone frames:
  - Sign In, Parent Dashboard, Teacher View, New Assignment, Join a Class
  - Screenshots stored in /screenshots/ folder in focably-Landing repo
- Added About Us / backstory section:
  - Steve's story, Zoe (ADHD), squirrel mascot origin
  - Founder card, 4 stat tiles, squirrel card with bob animation
- Fixed SyntaxError in main app (index.html): escaped backticks \` at line 3458 causing entire script block to fail → app not loading

#### App bug fixed
- Escaped backtick syntax error at line 3458 in index.html — broke entire app load
- Fixed and pushed — app loading correctly again

#### Files changed
- focably-Landing/index.html (major — modal, screenshots, about)
- focably-Landing/screenshots/ (5 new PNG assets)
- focably/index.html (syntax fix)
- focably/CLAUDE_CONTEXT.md

### 13 Jun 2026 (Session 3, part 2) — School Admin, rebrand, pricing model design
- Rebranded app: AchievED → FocablyED throughout
- School Admin dashboard: pending approvals, active teachers, classes, invite code regen
- Teacher approval flow: join → pending → admin approves → member
- Direct student enrolment flag on classes (school-approved teachers only)
- Student hamburger: added Join a Class
- **Pricing model fully designed:**
  - Everyone free; pay to connect roles
  - Family Pro: $9.99/mo standalone, $4.99/mo school-attached
  - School tiers: Small $990 / Medium $1,990 / Large $3,490 / **Platinum $5,990 (enterprise, all parents included)**
  - Platinum: no caps, priority support, custom branding, dedicated onboarding, annual review
  - License key required to create school (manually issued for pilot, Stripe later)
- SQL documented but not yet run (pending constraint + direct_student_enrol)
- Files changed: index.html, CLAUDE_CONTEXT.md

### 13 Jun 2026 (Session 3, part 1) — Archive persistence, footer nav, rewards
- Archive persisted to Supabase
- Footer nav + Settings screen built
- Full rewards loop: parent create → student redeem → parent approve → stars deducted → notifications
- Files changed: index.html, CLAUDE_CONTEXT.md

### 13 Jun 2026 (PM) — Naming, branding, landing page, domains
- FocablyED name, squirrel mascot 🐿️, domains purchased, landing page live at focablyed.com

### 13 Jun 2026 (AM) — School concept, avatars, smart import, business planning
- Schools table, teacher badge, create/join flows, emoji avatars, Claude API import

### 12 Jun 2026 — Auth fix, parent detail, dynamic codes, teacher view polish

### 11 Jun 2026 — Nav, approvals, notifications, archive, parent grouping

---

## How to Use This File

**Session start:** paste this file, state what to build.
**Session end:** ask Claude to update CLAUDE_CONTEXT.md.
