# Focably (FocablyED) — Claude Session Context

> **Instructions:** Paste this file (or relevant sections) at the start of each Claude session.
> Update the "Current Status" and "Session Log" sections after each session.

---

## Project Overview

**App:** FocablyED (previously branded "AchievED" in-app) — gamified school task and accountability tool for parents, students, and teachers. ADHD-friendly design is a core value proposition.
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
- **Frontend:** ONE file — `index.html` (~4,100+ lines). Vanilla JS, no framework, no build step.
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
- **Sections:** Hero + waitlist CTA → Three-way value prop (student/parent/teacher cards) → Problem strip (ADHD/time blindness) → How it works (4 steps) → Bottom waitlist CTA → Footer
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
- Teacher view toggle is a DROPDOWN (fits narrow screens); by-student rows expand
- Unified approval queue (teacher + parent share one queue; approve/reject cross-clears both)
- Notifications: in-app bell (top nav) + Supabase notifications table, polls every 60s
- Archive: assignment archive + class archive + restore
- Hamburger drawer nav for secondary actions (all 3 roles)
- Date-based assignment status colours (red ≤7d / amber ≤14d / green 15d+ / grey complete)
- Parent Subject Progress: assignments grouped under collapsible class headings
- Parent: tap an assignment → full Assignment Detail screen
- Parent Add Task: Private vs Tag to enrolled class
- Dynamic invite codes (family + class): 48h expiry, no ambiguous chars
- Top nav shows user's first name (all roles)
- **School concept:** `schools` table, `school_id` + `school_role` on profiles, `school_id` on classes
  - Teacher header shows school badge ("🏫 School Name" or "👤 Individual Teacher")
  - Teacher drawer: Create a School / Join a School flows
  - New classes auto-inherit teacher's `school_id`
- **Emoji avatars:** picker on onboarding (20 emoji, age-appropriate sets), stored in `profiles.avatar`
  - HS header shows avatar large above greeting; primary uses avatar as heroEmoji
  - "🎭 Change Avatar" in student drawer
- **Smart Import Assignment:** paste any text (Teams, email, Google Classroom etc.)
  - Claude API extracts title, subject, due date, description
  - Confirmation card with editable fields before saving
  - Available in all 3 role hamburger menus
  - Teacher saves to class; parent/student saves as private task + AI generates steps
- HS student unlinked state: shows greeting header + avatar, then Link to Family card below (no race condition)

### In Progress / Needs Testing
- Full end-to-end test with real Supabase data across all 3 roles
- Archive state currently held in JS arrays — needs to be driven from Supabase for persistence
- Test dynamic invite codes end-to-end
- Test school create/join flows end-to-end
- Test emoji avatar picker on fresh onboarding

### Known Bugs / Issues
- (none currently open)

### Next Priorities
- End-to-end test all new features (school, avatar, import)
- Persist archive via Supabase
- Freemium/Pro paywall (Stripe) — see Business Model below
- School Admin dashboard screen
- Update app in-app branding from AchievED → FocablyED
- Fix landing page nav/body copy "Focably" → "FocablyED" remaining instances
- Add focablyed.com.au as second domain in Vercel

---

## Business Model & Roadmap

### Pricing (planned)
- **Freemium individual:** free, 1 child, basic features — top of funnel
- **Family Pro:** ~$9.99/month or $79/year AUD — unlimited children, full features
- **School subscription (flat annual):**
  - Small (under 300 students): $990/year
  - Medium (300–800): $1,990/year
  - Large (800+): $3,490/year
- Key threshold: keep school pricing under ~$2,000 so head of department can approve without board sign-off

### Market sizing
- Australia: ~4,500 addressable schools (secondary + upper primary)
- NZ: ~1,200 (launch with AU, negligible extra effort)
- UK: ~8,000 (second market — target SENCOs)
- Canada: ~6,000
- USA: ~50,000 (last — COPPA, district procurement complexity)
- Total addressable across all markets: ~70,000+ schools

### Go-to-market
- Parent-led discovery → Family Pro → parent brings app to school → school subscription
- ADHD/learning support angle: target SENCOs in UK, learning support coordinators in AU
- NDIS/wellbeing budgets in AU schools can fund outside normal IT procurement

### Future features (roadmap)
- **Profile photo uploads** (post-emoji): Supabase Storage, upload/resize/compress, signed URLs, school-admin toggle for moderation. Pro/school-approved feature only.
- **Microsoft Teams for Education integration:**
  - Near-term: Power Automate webhook (school IT admin configures, no MS verification needed, ~80% of value)
  - Long-term: Full MS Graph API (EduAssignments.Read, EduRoster.Read via Azure AD app registration) — requires MS app verification + school IT admin consent, ~6-12 week build, school-tier premium
- **School Admin dashboard:** view all teachers/classes, manage invite codes, link to Stripe billing portal
- **Stripe billing:** webhook → Vercel serverless function → updates `subscription_status` in Supabase
- **Data residency:** Supabase EU project for UK customers (GDPR)
- **COPPA compliance** before US launch
- **Wire up footer nav** (currently placeholders)

---

## Navigation Structure (current)

