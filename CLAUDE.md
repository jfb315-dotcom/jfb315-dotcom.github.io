# CLAUDE.md

Working notes for this repository. Read all of it before changing anything.

## What this is

John Bischof's personal work site (loan officer, Home Mortgage Solutions, LLC), live at
https://jfb315-dotcom.github.io/. It is a static GitHub Pages site: three hand-written HTML
pages, one shared script, and a Python job that refreshes market data. There is no framework,
no bundler, no package.json and no server. Each page holds its own CSS and JavaScript inline.

John is not a programmer. He describes what he wants in plain words (often dictated, with
typos), looks at the live site, and replies with screenshots. Write to him in plain English:
what changed, where to click, what he will see. No code, file names or git terms unless he asks.

## Map

| Path | What it is |
|---|---|
| `index.html` | Market dashboard. Reads `data/market.json`. Charts, alert level, quick links, "My tools" tiles, color scheme picker. |
| `checklist.html` | Document request email builder (borrower type, loan type, checked items, tips, upload button). |
| `clients.html` | Client tracker, the biggest and most-changed file. Client list, client page, milestones, conditions, notes, emails, CD (TRID) dates, print sheet, backup. |
| `brand.js` | Logo bar and Dashboard / Clients / Document request buttons, injected at the top of every page. Loaded as `brand.js?v=5`. |
| `data/market.json` | Written only by the workflow. Never edit by hand. |
| `scripts/fetch_fred.py` | Pulls FRED series and release dates (standard library only). Holds the Fed meeting date list. |
| `.github/workflows/update-data.yml` | Runs the fetch on a weekday schedule and on every push to `main`, then publishes. |
| `img/logos/*.webp` | 16 company logos, 480px wide, listed in `brand.js` with `bg` and optional `holiday`. |
| `img/tracker3/t-{stage}-{ap}-{dc}-{cs}.png` | 162 progress-bar pictures used in emails (9 stages x 3 x 3 x 2). `img/tracker`, `img/tracker2` are old sets kept so emails already sent still show a picture. |
| `upload-button-v2.png` | Upload button picture for emails. `upload-button.png` is the old one, kept for sent emails. |
| `docs/PLAN-shared-clients.md` | Plans on hold: Firebase shared tracker with other loan officers, Google address autocomplete. Not started. |

## Run, test, publish

There is nothing to build. Serve the folder and open the pages:

```bash
python3 -m http.server 8765
```

Test with headless Chromium (Playwright is pre-installed; do not install it). Use
`http://localhost:8765/...`, not `file://`, because `localStorage` is unreliable on `file://`.
Write throwaway test scripts in the scratchpad, never in the repo. A test seeds
`localStorage["clients-v1"]` in `addInitScript`, drives the page, prints results, and collects
`pageerror` events. Always check three widths, because the layout is chosen by width:

- 1440 (computer, "wide", 1200px and up), 1000 ("mid"), iPhone 13 ("phone", 640px and down).
- At each: `document.documentElement.scrollWidth > innerWidth` must be false, and no page errors.

Check the data script compiles (it needs `FRED_API_KEY`, which only exists in GitHub, so do not run it):

```bash
python3 -m py_compile scripts/fetch_fred.py
```

Publishing: work on the session's branch, open a pull request to `main`, squash-merge it. The
merge triggers "Update data and publish"; wait for that run to finish with `success` before
telling John it is live. After a squash merge, sync the branch with
`git fetch origin main && git merge -X ours origin/main` and push. Force push is refused.
The site itself cannot be fetched from the sandbox, so "live" means the workflow succeeded.

If a new top-level file must be served, add it to the `cp` line in the workflow's
"Collect site files" step, or it will not be published.

## Data and privacy rules (not negotiable)

- Client information lives only in the browser: `localStorage["clients-v1"]`. It must never
  reach the repo, a commit message, a test fixture with real names, or any outside service.
  Tests use made-up people. Never ask John to send a real backup file.
- No third-party scripts, analytics, or APIs in the pages. Google Fonts is the only outside
  request. Anything that would send borrower data out (Firebase, Google Places, Microsoft 365)
  waits for John's compliance check; see `docs/PLAN-shared-clients.md`.
