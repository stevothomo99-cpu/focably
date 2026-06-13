# Focably (AchievED) — Claude Session Context

> **Instructions:** Paste this file (or relevant sections) at the start of each Claude session.
> Update the "Current Status" and "Session Log" sections after each session.

---

## Project Overview

**App:** Focably (branded "AchievED" in-app) — gamified school task and accountability tool for parents, students, and teachers. ADHD-friendly design is a core value proposition.
**Live URL:** https://focably.vercel.app
**Stack:** Single-file vanilla HTML/CSS/JS app, Supabase backend, deployed on Vercel
**Supabase project:** mxgnrgajspprupzxaeld.supabase.co
**GitHub repo:** stevothomo99-cpu/focably

> **IMPORTANT:** The live app is **`index.html`** (the "AchievED" build with real Supabase auth).
> `focably.html` is an OLD prototype — **IGNORE IT.** All work goes into `index.html`.

---

## Architecture Summary

- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres with RLS enabled
- **Frontend:** ONE file — `index.html` (~4,100+ lines). Vanilla JS, no framework, no build step.
- **User roles:** Student (primary + high-school modes), Parent, Teacher
- **Deploy:** push to GitHub `main` → Vercel auto-deploys

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

### 13 Jun 2026 — School concept, emoji avatars, smart import, business planning
- FIXED: HS student unlinked state race condition — `loadStudentApp` no longer pre-shows hs-mode; `loadStudentAssignments` controls visibility. HS students now see greeting + avatar even before linking to family.
- Added `navUserName` span to top nav — shows first name for all 3 roles, cleared on sign out.
- **School concept added:**
  - SQL: `CREATE TABLE schools`, `ALTER TABLE profiles ADD COLUMN school_id/school_role`, `ALTER TABLE classes ADD COLUMN school_id`
  - `currentSchool` state variable loaded at teacher login
  - Teacher header badge: "🏫 School Name" or "👤 Individual Teacher"
  - Teacher drawer: "Set Up / Join a School" → Create School (generates 30-day invite code, sets school_role=admin) or Join School (validates code, sets school_role=member)
  - New classes auto-inherit `school_id` from creating teacher
- **Emoji avatar picker:**
  - SQL: `ALTER TABLE profiles ADD COLUMN avatar text DEFAULT '🎓'`
  - Onboarding: after age selection, avatar grid appears (20 emoji, age-appropriate set)
  - HS header: large avatar above greeting; primary: avatar as heroEmoji
  - "🎭 Change Avatar" in student drawer — live preview, saves to Supabase instantly
- **Smart Import Assignment (all 3 roles):**
  - "📥 Import Assignment" added to all three hamburger menus
  - Paste any freeform text → Claude API extracts title, subject, due date, description
  - Confirmation card with editable fields before saving
  - Teacher: saves to selected class; Parent/Student: saves as private task + AI step generation
  - Screen resets cleanly on each open
- Business planning discussion: pricing model, AU/international market sizing (~70K+ addressable schools across AU/NZ/UK/CA/US), go-to-market strategy, roadmap items noted in memory
- Files changed: index.html, CLAUDE_CONTEXT.md

### 12 Jun 2026 — Auth fix, parent detail, dynamic codes, teacher view polish
- FIXED: "Sign up for free" did nothing — missing authForgotPassword form block crashing showSignUp/showSignIn. Added form + made toggles null-safe.
- Parent: tap assignment row → Assignment Detail screen (steps, status, proof links, instructions)
- Dynamic invite codes (family + class): 48h expiry, unambiguous charset, generate on demand
- Teacher assignments: By Assignment / By Student toggle → DROPDOWN
- Teacher By-Student: rows expand to show assignments + nudge button
- Files changed: index.html only

### 11 Jun 2026 (AM, part 2) — Parent grouping + private/tagged tasks
- Parent Subject Progress groups assignments under collapsible class headings
- Parent Add Task: Private vs Tag to Class visibility toggle
- SQL: `ALTER TABLE assignments ADD COLUMN parent_created boolean DEFAULT false`
- Teacher view: parent-tagged tasks show badge + 🔒 (read-only, no archive)
- FIXED: "+ Add" child tab did nothing → now opens Family Invite screen
- Files changed: index.html only

### 11 Jun 2026 (AM, part 1) — Nav restructure, approvals, notifications, archive
- Unified duplicate proof/step approval queues into ONE shared card
- Added 🔔 notification bell in top nav (dropdown, red-dot badge, 60s polling)
- Built hamburger drawer nav; moved secondary actions off main screens (all 3 roles)
- FIXED: login crash from stale rbParent/rbTeacher/rbStudent references
- FIXED: assignment archive button (malformed onclick) → data-attrs + confirm dialog
- FIXED: approve didn't update student — made task update authoritative
- Files changed: index.html only

---

## How to Use This File

**At session start — paste this prompt:**
> "Here's my project context. [paste relevant sections]. Today I want to [specific task]."

**Keep sessions focused:** one feature or bug per session where possible.

**At session end — ask Claude:**
> "Update my CLAUDE_CONTEXT.md."
