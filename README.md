# Ebrostay — Conversational Property Platform

A radical reinvention of [ebrostay.com](https://ebrostay.com): instead of a listings
catalogue with filters and grids, the entire experience is **a single conversational
input**. You describe what you need in one plain sentence and the system responds —
with matched homes (guest) or a payout estimate (host).

> *What neobanks did to banking, we do to rental.* The interface itself is the
> disruption — one input, no filters, no forms. A command-line / AI-chat aesthetic:
> sharp hairlines, a monospace "system voice", and a single green accent used only
> where the system acts.

Built from the **Claude design handoff** and the **Ebrostay design system**, wired to
the **real Zaragoza inventory and contacts** from the production site.

## Two mirrored apps

| File | App | Flow |
|------|-----|------|
| `index.html` | **Guest** | "Where to in Zaragoza?" → describe a stay → matched homes + map → reserve |
| `host.html`  | **Host**  | "What could your flat earn?" → describe a property → instant payout estimate → start zero-touch hosting |

Both share one header (logo, Guest/Host toggle, ES/EN, light/dark, account), full
bilingual copy, a phone-number identity prototype, and persistent conversation state.

## Stack

Deliberately **dependency-free, no build step** — plain HTML, CSS and vanilla JS, the
way the production `ebrostay.com` site is built and deployed (static hosting / GitHub
Pages). Drop it on any static host; there is nothing to compile.

```
index.html / host.html      entry points (set window.EBR_MODE, boot the app)
css/app.css                 the conversational UI, built on the design tokens
js/app.js                   the engine — one stateful screen, two modes (guest/host)
js/i18n.js                  all ES/EN copy + contact details
js/data.js                  real inventory seed + live Supabase enrichment
js/supabase-config.js       public Supabase URL + anon key (RLS-protected)
assets/tokens/*.css         the Ebrostay design system tokens (verbatim)
assets/photos/*             real property photography
```

## Design-system adherence

The five token files in `assets/tokens/` are copied **verbatim** from the
`ebrostay-design-system` repo — colours, typography (Bricolage Grotesque / Hanken
Grotesque / JetBrains Mono), spacing, fonts and utilities. Every surface, text colour,
border, radius and the full light/dark theme come from those CSS custom properties
(`--brand`, `--surface-card`, `--text-strong`, …). No hard-coded design values leak
into the app stylesheet except the two logo-specific colours (`#1f8a57` arch,
`#9cc4f0` water) that are intentionally fixed in the brand mark.

## Real content & connectors

- **Inventory** — the four real published homes (Pedro II el Católico 1º/2º IZQ and
  Movera 7 first/second floor) are seeded in `js/data.js` with their real bilingual
  copy, prices, amenities and photography. When reachable, `loadLiveHomes()` pulls the
  live published `properties` rows (with photos from Supabase Storage) and replaces the
  seed — so the catalogue stays in sync with production. Offline, the seed stands.
- **Contacts** — real WhatsApp (`+34 678 71 54 18`) and email (`info@ebrostay.com`),
  used in the reserve / start-hosting deep links.
- **Map** — property lat/lng is projected onto the conversation mini-map so price pins
  land in the right place over the Ebro.

## Behaviour

Autofocus, Enter-to-send / Shift+Enter newline, ↑-to-edit, a ~950 ms "thinking" delay,
auto-scroll, `localStorage` persistence of the conversation, draft, theme and language
(theme + language keys shared across both apps), the property detail overlay, the
reserve / start-hosting flows, and the phone-as-identity account popover (3 stages:
phone → code → signed-in, with per-number saved stays / listings).

### Conversational search — DeepSeek

Every search/parse goes through **DeepSeek** (model `deepseek-v4-pro`, the same
model the production property editor uses). The Supabase Edge Function
`conversational-search` turns a visitor's plain sentence into a structured intent
(budget, guests, bedrooms, neighbourhood, parking, owner-intent — or, for hosts,
size/area/renovated/fee-or-timeline question) plus a natural one-line reply in the
user's language. The website then filters the **real published inventory** with that
intent, so results stay grounded in real homes — the model never invents listings or
prices. If DeepSeek is unreachable, the client falls back to a local regex matcher so
the conversation always works. (`js/data.js` → `aiParse()` → the edge function;
`js/app.js` → `guestIntent()` / `hostIntent()` consume it, with a regex fallback.)

**Why each home fits.** Once the real matches are on screen, a second call
(`action: 'explain'` -> `js/data.js` `aiExplain()` -> `js/app.js` `explainMatches()`)
asks DeepSeek for a one-line "why this fits you" per listing and folds it into the
cards as progressive enhancement (the cards never wait on it). The explanation may
only cite facts present in that listing's data, so it stays grounded -- it can't claim
parking or a riverside location a flat doesn't actually have.

**Web-search enrichment (seam in place, not yet wired).** DeepSeek's API has *no*
built-in web search, so live area/commute context needs an external provider (SerpApi
/ Brave / Tavily). The `explain` action already accepts an optional `context` string
that is injected into the prompt as background the model may cite; to turn it on, add a
search-API key as an edge-function secret and populate `context` per query.

### Prototype boundaries — what to make real

The phone identity and saved stays are a **client-side prototype** (`localStorage`,
keyed by phone number). Two contained integrations make them production-real without
changing the UI:

1. **Messaging** — Twilio / WhatsApp Business API to send the real 6-digit code.
2. **Datastore** — the Supabase tables already backing `ebrostay.com` (bookings,
   listings) keyed by phone number, replacing the namespaced `localStorage` records.

The WhatsApp / email deep links need no backend and stay as the lowest-friction channel.

## Local preview

It's static — open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```
