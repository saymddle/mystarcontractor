# Design Audit - My Star Contractor

Audit performed against the `design-taste-frontend` redesign protocol (Section 11.B: audit before touching).

**Status: findings 1 through 22 have been remediated.** See [Remediation](#remediation) at the
end for what changed and what is still outstanding. The findings below are kept as written at
audit time, as the record of what the site looked like before.

## Design read

**Reading this as:** a B2B construction-operations SaaS for project managers and their clients, currently wearing a warm-artisan visual language, and it should be leaning toward a job-site-credible operational language (neutral base, single high-contrast accent, dense-but-calm data surfaces).

**Redesign mode:** Preserve on content and IA, overhaul on the visual layer. The information architecture and copy voice on the marketing page are sound. The design system underneath is not, and the project workspace IA is structurally broken.

### Dial reading of the site as it stands

| Dial | Current | Notes |
|---|---|---|
| `DESIGN_VARIANCE` | 3 | Everything is a 2-col or 3-col symmetric grid of rounded panels. No asymmetry anywhere. |
| `MOTION_INTENSITY` | 1 | The only motion in the codebase is `transform: translateY(-1px)` on button hover. |
| `VISUAL_DENSITY` | 5 | Reasonable for the app; too airy for the marketing page, far too flat for the project workspace. |

Target for a B2B SaaS of this kind would be roughly `6 / 4 / 5`. The gap is mostly in variance and motion.

### Brand tokens as they exist today

Defined in `app/globals.css:1-13`.

| Token | Value | Reading |
|---|---|---|
| `--bg` | `#f3efe7` | warm cream / paper |
| `--surface` | `rgba(255,252,246,0.78)` | translucent off-white |
| `--ink` | `#1d1c19` | espresso near-black |
| `--muted` | `#60594f` | warm grey |
| `--accent` | `#b85527` | clay / rust |
| `--accent-strong` | `#8a3914` | burnt oxblood |
| `--forest` | `#24453c` | deep green, used once |
| `--sand` | `#ddc8a2` | tan, used once |

Type: `Space_Grotesk` (display) + `Literata` (serif), loaded correctly via `next/font` in `app/layout.tsx:5-13`.

---

## What is already right (preserve these)

- **Zero em-dashes** anywhere in the codebase. This is the single most common AI tell and the site is clean.
- **Semantic HTML.** Real `<dl>/<dt>/<dd>` for the snapshot list, `<label>` wrapping every input rather than floating `for` attributes, `aria-label` on both navs, `aria-hidden` on the decorative progress bar.
- **Body and label contrast passes comfortably.** `--muted` on `--bg` is about 6.0:1, the eyebrow accent about 6.9:1, both clear of the 4.5:1 AA threshold.
- **Server Components by default,** with `force-dynamic` only where auth state requires it.
- **Mobile collapse is explicit,** not assumed, at the 920px and 640px breakpoints.
- **Content is not slop.** "Harbor View Renovation", "Electrical rough-in signoff", realistic document counts. No Acme, no John Doe, no fake-precise percentages.
- **Nav is one line at roughly 76px,** inside the 80px cap.

---

## P0 - User-visible defects

### 1. The hero headline overflows the viewport on both public pages

`app/globals.css:126-130` sets `h1 { max-width: 11ch; font-size: clamp(3rem, 7vw, 5.8rem); line-height: 0.94 }`.

The landing headline (`app/page.tsx:35`) is 60 characters. Capped at 11 characters per line it breaks to roughly seven lines, about 610px of headline alone. Adding the eyebrow, sub-paragraph, and CTA row inside `padding: 40px`, the hero column comes to roughly 990px before the topbar. On a typical laptop viewport both CTAs land below the fold.

`/auth` is worse, because its `h1` is interpolated and unbounded (`app/auth/page.tsx:46`): `Join ${invite.organization_name} and access ${invite.project_name}.` A long organization or project name has no ceiling at all.

The rule this breaks is headline maximum two lines, CTA visible without scrolling. The `11ch` cap is the root cause and it is applied globally to every `h1` in the product.

### 2. Internal build language is shipped to end users

Four places show roadmap vocabulary to customers:

- `app/auth/page.tsx:43` - eyebrow reads **"Phase 3 onboarding"** on the sign-up page.
- `app/app/page.tsx:30` - PM dashboard reads **"Phase 1 is now wired for real accounts, protected routes, and project ownership."**
- `app/app/page.tsx:31` - client dashboard reads **"Your portal is now backed by authenticated project membership instead of a demo page."**
- `components/setup-panel.tsx:7` - **"Connect the project to Supabase to unlock Phase 1."**

A contractor signing up is being told which internal sprint shipped their login. The client-facing string additionally advertises that the product used to be a demo page.

### 3. `SetupPanel` renders literal backtick characters

`components/setup-panel.tsx:9-10` puts backticks inside a JSX text node. JSX has no markdown, so the page literally prints `` `NEXT_PUBLIC_SUPABASE_URL` `` with the backticks visible. These should be `<code>` elements.

### 4. The dashboard stat row leaves an orphan card

`app/globals.css:325-328` sets `.stats-row` to `repeat(2, minmax(0, 1fr))`, but `app/app/page.tsx:35-48` renders three `.stat-card` children. Two cards sit on the first row and the third sits alone on a second row stretched to half width. A three-item row needs a three-column grid, or the third stat needs to merge.

### 5. Both hero CTAs lead to the same page

`app/page.tsx:42-47` offers "Sign in or create account" pointing at `/auth`, and "Open app workspace" pointing at `/app`. But `/app` calls `requireUserContext()`, which redirects unauthenticated visitors to `/auth` (`lib/auth.ts:53-61`). And authenticated visitors never see the landing page at all, because `app/page.tsx:24-26` redirects them to `/app` first.

So for every single person who can see this hero, the two buttons are the same button. This is a duplicate-CTA-intent failure with a concrete mechanism, not a stylistic quibble.

---

## P1 - Accessibility

### 6. Placeholder text fails AA contrast

`app/globals.css:388-390` sets placeholders to `rgba(96,89,79,0.7)` over an input background of `rgba(255,255,255,0.7)` on the translucent panel. Composited, that is about `#8f8a83` on about `#fefdfc`, a contrast ratio of roughly **3.4:1** against the 4.5:1 AA requirement.

### 7. No `autoComplete` on any form field

There is not a single `autoComplete` attribute in the codebase. The sign-in and sign-up forms (`components/auth-forms.tsx`) have email, password, and full-name fields with none of `email`, `current-password`, `new-password`, or `name`. This blocks password managers and browser autofill, and it is a WCAG 1.3.5 (Identify Input Purpose, level AA) failure.

### 8. `scroll-behavior: smooth` is not gated on reduced motion

`app/globals.css:19-21` applies smooth scrolling globally. The anchor nav in `components/brand-header.tsx` triggers it. There is no `prefers-reduced-motion` block anywhere in the codebase, so users who have asked the OS for reduced motion still get animated scroll jumps.

### 9. No designed focus state anywhere

There are zero `:focus`, `:focus-visible`, or `outline` declarations in 740 lines of CSS. Nothing sets `outline: none`, so browser default focus rings do still render and this is not a strict WCAG failure. But every custom surface in the product (999px pill buttons, 28px panels, notification cards, whole-card project links) inherits an unstyled default ring that does not track the shape it is drawn around.

### 10. Placeholders are carrying requirement semantics

`components/auth-forms.tsx:84` uses the placeholder "Required for PM sign-up" on the Organization name input. The field is conditionally required but carries no `required` attribute, so the only signal that a PM must fill it is placeholder text that disappears the moment the user types. Line 100 does the same with "Used by PMs to create or clients to join".

### 11. Form errors are not inline

Errors round-trip through the `?error=` query string and render as a whole panel appended after both forms (`components/auth-forms.tsx:112-117`). The user gets a message at the bottom of the page with no association to the field that failed. Error text belongs directly below its input.

---

## P2 - Design system

### 12. The palette is the AI-default warm-artisan family, and it is wrong for the audience

`#f3efe7` cream background, `#b85527` clay accent, `#1d1c19` espresso ink is precisely the beige-plus-brass-plus-espresso palette that this skill bans as a default reach. Beyond being a default, it is mismatched: it reads as artisan cookware or a DTC home-goods brand, not as software that manages permit sets and electrical rough-in signoffs. The audience is contractors and procurement, and the palette is telling them this is a lifestyle product.

Alternatives worth testing: cold industrial (silver-grey, chrome, smoke), forest (deep green, bone, amber), or a near-monochrome base with one saturated safety-accent, which is the visual language the trade already uses.

### 13. The eyebrow is being used as the universal section primitive

**40 eyebrows across the codebase.** The project detail page alone has **18 on one page**. The guidance is a maximum of one per three sections. Every panel in the product opens with the same small uppercase wide-tracked label, which flattens all hierarchy: "Dashboard", "Onboarding", "Recent projects", "Status", "Filters", "Documents" and so on all carry identical visual weight. Most of them can simply be deleted, because a section's position on the page already tells the user what it is.

### 14. There is no radius scale

Six different corner radii are in use with no documented rule: 14px (brand mark), 16px (inputs, sidebar nav, notification cards), 18px (list items, milestones, meta cells), 20px (project cards, chat bubbles, editor cards), 22px (insight cards, mobile panels), 28px (panels, sidebar, setup), plus 999px pills. Pick one scale, or document a rule such as pills for interactive, 16px for containers, and apply it everywhere.

### 15. The project workspace has no navigation

`app/app/projects/[projectId]/page.tsx` is 704 lines rendering **26 stacked panels with zero tabs and zero anchor links.** The README claims the workspace has "Overview, Milestones, Documents, Photos, and Activity sections", but there is no way to move between them other than scrolling past everything. This is the most consequential structural problem in the product: it is the screen a PM lives in all day.

This also violates the section-layout-repetition rule at an extreme: one layout family (rounded panel, eyebrow, h2, content) repeated 26 consecutive times.

### 16. The insight strip is three identical cards

`app/page.tsx:77-83` with `app/globals.css:244-247` is the banned three-equal-feature-cards row. Worth reshaping into an asymmetric split or a two-column arrangement with differing weight.

### 17. The hero "product preview" is a fake dashboard built from divs

`app/page.tsx:51-74` constructs an "Active project snapshot" card out of styled divs: a fake progress bar, a fake milestone, a fake timestamp. This is specifically the most recognizable LLM-design tell. The product has a real project workspace. Use a real screenshot of it, or a generated image, or drop the preview entirely.

### 18. There are no images

The marketing page has zero images. The entire product contains exactly one `<img>` (`app/app/projects/[projectId]/page.tsx:556`), and it is a raw `<img>` rather than `next/image`, with no width or height, so it carries layout-shift risk on the photo grid.

A construction platform with no photography is a strange product to look at. Progress photos are one of the headline features. The marketing page should show them.

### 19. `backdrop-filter` is applied to every large surface with no fallback

`app/globals.css:91-99` puts `backdrop-filter: blur(14px)` on `.hero-copy`, `.hero-card`, and every `.panel`. The background behind them is a near-flat gradient, so the blur buys almost nothing visually while forcing GPU compositing on the largest elements on every page. There is also no `prefers-reduced-transparency` fallback.

### 20. There is no dark mode

No `prefers-color-scheme` query and no dark tokens exist. `.panel--dark` is just a green panel, not a mode. This is a field product; people open it in trucks and site trailers at night.

### 21. Serif is used without an editorial justification

`Literata` carries the insight-card body copy at 1.2rem (`app/globals.css:262-268`) and the snapshot values. The brief is construction operations, not editorial or luxury or publication. It also creates a second type register competing with Space Grotesk. Literata is at least not one of the two specifically banned display serifs, but it has no reason to be here.

### 22. Minor

- `body { min-height: 100vh }` (`app/globals.css:23-25`) should be `100dvh` to avoid the iOS Safari address-bar jump.
- The submit button in `ProjectForm` is a direct child of a two-column `.form-grid` without `field--full`, so it renders at half width in the left column.
- Top nav order is Platform, Roles, Workflow (`components/brand-header.tsx:3-8`), but DOM order is platform, workflow, roles. The anchors jump out of sequence.
- Anchor targets have no `scroll-margin-top`.

---

## SEO baseline

Worth recording before any redesign, because migration is where redesigns usually lose ground. Currently there is **almost nothing to protect**, which lowers the risk considerably:

- `app/layout.tsx:15-19` sets only `title` and `description`.
- No `metadataBase`, no `openGraph`, no Twitter card, no canonical.
- No `robots.txt`, no `sitemap.ts`, no favicon or app icon.
- Routes are `/`, `/auth`, `/app`, `/app/projects`, `/app/projects/[id]`, with `/pm` and `/client` as redirect stubs into `/app`.

Since `/app` and everything under it is authenticated, `/` is effectively the only indexable page. Keep that slug stable and there is no meaningful migration risk.

---

## Recommended path

Per the decision tree, the marketing IA and copy are sound, so this is **targeted evolution on the public pages** and a **structural fix on the workspace**, in this order:

1. **Fix the P0 defects.** They are small, contained, and two of them (build-phase copy, duplicate CTAs) are actively costing credibility with the people evaluating the product.
2. **Re-base the design tokens.** New palette away from the warm-artisan default, one radius scale, drop the serif, add dark-mode tokens. This is one file and it moves the whole product at once.
3. **Fix the `h1` rule.** Remove the global `11ch` cap, plan the hero type scale around the actual headline length.
4. **Give the project workspace navigation.** Tabs or a sticky section rail over the existing 26 panels. Largest usability win in the product.
5. **Bring in real imagery,** starting with the hero, replacing the div-built fake dashboard.
6. **Then, and only then, motion.** Scroll reveals and entry transitions, gated behind `prefers-reduced-motion`.

Steps 1 through 3 are low-risk and touch few files. Step 4 is the one that needs real design thinking about how a PM actually moves through a job.

---

## Remediation

All 22 findings above were addressed. Verified with `tsc --noEmit`, `eslint`, `next build`, and
browser screenshots in both colour schemes at 1440px and 390px.

### Design system

The palette moved from warm cream / clay / espresso to a **cool graphite base with one saturated
signal-orange accent** (`#c2410c` light, `#fb7f3f` dark). The base going cool is what removes the
artisan reading; the accent keeps the brand's existing orange equity, so this is a re-base rather
than a brand reset.

A **radius scale is now documented and enforced** at the top of `globals.css`: 10px controls,
14px cards, 18px panels, 999px pills. The six ad-hoc radii are gone.

**Dark mode now exists**, via `prefers-color-scheme` over semantic tokens. Every colour pair was
measured: the lowest contrast on the landing page is 5.65:1 light and 6.40:1 dark, against a
4.5:1 AA requirement.

`Literata` was dropped. `JetBrains Mono` replaces it for the numeric register (percentages,
counts, file sizes, dates), which is the right register for operations software and gives
tabular figures. `Space Grotesk` stays as the display face.

### Measured outcomes

| | Before | After |
|---|---|---|
| Eyebrows across the codebase | 40 | 5 |
| Eyebrows on the project workspace | 18 | 1 (conditional error label) |
| `autoComplete` attributes | 0 | 10 |
| `prefers-reduced-motion` blocks | 0 | 2 |
| `prefers-color-scheme` support | none | full |
| Designed focus states | 0 | all interactive surfaces |
| `backdrop-filter` on large surfaces | 3 | 0 |
| Em-dashes | 0 | 0 |
| Landing page first-load JS | 5.33 kB | 165 B |

### Notable decisions

**The project workspace was restructured** into seven anchored sections (Overview, Milestones,
Files, Activity, Updates, Messages, Access) behind a sticky rail. Worth recording: a
`position: sticky` element that is a *grid item* only sticks within its own row, so the workspace
uses block flow. Verified by scrolling 1400px and asserting the rail sits at y=0.

**Motion is deliberately transform-only.** The section reveal uses native
`animation-timeline: view()`, so there is no JS, no scroll listener, and no bundle cost on a
product that has no animation dependency. It does not animate opacity: a browser that supports
the timeline but never advances it would otherwise render a section invisible, which on the only
indexable page of the site is a much worse outcome than a 14px offset.

**Form errors are announced but not yet inline.** The error panel moved above the forms and
gained `role="alert"`, so it is announced and seen. True per-field inline errors need
`signInAction` / `signUpAction` to return field-level state instead of redirecting with
`?error=`, which changes their signatures. That is the one finding (#11) only partly closed.

### Outstanding

- **Photography.** The environment's network policy blocks all external image hosts, so remote
  placeholders could not be verified and were not shipped. The two marketing slots hold their
  exact final dimensions, so dropping real photos in causes no layout shift:
  - Hero, 4:3 landscape, wide shot of an active job site
  - Platform section, portrait, project manager on site

  Real job photography will beat stock here, and the product already collects it.
- **Inline field-level form errors**, per finding #11 above.
- **Favicon and OG image.** `metadataBase`, Open Graph, Twitter card, and robots directives are
  now set in `app/layout.tsx`, but there is still no icon or share image asset.
