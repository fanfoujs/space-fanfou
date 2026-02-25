# AGENTS.md

This repository uses `CLAUDE.md` as the primary agent instruction source, with
`Claudeupdate.md` as workflow reinforcement.

## Source of Truth

- Primary operating guide: `CLAUDE.md`
- Workflow reinforcement: `Claudeupdate.md`
- Project/branch reality snapshot: `docs/project-status.md`

If instructions conflict, prefer `CLAUDE.md`.

## Required Behavior for Agents

1. Follow `CLAUDE.md` workflows and constraints first; apply
   `Claudeupdate.md` as additional emphasis.
2. Enter planning flow for any non-trivial task (3+ steps or architectural
   decisions):
   - Write a detailed, checkable plan in `tasks/todo.md`
   - Check in before implementation
   - Re-plan immediately if execution goes sideways
3. Use subagents for research/exploration/parallel analysis when tasks are
   complex, keeping one focused tack per subagent.
4. Track execution in `tasks/todo.md`:
   - Mark progress as work advances
   - Add review notes/results before completion
5. Verify before claiming done:
   - Run relevant tests/lint checks and inspect logs
   - Validate behavior changes (including baseline comparison when relevant)
6. Keep changes simple, minimal, and root-cause oriented:
   - No temporary/hacky fixes for non-trivial issues
   - Prefer elegant solutions when complexity justifies it
7. After user corrections, update `tasks/lessons.md` with actionable prevention
   rules.
