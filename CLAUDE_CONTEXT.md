# Focably — Claude Session Context

> **Instructions:** Paste this file (or relevant sections) at the start of each Claude session.
> Update the "Current Status" and "Session Log" sections after each session.

---

## Project Overview

**App:** Focably — gamified school task and accountability tool for parents, students, and teachers.
**Live URL:** https://focably.vercel.app
**Stack:** React (Vercel), Supabase backend
**Supabase project:** mxgnrgajspprupzxaeld.supabase.co
**GitHub repo:** stevothomo99-cpu/focably

---

## Architecture Summary

- **Auth:** Supabase Auth (email/password)
- **Database:** Supabase Postgres with RLS enabled
- **Frontend:** React, deployed on Vercel
- **User roles:** Student, Parent, Teacher

---

## Current Status

> _Update this section at the end of every session._

### Working
- Student sign-up
- Family linking (student ↔ parent)

### In Progress / Needs Testing
- Parent flow (full end-to-end not yet tested)
- Teacher flow (full end-to-end not yet tested)

### Known Bugs / Issues
- _(list any active bugs here)_

### Next Priorities
- _(list what you're tackling next)_

---

## File Structure

> _Update as the project grows. Only include files Claude needs to know about._

```
/
├── src/
│   ├── components/
│   ├── pages/
│   ├── lib/
│   │   └── supabaseClient.js
│   └── App.jsx
├── supabase/
│   └── migrations/
├── CLAUDE_CONTEXT.md
└── package.json
```

---

## Database Tables

> _Add tables and key columns as they're built._

| Table | Key Columns | Notes |
|-------|-------------|-------|
| profiles | id, role, full_name | Linked to auth.users |
| families | id, parent_id | |
| family_members | family_id, student_id | Join table |
| tasks | id, student_id, title, due_date, status | |

---

## RLS Policies Summary

> _Track RLS rules here to avoid re-explaining to Claude each session._

- `profiles`: Users can read/update their own row
- `tasks`: Students see own tasks; parents see linked students' tasks
- _(add others as built)_

---

## Conventions & Patterns

- Auth check pattern: `supabase.auth.getUser()` at page load
- Role is stored in `profiles.role` — always check this, not metadata
- Family linking done via `family_members` join table
- _(add naming conventions, component patterns etc. as established)_

---

## Session Log

> _Brief entry after each session. Most recent at top._

### [DATE] — Session summary
- What was built/fixed:
- Files changed:
- What's next:

---

## How to Use This File

**At session start — paste this prompt:**
> "Here's my project context. [paste relevant sections]. Today I want to [specific task]."

**Keep sessions focused:**
> One feature or bug per session where possible.

**At session end — ask Claude:**
> "Summarise what we changed today and what's next, formatted for my CLAUDE_CONTEXT.md session log."
