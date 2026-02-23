# AGENTS.md

This repository uses `CLAUDE.md` as the primary agent instruction source.

## Source of Truth

- Main operating guide: `CLAUDE.md`
- Project/branch reality snapshot: `docs/project-status.md`

## Required Behavior for Agents

1. Follow all workflows and constraints in `CLAUDE.md` first.
2. For non-trivial tasks, plan in `tasks/todo.md` before implementation.
3. Verify with tests/logs before claiming completion.
4. Update `tasks/todo.md` review notes and `tasks/lessons.md` when applicable.

If any instruction conflicts, prefer `CLAUDE.md`.
