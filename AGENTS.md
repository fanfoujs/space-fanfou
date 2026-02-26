# AGENTS.md

This repository follows `CLAUDE.md` as the primary operating contract for all
agents.

## Source of Truth

Priority order:

1. `CLAUDE.md` (authoritative workflow and quality bar)
2. Live repository state (`git branch --show-current`, `git status --short`,
   current files on disk)
3. `docs/project-status.md` (snapshot reference; may lag behind live state)
4. `PROJECT-STATUS-20260225.md` (historical milestone context)
5. `Claudeupdate.md` (optional reinforcement only when the file exists)

If instructions conflict, follow `CLAUDE.md` first, then reconcile with live
repo state.

## Current Project Reality (must re-check each task)

- `docs/project-status.md` is a dated snapshot (last update shown: 2026-02-23).
- Current workspace branch is `2026.2` (not the older `gemini/fix-mv3` snapshot
  head in that doc).
- There are active in-flight edits around:
  - `src/features/avatar-wallpaper/*`
  - `src/features/status-form-enhancements/*`
  - `tests/playwright/status-form.spec.ts`
  - `tasks/*`

Agents must treat these as ongoing work, avoid accidental rollback, and only
touch files required for the task.

## Mandatory Agent Workflow

1. For any non-trivial task (3+ steps or architecture-impacting), enter planning
   flow first:
   - Write a detailed, checkable plan in `tasks/todo.md`
   - Check in before implementation
   - Re-plan immediately if execution goes sideways
2. Use subagents for complex research/exploration/parallel analysis with one
   tack per subagent.
3. Track execution in `tasks/todo.md` while working:
   - Mark progress continuously
   - Add a review/results section before closing the task
4. Verify before claiming completion:
   - Run relevant lint/tests/build checks
   - Inspect logs/errors instead of assuming success
   - Validate behavior changes against baseline when relevant
5. Keep fixes simple, minimal, and root-cause oriented:
   - No temporary/hacky fix for non-trivial issues
   - Prefer elegant solutions when complexity warrants
6. After user corrections, update `tasks/lessons.md` with concrete prevention
   rules.

## Practical Guardrails

- Do not assume status docs are current; confirm branch/dirty state first.
- Do not revert or overwrite unrelated local changes.
- Keep diffs scoped; prefer smallest safe change that satisfies the request.
