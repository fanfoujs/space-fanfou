# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Project Overview

Space Fanfou is a Chrome extension (Manifest V3) that enhances fanfou.com.

- **Version**: MV3 (this fork has completed the MV2→MV3 migration; upstream is still MV2)
- **Base**: Forked from [fanfoujs/space-fanfou](https://github.com/fanfoujs/space-fanfou)
- **OAuth**: Built-in Fanfou developer key — users authorize with one click (`fanfou-oauth` feature module)

## Core Commands

### Development
```bash
npm run dev          # Dev mode (watch files, auto-rebuild)
npm test             # Run lint + unit tests
npm run build        # Production build
npm run release      # Production build + zip package (= build + pack)
```

### Testing & Linting
```bash
npm run unit         # Run Jest unit tests
npm run unit:dev     # Jest watch mode
npm run lint         # Run JS and CSS linting together
npm run lint:js      # ESLint only
npm run lint:css     # Stylelint only
```

### Running Individual Tests
```bash
npx jest path/to/test-file.js
npx jest -t "test name pattern"
```

## Architecture Overview

### Four-Layer Structure

The extension compiles into four independent bundles (see `docs/architecture.md`):

1. **Background Scripts** (`background.js`)
   - Service Worker, runs persistently
   - Handles notifications, @ mention checks, and other always-on features
   - Cannot access the DOM directly; communicates with Content Scripts via messages

2. **Content Scripts** (`content.js`)
   - Injected into fanfou.com pages, runs in an isolated environment
   - Can manipulate the DOM but cannot access page JS objects (jQuery, YUI, etc.)
   - Acts as the bridge between Background and Page Scripts
   - Requires extension restart to pick up changes

3. **Page Scripts** (`page.js`)
   - Injected by Content Scripts via a `<script>` tag appended to `document.documentElement`
   - Runs in the **fanfou.com page context** — has full access to fanfou's JS APIs (jQuery, YUI, etc.)
   - Communicates with Content Scripts via CustomEvents
   - Changes take effect on page reload — no extension restart needed
   - **CSP note**: governed by fanfou.com's CSP, NOT the extension's `content_security_policy.extension_pages`. Fanfou imposes no strict CSP, so techniques like JSONP (injecting `<script>` tags) work fine here. Do not apply extension-level CSP restrictions to Page Script code.

4. **Settings** (`settings.html` + `settings.js`)
   - Extension settings page
   - UI built with Preact

**When to use which**: Use Content Scripts for performance-sensitive work or anything that needs to talk to Background; use Page Scripts when you need fanfou's JS APIs. Prefer Page Scripts during development (no restart needed).

### Feature Module System

Each feature lives in its own directory under `src/features/<feature-name>/`:

```
src/features/
├── auto-pager/
│   ├── metadata.js           # Feature config (option definitions, defaults, labels)
│   └── @page.js              # Page Script implementation
├── notifications/
│   ├── metadata.js
│   ├── service@background.js # Background Script implementation
│   └── update-details@background.js
└── floating-status-form/
    ├── metadata.js
    ├── floating-status-form@page.js
    ├── floating-status-form@page.less
    └── replay-and-repost@page.js
```

**File naming conventions**:
- `metadata.js`: required — defines feature options and config
- `<subfeature-name>@background.js`: Background Script component
- `<subfeature-name>@content.js`: Content Script component
- `<subfeature-name>@page.js`: Page Script component
- `<subfeature-name>@page.less`: Page Script styles
- `<subfeature-name>@content.less`: Content Script styles

**metadata.js structure**:
```javascript
export const options = {
  _: {                          // master toggle
    defaultValue: true,
    label: 'Feature description',
  },
  subOption: {                  // sub-option
    defaultValue: false,
    label: 'Sub-feature description',
    disableCloudSyncing: true,  // store in local instead of sync
  },
}

// or: feature cannot be disabled (soldered on)
export const isSoldered = true
```

### Build System

- **Entry files**: `src/entries/` directory
  - `background-content-page.js`: shared entry for all three layers (auto-loads the right feature components per environment)
  - `settings.js`: settings page entry
  - `offscreen.js`: Offscreen document entry (Service Workers don't support Audio API in MV3; audio playback lives here)
- **Conditional compilation**: `ifdef-loader` selects code by environment variable
  - `/// #if ENV_BACKGROUND`
  - `/// #elif ENV_CONTENT`
  - `/// #elif ENV_PAGE`
  - `/// #endif`
- **Dynamic loading**: `src/features/index.js` uses `import-all.macro` to auto-load all feature modules
- **Output**: `dist/` (contains manifest.json, background.js, content.js, page.js, etc.)

## Tech Stack

- **Framework**: Preact 10 (settings page UI)
- **Build**: Webpack 4 + Babel
- **Testing**: Jest
- **Linting**: ESLint (eslint-config-riophae), Stylelint
- **Styles**: LESS + PostCSS (Autoprefixer)
- **Utility libraries**:
  - `select-dom`: lightweight DOM selector (jQuery-like)
  - `dom-chef`: create DOM elements with JSX
  - `element-ready`: wait for an element to appear
  - `wretch`: HTTP request wrapper

## Key Conventions

1. **Path aliases**:
   - `@libs/*` → `src/libs/*`
   - `@features/*` → `src/features/*`
   - `@constants/*` → `src/constants/*`

2. **Messaging**:
   - Background ↔ Content: Chrome Extension API (`chrome.runtime.sendMessage`)
   - Content ↔ Page: CustomEvent (via `src/content/environment/bridge.js`)

3. **Settings storage**:
   - `chrome.storage.sync` (cloud-synced) or `chrome.storage.local` (local only)
   - Controlled per option via `disableCloudSyncing`

4. **Production build**:
   - Minimal minification only (code stays readable)
   - Makes it easier to debug from user bug reports

## Common Tasks

### Adding a New Feature

1. Create a new directory under `src/features/`
2. Create `metadata.js` to define the config
3. Add `@background.js`, `@content.js`, or `@page.js` as needed
4. The feature is auto-loaded — no manual registration required

### Debugging

- Dev mode: `npm run dev`, then load the `dist/` directory in Chrome's extension management page
- Background logs: Extensions page → Service Worker → Inspect view
- Content/Page logs: right-click page → Inspect → Console

### Pre-release Checklist

```bash
npm test            # Ensure all checks pass
npm run release     # Production build + zip
```

## Reference Docs

- Architecture details: `docs/architecture.md`
- Release process: `docs/publish.md`
- Contributing guide: `docs/contributing.md`
