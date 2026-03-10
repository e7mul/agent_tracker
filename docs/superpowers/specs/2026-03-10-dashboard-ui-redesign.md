# Dashboard UI Redesign

**Date:** 2026-03-10
**Status:** Approved

## Goal

Replace the barely-visible dark-on-dark UI with a GitHub Dark themed layout that makes session status instantly scannable at a glance, with a sidebar for machine navigation.

## Visual Style

**Palette:** GitHub Dark
- Page background: `#0d1117`
- Sidebar + card chrome: `#161b22`
- Borders: `#30363d`
- Primary text: `#e6edf3`
- Secondary text: `#8b949e`
- Accent blue: `#58a6ff`

**Status tints (card background + border):**
| Status | Background | Border | Pill |
|---|---|---|---|
| working | `#0d1f0e` | `#238636` | green `●` |
| awaiting_permission | `#1f1a0d` | `#9e6a03` | amber `⚠` |
| idle | `#111d2d` | `#1f6feb` | blue `○` |
| stopped | `#161b22` | `#30363d` | grey `—`, 45% opacity |

No animation — all status signals are static colour only.

## Layout

### Top Bar (48px, fixed)
- Left: `⬡ Agent Dashboard` title in accent blue
- Centre: WebSocket status dot + label
- Right: total session count badge

### Sidebar (220px, fixed left)
- Section label: "MACHINES"
- "All machines" row at top (shows all sessions ungrouped)
- One row per machine hostname, showing:
  - Laptop emoji icon
  - Hostname (truncated)
  - Session count badge (green if any active, grey if all stopped)
- Active machine highlighted with blue left border + `#1c2128` background
- On mobile (`<768px`): sidebar becomes a horizontal scrolling strip pinned to the top below the topbar

### Main Area (scrollable)
- Header: machine name (uppercase, muted) + active session count
- Session cards in a responsive grid: `repeat(auto-fill, minmax(260px, 1fr))`, 12px gap
- Cards sorted: working → awaiting_permission → idle → stopped

### Session Card
- Tinted background + coloured border per status (see table above)
- Top row: **project name** (bold) + status pill (symbol + label)
- Second row: `branch · hostname` in monospace, muted
- Git repo URL as a link (if present), truncated
- Context bar: thin 3px bar, colour matches status tint accent; turns red above 80%
- Footer: relative timestamp, right-aligned, muted

### Login Screen
- Centred card on `#0d1117` background
- `⬡ Agent Dashboard` heading in accent blue
- Password input with GitHub Dark styling
- "Connect" button in `#238636` green

## Implementation Constraints

- Single `client/index.html` file — no build step, React + Tailwind via CDN
- All existing server code unchanged
- Sidebar filter state is React local state only (no URL routing needed)
