# Space Fanfou Development Tasks

## UI Rewrite & Beautification Strategy (New)

### Problem Analysis
*   The original UI (especially the Settings page and Sidebar Statistics) has a high information density and relies on tightly packed text elements.
*   Aggressively applying modern structural patterns (like Bento Grids or large Glassmorphism cards) drastically reduces information density, breaks text flow, and introduces negative optimizations (e.g., squished inputs, overlapping text).
*   The goal is to modernize the *feel* without destroying the *function* and *layout*.

### Progressive Enhancement Strategy
Instead of structural overhauls, we will focus on **Non-Destructive Aesthetic Upgrades**:

1.  **Color & Contrast Refinement (The Foundation):**
    *   Replace flat, generic colors with a cohesive modern palette (e.g., Tailwind's Slate/Gray scale for neutrals, Cyan/Blue for accents).
    *   Increase contrast ratios slightly for better readability.
    *   Introduce a subtle global background color (e.g., `#F8FAFC` or `#F5F5F7`) to make white content panels "pop" without needing heavy borders.

2.  **Typography Modernization:**
    *   We are already using system fonts (`-apple-system`, `BlinkMacSystemFont`), which is good.
    *   *Action:* Fine-tune font weights. Make headers bolder (`600` or `700`) and slightly tighter in letter-spacing. Use slightly lighter shades (`#475569` or `#64748B`) for secondary text to establish a clear visual hierarchy.

3.  **Micro-Interactions & Soft Shadows (The Polish):**
    *   *Current State:* Borders are often used to separate elements (e.g., `#eee`).
    *   *Upgrade:* Replace harsh borders with extremely subtle, modern drop shadows (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);`).
    *   Add smooth, fast transitions (`transition: all 0.2s ease-in-out;`) to hover states, button clicks, and input focuses.

4.  **Form Element Polish (Crucial for Settings):**
    *   Do *not* change the width or fundamental layout of inputs.
    *   *Action:* Give inputs a softer border (`1px solid #E2E8F0`), a very subtle inner shadow, and a clear, modern focus ring (e.g., `box-shadow: 0 0 0 2px #BAE6FD; border-color: #38BDF8;`). This makes them feel "clickable" and modern without altering the page layout.

### Next Action Plan
1.  **Discard Structural Changes:** We have already reverted the `feat/ui-settings` and `feat/ui-sidebar` worktrees to their `2026.2` state.
2.  **Iterative Micro-styling:** We will pick one component (e.g., the Settings page buttons and inputs) and apply *only* color, shadow, and transition updates.
3.  **Review & Proceed:** We will review these subtle changes. If successful, we expand this logic to other elements.

[x] Reverted failed Bento Grid/Glassmorphism structural changes in Settings and Sidebar.
[ ] Define a global minimalist color/shadow CSS variables block.
[ ] Apply non-destructive styling to Settings Form Elements (Inputs, Checkboxes, Buttons).
[ ] Apply non-destructive styling to Sidebar Typography and spacing.