**Top nav (all roles):** logo | first name | 🔔 bell | ↻ refresh | ☰ hamburger

**Teacher main screen:** Class selector → Assignments → Step Approvals
**Teacher hamburger:** New Assignment, Import Assignment, Archive & Archived, Create New Class, Set Up/Join School, Sign Out

**Parent main screen:** child stats → Subject Progress → Step Approvals
**Parent hamburger:** Add Task for Child, Import Assignment, Family Invite Code, Join a Class, Sign Out

**Student main screen:** quest/XP header → Trust Score → class tiles → Treasure Chest
**Student hamburger:** Break Any Task (AI), Import Assignment, Change Avatar, Sign Out

**Footer nav:** Home / Tasks / Rewards / Messages / Settings (placeholders, not wired yet)

---

## Database Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| profiles | id, role, full_name, age_group, theme, avatar, school_id, school_role | role = student/parent/teacher; school_role = null/admin/member |
| schools | id, name, invite_code, invite_code_expires_at, subscription_status | subscription_status = trial/active/past_due/cancelled |
| families | id, parent_id, invite_code, invite_code_expires_at, family_name | 48h dynamic codes |
| children | id, profile_id, name, family_id | profile_id links to student's auth profile |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id | status = active/archived |
| class_members | id, class_id, child_id | enrolment join |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | class_id null = private/home task |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order | |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read_at, created_at | |
| waitlist | id, email, created_at | landing page waitlist signups — RLS disabled |

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
- Import flow uses Claude API (`claude-sonnet-4-20250514`) to extract assignment details from freeform text

---

## Tech Debt / Future

### Style cleanup pass (do once features are stable)
- index.html is ~4,100+ lines. ~300 inline `style="..."` attributes.
- Duplication to collapse: drawer back buttons (×6+), circular top-nav buttons (×3), violet gradient (×6+)
- NOT urgent. App works as-is.

### Other
- Persist archive in Supabase (currently JS arrays, lost on reload)
- Wire up footer nav items
- Consider a one-off human developer review (bus-factor insurance)

---

## Session Log

> _Brief entry after each session. Most recent at top._

### 13 Jun 2026 (PM) — Naming, branding, landing page, domain setup
- Long naming session exploring 20+ names — SquirrelED, LoopedInED, HiveMindED, TelosED, SwarmED, FlockED, NexusED, ClaritED etc. — all blocked by trademark or existing products
- Settled on **FocablyED** — made-up word, completely clear, Focus + Ability + ED
- Mascot: squirrel 🐿️ named by Zoe (Steve's daughter, 15, ADHD) — inspired by Doug from UP
- Domains purchased via Crazy Domains: focablyed.com, focablyed.com.au, focablyed.app
- focably.com was domain front-run by Namecheap — do not use Namecheap again
- Also accidentally purchased facably.com/app/ed variants (typo) — keep as redirects
- Built landing page (single HTML file): warm amber/cream palette, Fraunces + Inter fonts
- Deployed to Vercel via GitHub repo stevothomo99-cpu/focably-Landing
- DNS: Crazy Domains nameservers → ns1.vercel-dns.com + ns2.vercel-dns.com
- Waitlist form wired to Supabase `waitlist` table — RLS disabled, public inserts
- Landing page live at focablyed.com ✅
- Files changed: CLAUDE_CONTEXT.md; new repo focably-Landing created

### 13 Jun 2026 (AM) — School concept, emoji avatars, smart import, business planning
- FIXED: HS student unlinked state race condition
- Added `navUserName` span to top nav
- School concept: schools table, school_id/school_role on profiles, school badge in teacher header, Create/Join school flows
- Emoji avatar picker on onboarding, Change Avatar in drawer
- Smart Import Assignment: paste freeform text → Claude API extracts details → confirmation card
- Business planning: pricing model, AU/international market sizing (~70K+ addressable schools)
- Files changed: index.html, CLAUDE_CONTEXT.md

### 12 Jun 2026 — Auth fix, parent detail, dynamic codes, teacher view polish
- FIXED: "Sign up for free" did nothing — missing authForgotPassword form block
- Parent: tap assignment → Assignment Detail screen
- Dynamic invite codes (family + class): 48h expiry
- Teacher assignments: By Assignment / By Student toggle → DROPDOWN
- Files changed: index.html only

### 11 Jun 2026 (AM, part 2) — Parent grouping + private/tagged tasks
- Parent Subject Progress groups assignments under collapsible class headings
- Parent Add Task: Private vs Tag to Class visibility toggle
- SQL: ALTER TABLE assignments ADD COLUMN parent_created boolean DEFAULT false
- Files changed: index.html only

### 11 Jun 2026 (AM, part 1) — Nav restructure, approvals, notifications, archive
- Unified duplicate proof/step approval queues into ONE shared card
- Added 🔔 notification bell in top nav
- Built hamburger drawer nav
- Multiple bug fixes
- Files changed: index.html only

---

## How to Use This File

**At session start — paste this prompt:**
> "Here's my project context. [paste relevant sections]. Today I want to [specific task]."

**Keep sessions focused:** one feature or bug per session where possible.

**At session end — ask Claude:**
> "Update my CLAUDE_CONTEXT.md."