- The FRED key exists only as the `FRED_API_KEY` secret. Never print it or a URL containing it.
- Emails carry no logo and no client data in image URLs. John's Outlook signature has his logo.

Storage keys in use (keep the names; old data must keep loading):
`clients-v1`, `clients-backup`, `req-me`, `req-ulink`, `req-style`, `ms-list`, `theme`,
`alertBps`, `builtinAdded`, `sectionOrder` (localStorage); `req-sel`, `req-tips`, `req-why`,
`req-yrs`, `req-client` (sessionStorage). Wrap every read and write in `try/catch`.

## Coding rules

- Plain ES2020 in one IIFE per page. No modules, no libraries, no build step. Match the
  existing dense style: `const $=id=>document.getElementById(id)`, template-string rendering,
  short helper names. Do not reformat lines you are not changing.
- Rendering is "rebuild the HTML string, then re-attach". `renderClient(c)` builds every
  section, `arrange(c)` moves the `[data-sec]` blocks into the wide, mid or phone layout, then
  listeners by id are attached. Add a section by giving it a `data-sec` name and placing it in
  all three branches of `arrange`.
- Clicks go through one delegated listener keyed by `data-act` (plus `data-open`, `data-tab`,
  `data-sort`, `data-status`...). Changes go through one delegated `change` listener keyed by
  `data-*`. Add a case there; do not sprinkle `onclick` attributes.
- Every value from a client record goes through `esc()` before entering HTML.
- A new client field needs: the form input, both field-name arrays (`openForm` and the dialog
  `close` handler), display, and usually the print sheet. Old records lack the field, so read
  it as `c.field||""`. Never rename or remove a field without migrating saved data.
- After changing a record: `touch(c); save(); renderClient(c);`. State that should survive a
  re-render but not be saved (open/closed panels, sort order) lives in module-level objects
  keyed by client id (`condOpen`, `msOpen`, `clearedOpen`, `earlyOpen`).
- Milestones are defined once: `MS` (keys), `MAIN` (the 8-step chain with sub-steps) and `PATH`
  (order for "Next"). The email progress picture is chosen from the stage and sub-step state,
  so changing steps or their names means regenerating all `img/tracker3` pictures (drawn by a
  one-off Playwright script, not kept in the repo). Do not change the chain casually.
- Statuses are `active`, `prospect`, `inactive`. Records with no status count as active.
- Phone inputs are `type="tel"` and format themselves to `555-201-4400` (`fmtPhone`).
- Realtor, title company, closer and lender suggestions come from `contactBook()`, built from
  saved clients. Do not create a second store for them.
- TRID dates (`holidays`, `isBiz`, `bizShift`, `cdInfo`): a business day is every day except
  Sundays and federal holidays (Saturdays count). Receive-by = closing minus 3 business days;
  send-by = receive-by minus 3; presumed receipt = sent plus 3; earliest closing = receipt
  plus 3. Check any change against a hand count that crosses a holiday. The page always says
  to confirm with the LOS or compliance; keep that sentence.
- When `brand.js` changes, bump `?v=` in all three pages, or browsers keep the old copy.
- Comments say why, in one line, in plain words. Commit messages: a short imperative subject,
  then bullets describing what the user will see.

## Email HTML rules (Outlook is the target)

John pastes emails into classic Outlook, which strips most CSS. Email markup must use:

- Tables for all layout and for bullets (a narrow cell with the bullet, a cell with the text).
- Inline styles plus `<font>` tags for color and size (the `fc()` helper); Calibri 11pt body.
- Spacer rows (`sp(n)`) instead of margins; underlines as a table-cell `border-bottom`.
- Pictures hosted on the site with explicit `width` and `height`; buttons are pictures in a link.
- A plain-text version built alongside the HTML; copying writes both (`ClipboardItem` with
  `text/html` and `text/plain`). Change the two together, every time.
- Email colors are fixed hex values (blue `#1F4E79`, green `#2C5234`, gold `#A97A1E`), not the
  page's CSS variables, because the email leaves the page.

## Design rules

- Font: Public Sans (400 to 800), system fallbacks. Headings 800 weight with slight negative
  letter-spacing; small labels are .7 to .75rem, 700 to 800 weight, uppercase, letter-spaced.
