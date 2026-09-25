# Plan: Empty-state grid

| Field  | Value                                   |
|--------|-----------------------------------------|
| Date   | 2026-09-24                              |
| Status | Done                                    |
| Owner  | Engineering                             |
| Goal   | A pointer-lit grid behind the empty state |

The visual rules live in `DESIGN.md` (Overview; Colors, Primary; Layout,
motion). This plan records only how it is built.

## How

- `CursorGrid` is a UI primitive (`src/components/ui/CursorGrid`), adapted
  from the open-source CursorGrid component to TypeScript and the
  project's conventions: a slot recipe instead of a CSS file, the stroke
  colour read from the `text-primary` token on the canvas each frame so it
  follows the light and dark themes, and nothing drawn or listened to under
  reduced motion.
- The grid is `aria-hidden` and `pointer-events: none`; it listens on its
  parent element, so the pointer lights it through the content above it.
- `clearOf` takes elements the grid keeps clear of: `ChatScreen` passes
  the headline block and the composer, so no lit cell is drawn over them.
- `ChatScreen` renders it behind the empty state only; it unmounts with
  the empty state when the first question is asked.

Done when the grid lights up under the pointer in both themes, a click
sends a ring, the composer stays usable, and nothing moves
under reduced motion.
