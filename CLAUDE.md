# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An AI primary-care doctor for low-income Colombians. A patient has a consultation
with the AI doctor through a chat interface in Spanish. Every consultation is then
reviewed and certified by a real, licensed doctor before any medical guidance or
prescription is finalized. If the patient needs medication, it is sent to them.

The product exists to solve a primary-care access problem: many low-income
Colombians cannot easily see a doctor. The AI handles the consultation; the human
doctor guarantees safety and trust.

**Business model:** $5–10 per certified consultation, plus margin on medication
delivered to patients who need it.

## Core flow

1. **Patient consult** — Patient chats with the AI doctor in Spanish. The AI runs a
   structured primary-care intake: chief complaint → relevant history → red-flag
   screening → preliminary assessment → recommendation.
2. **Doctor certification** — The completed consultation enters a queue. A licensed
   doctor reviews it from a dashboard, edits or approves the assessment, and
   certifies it.
3. **Patient receives result** — The certified assessment (and medication, if
   needed) is delivered to the patient.

The demo/MVP should make this full loop legible: a patient consult and a doctor
review/certification view, at minimum.

## Non-negotiable medical behavior

These define whether real doctors will trust the product. Treat them as hard rules,
not nice-to-haves:

- **Structured intake.** Don't free-associate. Follow chief complaint → history →
  red-flag screening → assessment → recommendation.
- **Escalate emergencies.** On any red-flag symptom (chest pain, stroke signs,
  difficulty breathing, suicidal ideation, severe bleeding, etc.), the AI must stop
  the routine intake and direct the patient to emergency care immediately.
- **Never present AI output as final medical advice.** All guidance is preliminary
  until a human doctor certifies it. The UI must reflect this.
- **Stay within primary care.** Don't attempt to diagnose or manage complex/specialist
  conditions; flag them for the reviewing doctor.

## Patient data

Consultations contain real personal health data. From the start:

- Treat health data as sensitive — no leaking it into logs, URLs, or client-side
  storage that shouldn't hold it.
- Colombian data-protection law (Ley 1581 / Habeas Data) applies. Build with consent
  and data minimization in mind even at pilot stage.

## Tech stack

- **React + Vite** — frontend
- **React Router** — client-side routing
- **Supabase** — database and authentication
- **GitHub OAuth** — login (already configured in Supabase)
- **Tailwind CSS** — styling
- **Supabase CLI** (linked to the project) — running database migrations

(The Claude API integration for the medical consultation will be added as the project
grows. The consultation calls the Anthropic API.)

## Language & audience

- **UI and all patient-facing copy: Spanish.**
- Users are low-income Colombians, often on low-end phones and mobile data.
  Mobile-first is mandatory, and the app must stay light and fast on slow networks.

## Key rules — always follow

### Security & data (non-negotiable for a health product)

- **Row Level Security on every table.** Every database table must have RLS enabled.
  No exceptions.
- **Guard every protected page.** Each protected page must check for an active
  Supabase session before rendering.
- **Never leak data across users.** One user must never be able to see another user's
  data. This is both a security rule and a medical-privacy obligation.
- **Secrets in environment variables.** Never hardcode keys, tokens, or secrets — use
  environment variables for all of them.
- **All DB changes are SQL migrations.** Write every database change as a SQL
  migration file in `supabase/migrations/` (create one with
  `npx supabase migration new <name>`), then apply it to the linked remote database
  with `npx supabase db push`. Never paste SQL into the Supabase dashboard manually.

### Build discipline

- **Keep it simple and fast.** No unnecessary dependencies. The simplest thing that
  works wins, every time.
- **Semantic HTML** for accessibility.
- **Fully responsive and mobile-first.** Design for a small screen on a slow
  connection first; the desktop case is secondary.
- **Don't over-engineer.** Build the simplest testable version of any feature before
  adding sophistication. If a feature isn't needed to make the core flow work, don't
  build it yet.

## Working style (for Claude)

- Be blunt and honest. Call out bad ideas and over-engineering immediately.
- The founder is non-technical: explain technical tradeoffs in plain language.
- Before executing any non-trivial task, ask clarifying questions and agree on the
  approach first, then build.