- Color only through tokens: `--paper` (page), `--panel` (cards), `--ink`, `--muted`, `--rule`
  (borders), `--good`/`--goodtxt`/`--goodbg`, `--bad`, `--brass` (attention, "next"),
  `--tipbg`. Tokens are redefined for dark mode and for the palettes (classic, forest,
  burgundy, harbor, night) chosen on the dashboard and stored in `theme`. A hard-coded color
  on a page will break in dark mode; a new token must be added to every palette block.
- Shape: square corners on panels, inputs and buttons; 1px `--rule` borders; a 5px left border
  marks status (green done, brass attention, red late). Round only pills, dots and the brand bar.
- Spacing: panels pad 16px, gaps are 14 to 16px between panels and 8 to 12px inside. Page
  gutter 16px. Content width 980px, 1560px on wide screens.
- Components to reuse, not reinvent: `.panel`, `.tbtn` (`.primary`, `.danger`, `.gold`),
  `.field` (label above input), `.fgrid` (auto-fit form grid), `.seg` and `.tabs` (segmented
  buttons with `aria-pressed`), `.cbanner`, `.cdtag`, `.ctcbadge`, `.mini` (dot progress bar),
  `.glance` (top info strip), `details` with a small uppercase `summary` for folded content,
  `.toast` via `say("...")`.
- Tap targets at least 44px tall on phones. Folded-away things must stay reachable in one tap.
- Wording on the page is plain and short, sentence case, no jargon John did not use himself.
  Use his terms: "Clear to close", "conditions", "CD", "prospect", "addendums".
- Print sheet (`#printSheet`) must stay one Letter page; it measures itself and zooms down.

## Mistakes to avoid

1. **Adding a framework, npm, or a build step.** The site is three files on purpose. Don't.
2. **Testing on `file://`** and concluding the page is blank. Serve it over localhost.
3. **Testing one width.** A change that works at 1440 can hide a section on the phone
   (`arrange` puts different things in different places). Run all three.
4. **Putting real or realistic client data in the repo, tests, PR text or screenshots.**
5. **Using modern CSS in email markup** (flex, margins, classes, CSS variables). Outlook drops
   it. Follow the email rules, and update the plain-text version too.
6. **Renaming a milestone key, storage key or record field.** Saved browsers still hold the old
   shape and John has no way to migrate by hand.
7. **Forgetting the second field-name array** when adding a form field, so it shows but never saves.
8. **Editing `brand.js` without bumping `?v=`**, then being told "I don't see it".
9. **Saying "it's live" after the merge** instead of after the publish run succeeds, or
   forgetting to tell John to press Ctrl+F5.
10. **Editing `data/market.json`** or running the fetch script locally. The workflow owns it.
11. **Hard-coding colors** or adding rounded cards and shadows that don't match the square,
    ruled look.
12. **"Fixing" the TRID math by skipping Saturdays** or ignoring holidays. Saturdays count.
13. **Re-rendering on every keystroke** in a text box (focus is lost). Save on `input`, render
    on `change`, as `#closingNotes` does.
14. **Building what was only asked about.** When John asks "how hard would it be" or "what are
    your thoughts", answer with a recommendation first. Build when he says go.
15. **Replying with code or internals.** He wants to know what he will see and where to click.
16. **Leaving the form blocked by validation**: `type="email"` or `type="url"` inputs reject
    partial values and silently stop Save. Website fields are plain text, fixed up by `asHref`.

## Before saying a task is done

- [ ] Change made in every place it applies (form, both field arrays, display, print, email HTML and text).
- [ ] Headless test at 1440, 1000 and iPhone 13: no page errors, no sideways scroll.
- [ ] The new behavior exercised end to end in the test (clicked, typed, saved, reloaded).
- [ ] Old saved data still loads (a record without the new field renders correctly).
- [ ] Looked at a screenshot yourself, in light mode, and dark mode if colors changed.
- [ ] No client data, keys or test scripts added to the repo; `git status` shows only intended files.
- [ ] `brand.js?v=` bumped if `brand.js` changed; workflow `cp` line updated if a file was added.
- [ ] Committed, pushed, pull request squash-merged, publish run finished with `success`.
- [ ] Reply to John: what changed, where it is on the page, "press Ctrl+F5", and anything not done or not verified, said plainly.
