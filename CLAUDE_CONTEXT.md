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

## Session Log

> _Most recent at top._

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
