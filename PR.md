# feat: migrate Space Fanfou to MV3, restore core integrations, and polish posting UX

## Summary

This PR brings the `2026.2` branch to a releasable Manifest V3 baseline for Space Fanfou.

It does three things in one coherent pass:

- completes the MV2 -> MV3 migration and hardens cross-context messaging
- replaces broken legacy integrations with built-in OAuth + API-based implementations
- adds a small set of practical UX enhancements, especially around posting and image upload

## Why

Chrome has fully deprecated MV2, and several older Fanfou web integrations had become unreliable or broken.
Without this branch, the extension is at risk of failing both at the platform level and at the feature level.

This work aims to restore a stable foundation first, then layer in focused usability improvements without rewriting the product's core interaction model.

## What Changed

### 1. Manifest V3 migration and runtime hardening

- migrated the extension architecture from background pages to a Service Worker model
- updated manifest/offscreen/background wiring for MV3 compatibility
- hardened the bridge/messaging flow to better survive Service Worker cold starts, disconnects, and deferred initialization
- fixed several MV3-specific regressions around timers, background lifecycle, and context integration

### 2. Built-in OAuth and API migration

- integrated built-in OAuth flow so users no longer need to manually provide their own consumer key
- added in-extension authorization UI and supporting background/page bridge modules
- migrated broken or fragile legacy data paths away from DOM scraping / JSONP toward OAuth-backed API requests
- restored features such as sidebar statistics and friendship checks on top of stable API sources

### 3. Status form reliability and UX improvements

- improved Ajax posting flow for multi-form contexts, including PopupBox reply forms
- fixed image upload edge cases around drag-and-drop, paste, and file selection
- added draft auto-save for status composition
- added word-count warning / danger states with clearer visual feedback
- polished PopupBox upload injection and follow-up alignment behavior for reply forms

### 4. New user-facing features

- added Avatar Wallpaper as an opt-in decorative feature for user pages
- added more resilient OAuth-related settings and account flows
- expanded Playwright coverage for OAuth, extension smoke checks, and status-form behavior

## Follow-up fixes included in this branch

- normalized Jest/Babel test execution so `npm test` runs successfully in the current repository state
- cleaned up several lint-triggering helper/debug scripts with narrow rule suppressions instead of broad project-wide relaxation
- added small PopupBox reply-form layout follow-ups based on visual regression checks

## Verification

Validated in the current `2026.2` workspace with:

- `npm test`
- `npm run build`
- targeted `stylelint` / `eslint` checks while iterating on PopupBox and test-environment changes

Current observed result:

- lint passes, with one existing non-blocking Stylelint warning related to a `TODO:` comment
- Jest passes all current unit suites
- production build completes successfully

## Notes for Reviewers

- `2026.2` is a large integration branch, so this PR mixes platform migration, feature recovery, and a limited set of new UX work
- the biggest reviewer focus areas should be:
  - MV3 background/message lifecycle safety
  - OAuth setup and API migration correctness
  - posting/image-upload regressions, especially in PopupBox reply flows

## Acknowledgements

Special thanks to @LitoMore for the open-source OAuth groundwork that made the built-in authorization path practical.

This branch was developed by @halmisen with substantial repository analysis, refactoring, and validation assistance from Claude Code, Codex CLI, and Gemini CLI.
