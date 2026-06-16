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
- **GitHub push method:** Always use Python urllib.request (NOT curl) for large file pushes — curl fails on large files.
- **Token splitting:** Required to avoid GitHub secret scanning blocking HubSpot pat- tokens.

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

### SQL needed before testing photo avatar
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_photo text;
```

### Known Bugs / Issues
- (none currently open)

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
| families | id, parent_id, invite_code, invite_code_expires_at, family_name, subscription_status, school_id, stripe_customer_id, stripe_subscription_id | subscription_status = free/pro/school_attached |
| children | id, profile_id, name, family_id | |
| classes | id, teacher_id, name, subject, year_group, invite_code, invite_code_expires_at, status, school_id, direct_student_enrol | |
| class_members | id, class_id, child_id | |
| assignments | id, class_id, created_by, child_id, title, due_date, description, status, parent_created | |
| tasks | id, assignment_id, child_id, title, completed, verification_required, verification_status, proof_url, proof_submitted_at, verified_by, verified_at, star_value, xp_value, sort_order | |
| notifications | id, recipient_id, sender_id, child_id, type, title, body, read_at, created_at | |
| waitlist | id, email, created_at | landing page — RLS disabled |
| rewards | id, family_id, created_by, child_id, title, emoji, star_cost, is_active, created_at | |
| redemptions | id, reward_id, child_id, family_id, status, requested_at, responded_at | |
| licenses | id, key, tier, max_students, school_id, activated_at, expires_at, stripe_subscription_id, created_at | NOT YET CREATED — run SQL in Session 4 |

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

---

## Tech Debt

- index.html ~4,800+ lines — style cleanup pass once features stable
- ~300 inline style attributes, duplicated patterns
- Consider one-off human developer review (bus-factor insurance)
- Long term: migrate domains from Crazy Domains to Cloudflare Registrar

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
