# Frontend Specification: Section Reveal Transitions, Animations, Scroll Behavior & Visual Progress

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Scope**: Exhaustive specification of every UI/UX behavior when sections reveal, hide, or transition between states — including animation parameters, scroll-into-view rules, skeleton/disabled states for locked sections, and visual indicators showing the user's progress through the flow.
> **Cross-references**: `docs/frontend/frontend-spec.md` §2.9 (SectionContainer), `docs/frontend/frontend-spec-progressive-reveal.md` (state machine), `docs/frontend/frontend-spec-ui-states.md` (loading/error/empty/success), `docs/frontend/frontend-spec-component-signatures.md` §15 (SectionContainer props)

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [SectionContainer Fade-In Animation](#2-sectioncontainer-fade-in-animation)
3. [Scroll-Into-View Behavior on Section Reveal](#3-scroll-into-view-behavior-on-section-reveal)
4. [Section-by-Section Reveal UX](#4-section-by-section-reveal-ux)
5. [Skeleton States for Loading Sections](#5-skeleton-states-for-loading-sections)
6. [Locked / Disabled Section States](#6-locked--disabled-section-states)
7. [Visual Progress Indicators](#7-visual-progress-indicators)
8. [Section Hiding (Reverse Transitions)](#8-section-hiding-reverse-transitions)
9. [Interaction Blocking During Transitions](#9-interaction-blocking-during-transitions)
10. [Complete Transition Timeline Matrix](#10-complete-transition-timeline-matrix)
11. [Implementation Reference: SectionContainer Component](#11-implementation-reference-sectioncontainer-component)
12. [Additional Edge Cases & Clarifications](#12-additional-edge-cases--clarifications)

---

## 1. Overview & Principles

The WhenToGo single-page flow uses **progressive section reveal** — sections appear one-by-one as the user progresses through the flow. This document specifies exactly what happens visually when each section appears, disappears, or transitions between states.

### 1.1 Design Principles

| Principle | Implementation |
|-----------|---------------|
| **No layout shift** | Skeleton placeholders match the success-state dimensions of each section, so the page height does not jump when data loads. |
| **Immediate feedback** | Every user action that triggers a section reveal produces visible feedback within one render frame (section appears with loading skeleton). |
| **No blocking animations** | Animations are purely cosmetic. The user can interact with newly revealed sections immediately — they do not need to wait for the fade-in to complete. |
| **Top-to-bottom flow** | Sections always appear in order: Search → Calendar → Date Details → Comparison. A section lower in the stack never appears without its predecessor being visible (exception: Comparison can appear independently when queue has items). |
| **Graceful hide** | When a section is hidden (e.g., user changes destination), it disappears instantly (no fade-out animation). This avoids the complexity of staggered unmounting and prevents stale content from lingering. |

### 1.2 Animation Technology

All reveal animations use **MUI's `<Fade>` component** from `@mui/material/Fade`. No custom CSS keyframes, no `framer-motion`, no `react-spring`. The `<Fade>` component wraps the section content inside `SectionContainer`.

---

## 2. SectionContainer Fade-In Animation

### 2.1 Fade-In Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| **MUI Component** | `<Fade>` from `@mui/material/Fade` | Not `<Collapse>`, not `<Grow>`, not `<Slide>` |
| **`in` prop** | Bound to the `visible` prop of `SectionContainerProps` | `true` = faded in, `false` = not rendered |
| **`timeout`** | `500` (milliseconds) | Single value — same duration for enter. Exit is instant (see §2.2). |
| **`easing`** | Default MUI easing (`theme.transitions.easing.easeInOut` = `cubic-bezier(0.4, 0, 0.2, 1)`) | Do not override. Use MUI's default. |
| **`appear`** | `true` | Animate on initial mount if `visible` is already `true`. This means if the page loads with a section already visible (e.g., Destination Search, which is always visible), it fades in on first render. |
| **`mountOnEnter`** | `true` | The section's DOM subtree is not rendered until `visible` becomes `true`. This avoids rendering hidden sections in the DOM. |
| **`unmountOnExit`** | `true` | When `visible` becomes `false`, the section's DOM subtree is removed after the exit transition. Combined with instant exit (see §2.2), this means removal is immediate. |
| **CSS `opacity`** | Transitions from `0` to `1` over 500ms | Managed by MUI's `<Fade>` internally. Do not set opacity manually. |

### 2.2 Fade-Out / Hide Behavior

**There is NO fade-out animation.** When `visible` transitions from `true` to `false`:

- The `<Fade>` component's `timeout` for exit is set to `0` (instant).
- Implementation: Use `timeout={{ enter: 500, exit: 0 }}` on the `<Fade>` component.
- The section is immediately unmounted from the DOM (`unmountOnExit={true}`).
- Rationale: Fade-out creates awkward visual artifacts when upstream data is invalidated. An instant hide communicates clearly that the section's data is no longer valid.

### 2.3 Destination Search Section (Special Case)

The Destination Search section (`sectionId="destination"`) has `visible={true}` unconditionally. It still uses the `<Fade>` wrapper for consistency, but because `visible` is always `true` and `appear={true}`, it simply fades in once on initial page load. It never fades out.

---

## 3. Scroll-Into-View Behavior on Section Reveal

When a new section reveals, the page should scroll to bring the newly revealed section into view. This ensures the user always sees the result of their action.

### 3.1 Scroll Trigger Rules

| Trigger Event | Scroll Target | Scroll Behavior | Scroll Timing |
|---------------|---------------|-----------------|---------------|
| Calendar is always visible (no reveal trigger) | N/A | N/A | Calendar renders on page load; no scroll trigger needed |
| Date range selected → Date Details reveals | Top of `#dateDetails` section | `smooth` | After state update, in a `useEffect` that watches `dateRange` transitioning from `null` to non-null |
| First item added to queue → Comparison reveals | Top of `#comparison` section | `smooth` | After queue count transitions from `0` to `1` (only on first item; subsequent additions do not scroll) |
| User clicks ComparisonQueueFAB | Top of `#comparison` section | `smooth` | Immediately on click |
| User selects new destination (calendar re-fetches) | No scroll | N/A | Calendar is already visible; user remains at current scroll position |
| User selects new date range (details re-fetch) | No scroll | N/A | Date Details is already visible; user remains at current scroll position |

### 3.2 Scroll Implementation

Use the native `Element.scrollIntoView()` API. Do NOT use a scroll library.

```typescript
/**
 * Scrolls the target section into view after a brief delay to allow
 * the Fade animation to begin rendering the DOM element.
 *
 * Called from useEffect hooks in HomePage when visibility conditions change.
 */
function scrollToSection(sectionId: SectionId): void {
  // requestAnimationFrame ensures the DOM has been updated and the
  // Fade component has started rendering the element.
  requestAnimationFrame(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  });
}
```

### 3.3 Scroll Guard: Only Scroll on Forward Transitions

**Do NOT scroll when a section is already visible and merely re-fetching data.** Scroll only happens when a section transitions from invisible to visible. Implementation: track the previous visibility state with a `useRef` and only call `scrollToSection` when the previous value was `false` and the current value is `true`.

```typescript
// Example: scroll to dateDetails when it first appears
// (Calendar is always visible — no scroll needed for it)
const prevShowDateDetails = useRef(false);

useEffect(() => {
  if (showDateDetails && !prevShowDateDetails.current) {
    scrollToSection('dateDetails');
  }
  prevShowDateDetails.current = showDateDetails;
}, [showDateDetails]);
```

### 3.4 Scroll Offset

`block: 'start'` aligns the top of the section with the top of the viewport. The `Header` component is **not** sticky/fixed (it scrolls with the page), so no additional offset is needed. If the Header were ever made sticky in the future, add `scroll-margin-top` to each `SectionContainer`'s root element.

---

## 4. Section-by-Section Reveal UX

This section documents the exact visual experience for each section transition from the user's perspective.

### 4.1 Section 1: Destination Search — Initial Page Load

**Trigger**: Page loads.

**What the user sees**:
1. The page renders with only the Search section visible.
2. The Search section fades in over 500ms (opacity 0 → 1) due to `appear={true}` on the Fade component.
3. The search input, origin airport input, and traveler count input are all immediately interactive (not disabled).
4. Below the Search section: empty space (no hidden sections are rendered in the DOM).
5. No progress indicators, no step numbers, no "Step 1 of 4" text.

**Layout dimensions (Search section)**:
- The `SearchSection` has a fixed layout that does not change between states.
- No skeleton needed — the inputs render immediately with their default empty values.

### 4.2 Section 2: Calendar — Always Visible

**Trigger**: Page load (no user action required).

**What the user sees (frame by frame)**:

| Frame | Timing | Visual |
|-------|--------|--------|
| 1 | Immediate (0ms) | Page loads with both the Search section and Calendar section visible. |
| 2 | Next render (~16ms) | Calendar section shows a 2-month grid without weather data (empty day cells with dates only, no temperature/rain indicators). |
| 3 | User selects destination | Weather API call fires. Calendar day cells show loading skeleton overlays. |
| 4 | Variable (API response) | Skeleton overlays replaced by actual weather data (temp, rain, color-coded labels) OR by an `InlineError` (error). This transition is **instant**. |

**Scroll behavior**: No scroll occurs on page load since the calendar is already visible.

**Interaction during transition**: The Search section above remains fully interactive. The calendar displays an empty grid (dates only, no weather) until a destination is selected. Once a destination is selected, weather data is fetched and overlaid automatically.

### 4.3 Section 3: Date Details — Date Range Selected

**Trigger**: User completes a date range selection on the calendar (clicks start date, then end date).

**What the user sees (frame by frame)**:

| Frame | Timing | Visual |
|-------|--------|--------|
| 1 | Immediate (0ms) | Calendar highlights the selected date range (start-to-end cells get a highlighted background). |
| 2 | Next render (~16ms) | Date Details section begins fading in below the calendar. It contains three `Card` components side-by-side (on desktop), each showing its respective skeleton: Flight skeleton, Hotel skeleton, Weather skeleton (see §5.2–§5.4). |
| 3 | 0–500ms | Date Details section opacity increases from 0 to 1. All three cards show skeletons simultaneously. |
| 4 | Variable (per API response) | Each card independently transitions from skeleton to content as its API call resolves. Cards resolve at different times — this is expected and normal. The "Add to Queue" button is visible but disabled (see §6.2). |
| 5 | All three resolved | If all three are in `success` state and a hotel is selected, the "Add to Queue" button becomes enabled. |

**Scroll behavior**: Page smoothly scrolls so the top of `#dateDetails` aligns with the top of the viewport.

**Layout**: The three cards (Flight, Hotel, Weather) are arranged in a responsive `Grid` container:
- Desktop: 3 columns, each card taking `xs={12} md={4}`
- The cards have equal height within the row (MUI Grid handles this via flex stretch)

### 4.4 Section 4: Comparison — First Item Added to Queue

**Trigger**: User clicks "Add to Queue" button (enabled when all three detail sections are loaded and hotel is selected).

**What the user sees (frame by frame)**:

| Frame | Timing | Visual |
|-------|--------|--------|
| 1 | Immediate (0ms) | "Add to Queue" button text changes to "Added!" with a check icon (✓). Button becomes temporarily disabled for 1500ms. |
| 2 | Next render (~16ms) | Comparison section begins fading in below Date Details. It shows the `ComparisonQueuePanel` with 1 item card. The "Compare" button is visible but disabled (tooltip: "Add at least 2 date options to compare"). |
| 3 | 0–500ms | Comparison section opacity increases from 0 to 1. Queue item card is fully visible. |
| 4 | 1500ms | "Add to Queue" button reverts from "Added!" back to "Add to Queue" and re-enables. |

**Scroll behavior**: Page smoothly scrolls to `#comparison` (only on the first queue addition when the section first appears). Subsequent additions do NOT trigger scroll.

**Important**: The "Added!" confirmation is a local button state change — not a section-level state change. The comparison section reveal and the button confirmation happen concurrently.

---

## 5. Skeleton States for Loading Sections

Skeletons provide spatial stability — they fill the same space that the actual content will occupy, preventing layout shifts when data loads. Each section's skeleton matches the success-state layout dimensions.

### 5.1 Calendar Section Skeleton

**When shown**: `calendarWeather.state === 'loading'`

**Layout**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────┐  ┌──────────────────────────────────┐│
│ │ [Skeleton text, w: 120px]        │  │ [Skeleton text, w: 120px]        ││
│ │ ┌────┬────┬────┬────┬────┬────┬────┐ ┌────┬────┬────┬────┬────┬────┬────┐│
│ │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk ││
│ │ ├────┼────┼────┼────┼────┼────┼────┤ ├────┼────┼────┼────┼────┼────┼────┤│
│ │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk ││
│ │ ├────┼────┼────┼────┼────┼────┼────┤ ├────┼────┼────┼────┼────┼────┼────┤│
│ │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk ││
│ │ ├────┼────┼────┼────┼────┼────┼────┤ ├────┼────┼────┼────┼────┼────┼────┤│
│ │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk │ Sk ││
│ │ ├────┼────┼────┼────┼────┼────┼────┤ ├────┼────┼────┼────┼────┼────┼────┤│
│ │ │ Sk │ Sk │ Sk │    │    │    │    │ │ Sk │ Sk │ Sk │    │    │    │    ││
│ │ └────┴────┴────┴────┴────┴────┴────┘ └────┴────┴────┴────┴────┴────┴────┘│
│ └──────────────────────────────────┘  └──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

**Skeleton components**:
- **Month headers**: 2× MUI `<Skeleton variant="text" width={120} />` (one per month)
- **Day cells**: MUI `<Skeleton variant="rectangular" width="100%" height={48} />` per cell
- **Day-of-week headers**: 7 columns labeled "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" — rendered as real text (not skeleton), providing structural context during loading
- **Grid layout**: 7 columns × 5 rows per month, 2 months side-by-side. Same CSS Grid/flexbox as the success state.

**Animation**: MUI Skeleton default `animation="pulse"` (gentle opacity pulsing). Do not change to `"wave"` or disable animation.

**User interaction**: Date selection is disabled during loading. Calendar day cells do not respond to clicks. No hover effects on skeleton cells.

### 5.2 Flight Price Card Skeleton

**When shown**: `dateDetailResults.flight.state === 'loading'`

**Layout**:
```
┌─────────────────────────────┐
│ Flight Price                │  ← Real text heading (not skeleton)
│                             │
│ [Skeleton text, w: 60%]    │  ← Mimics "$342.50 USD" price line
│ [Skeleton text, w: 40%]    │  ← Mimics "ICN → NRT" route line
│                             │
└─────────────────────────────┘
```

**Skeleton components**:
- Card heading "Flight Price": Real `Typography variant="h6"` text (not a skeleton). Provides context that this card is about flights.
- Price line: `<Skeleton variant="text" width="60%" height={40} />` (taller to match `h4` typography)
- Route line: `<Skeleton variant="text" width="40%" />`

### 5.3 Hotel Search Card Skeleton

**When shown**: `dateDetailResults.hotels.state === 'loading'`

**Layout**:
```
┌─────────────────────────────┐
│ Hotels                      │  ← Real text heading
│                             │
│ [Skeleton rect, h: 72px]   │  ← Mimics hotel list item 1
│ [Skeleton rect, h: 72px]   │  ← Mimics hotel list item 2
│ [Skeleton rect, h: 72px]   │  ← Mimics hotel list item 3
│                             │
└─────────────────────────────┘
```

**Skeleton components**:
- Card heading "Hotels": Real `Typography variant="h6"` text.
- 3 hotel item placeholders: `<Skeleton variant="rectangular" width="100%" height={72} />` each, with `spacing={1}` (8px gap) between them in a `Stack`.

### 5.4 Weather Summary Card Skeleton

**When shown**: `dateDetailResults.weather.state === 'loading'`

**Layout**:
```
┌─────────────────────────────┐
│ Weather                     │  ← Real text heading
│                             │
│ [Skeleton text, w: 50%]    │  ← Mimics weather label chip
│ [Skeleton rect, w: 80%,    │  ← Mimics score bar
│              h: 24px]      │
│ [Skeleton text, w: 30%]    │  ← Mimics temperature text
│                             │
└─────────────────────────────┘
```

**Skeleton components**:
- Card heading "Weather": Real `Typography variant="h6"` text.
- Label placeholder: `<Skeleton variant="text" width="50%" />`
- Score bar placeholder: `<Skeleton variant="rectangular" width="80%" height={24} />`
- Temperature placeholder: `<Skeleton variant="text" width="30%" />`

### 5.5 Comparison Table Skeleton

**When shown**: Comparison `AsyncState.status === 'loading'` (after user clicks "Compare")

**Layout**:
```
┌──────────────────────────────────────────────────────────────────┐
│ [Skeleton rect, w: 100%, h: 48px]                               │  ← Table header row
│ [Skeleton rect, w: 100%, h: 48px]                               │  ← Data row 1
│ [Skeleton rect, w: 100%, h: 48px]                               │  ← Data row 2
│ [Skeleton rect, w: 100%, h: 48px]                               │  ← Data row 3
└──────────────────────────────────────────────────────────────────┘
```

**Skeleton components**:
- 4 rows (1 header + 3 data rows): `<Skeleton variant="rectangular" width="100%" height={48} />` each, with 4px gap.
- The number of data rows in the skeleton is fixed at 3 regardless of how many items are in the queue. This avoids revealing queue size through skeleton count.

### 5.6 Skeleton-to-Content Transition

When data arrives and a section transitions from `loading` to `success` (or `error` or `empty`):

- **No animation**: The skeleton is immediately replaced by the actual content. There is no crossfade, no dissolve, no slide.
- **Implementation**: The parent component conditionally renders either the skeleton or the content based on the `AsyncState.status` value. React's reconciliation swaps them in a single render.
- **Layout stability**: Because the skeleton matches the content dimensions, the swap should not cause visible layout shift. Minor height differences (e.g., if the hotel list has 4 items instead of the skeleton's 3 placeholders) are acceptable — they result in a small, non-jarring adjustment.

---

## 6. Locked / Disabled Section States

"Locked" sections are those whose prerequisite data is not yet available. They are NOT rendered in the DOM at all — they are hidden, not disabled. This section clarifies what it means for each section to be "locked" and what visual state downstream content adopts.

### 6.1 Locked Sections Are Not Rendered

Unlike wizard-style UIs that show greyed-out future steps, WhenToGo does NOT render locked sections. When `visible={false}`, the `SectionContainer` returns `null` — no DOM element exists for that section. The user does not see "Step 3: Trip Details (locked)" or any similar indicator.

**Rationale**: The progressive reveal pattern is meant to feel like a single page that grows as the user provides input, not a multi-step form with locked future steps. Showing locked sections would overwhelm the user with complexity they haven't reached yet.

### 6.2 Disabled Interactions Within Visible Sections

Even though locked sections are hidden, there are disabled states within **visible** sections:

| Component | When Disabled | Visual Treatment | User Feedback |
|-----------|--------------|-----------------|--------------|
| **Calendar day cells** | `calendarWeather.state === 'loading'` | Skeleton rectangles (not clickable) | N/A — skeletons don't look interactive |
| **Calendar day cells** | `calendarWeather.state === 'error'` | Not rendered (InlineError replaces the grid) | Error message + Retry button |
| **Calendar past dates** | Always (dates before today) | Greyed out text (`color: text.disabled`), `cursor: default`, no hover effect | Clicking has no effect (click handler ignores past dates) |
| **"Add to Queue" button** | Flight OR Hotel OR Weather not in `success`, OR no hotel selected, OR queue full, OR duplicate | `disabled={true}` on MUI `Button` | Tooltip explains reason (see §6.3) |
| **"Compare" button** | Queue has 0 or 1 items | `disabled={true}` on MUI `Button` | Tooltip: "Add at least 2 date options to compare" |
| **"Compare" button** | Comparison request in-flight | `disabled={true}`, shows `CircularProgress` inside button | Button text: "Comparing..." |
| **Queue item remove buttons** | Comparison request in-flight | `disabled={true}` | Prevents queue modification during scoring |
| **Hotel list items** | `dateDetailResults.hotels.state !== 'success'` | Not rendered (skeleton or error shown instead) | N/A |

### 6.3 "Add to Queue" Button Tooltip Priority

When multiple disable conditions are true simultaneously, show the highest-priority tooltip:

| Priority | Condition | Tooltip Text |
|----------|-----------|-------------|
| 1 (highest) | Flight state is `loading` or `error` | "Waiting for flight price..." |
| 2 | Hotel state is `loading` or `error` | "Waiting for hotel data..." |
| 3 | Weather state is `loading` or `error` | "Waiting for weather data..." |
| 4 | Hotel state is `success` but no hotel selected | "Select a hotel first" |
| 5 | Queue is full (5 items) | "Comparison queue is full (max 5)" |
| 6 (lowest) | Duplicate entry exists in queue | "This date range is already in your queue" |

If none of these conditions are true, the button is enabled and no tooltip is shown on hover.

---

## 7. Visual Progress Indicators

The WhenToGo flow has **no explicit step indicators** (no "Step 1 of 4", no stepper component, no breadcrumbs, no progress bar). Progress is communicated implicitly through the progressive reveal of sections.

### 7.1 What Communicates Progress

| Visual Cue | What It Tells the User |
|------------|----------------------|
| **Number of visible sections** | How far through the flow they are. One section = just started. Four sections = full flow active. |
| **Section titles** | Each section has a descriptive title ("Select Your Dates", "Trip Details", "Compare Options") that tells the user what stage they're at. |
| **Comparison queue badge** | The `ComparisonQueueFAB` floating button shows a badge with the current queue count (e.g., "3/5"). This tells the user how many trip options they've assembled. |
| **"Add to Queue" button state** | When enabled, it signals that all required data is loaded. When disabled, the tooltip explains what's still pending. |
| **"Compare" button state** | When enabled (queue ≥ 2), it signals the user can proceed to comparison. When disabled, the tooltip explains the minimum requirement. |
| **Section scroll position** | The auto-scroll on section reveal naturally moves the user's viewport to the latest section, reinforcing forward progress. |

### 7.2 ComparisonQueueFAB Badge

**File**: `frontend/src/components/layout/ComparisonQueueFAB.tsx`

The FAB provides a persistent, always-visible progress indicator for the queue:

| Queue Count | Badge Display | FAB Visibility |
|-------------|--------------|---------------|
| 0 | No badge. FAB is hidden (`display: none`). | Hidden |
| 1 | Badge shows "1" | Visible |
| 2–4 | Badge shows count (e.g., "3") | Visible |
| 5 | Badge shows "5" with a distinct color (`error` — red) to indicate the queue is full | Visible |

**FAB position**: Fixed at bottom-right of the viewport (`position: fixed`, `bottom: 24px`, `right: 24px`).

**FAB click action**: Smooth-scrolls to `#comparison` section.

**FAB icon**: MUI `CompareArrows` icon.

**Badge component**: MUI `<Badge>` wrapping the FAB icon, with `badgeContent={queueCount}`, `color="primary"` (or `"error"` when full).

### 7.3 Section Title as Progress Context

Each `SectionContainer` with a title renders:

```
┌─────────────────────────────────────────────────┐
│ Typography variant="h4":  "Select Your Dates"   │
│ Typography variant="body1" color="text.secondary":│
│   "Choose a date range to explore..."            │
│ ─────────────────────────────────────────────── │
│ [Section content]                                │
└─────────────────────────────────────────────────┘
```

The title and subtitle are rendered with `mb: 3` (24px) margin-bottom before the section content. This creates clear visual separation between sections and helps the user orient themselves.

### 7.4 "Added!" Confirmation Feedback

When the user successfully adds a trip option to the queue:

| Time | Button State | Visual |
|------|-------------|--------|
| 0ms | User clicks "Add to Queue" | Button transitions to "Added!" state |
| 0ms–1500ms | "Added!" | Button text: "Added!" with MUI `Check` icon prepended. Button `color="success"`. Button `disabled={true}`. |
| 1500ms | Revert | Button text reverts to "Add to Queue". Button `color="primary"`. Button `disabled` state re-evaluated based on current conditions. |

Implementation: Use `useState` for a `justAdded: boolean` flag, set to `true` on add, then `setTimeout(() => setJustAdded(false), 1500)`.

---

## 8. Section Hiding (Reverse Transitions)

### 8.1 Hide Behavior Summary

| Trigger | Sections Hidden | Hide Animation | Effect on Previously Visible Content |
|---------|----------------|---------------|--------------------------------------|
| User clears destination | Calendar, Date Details | **Instant** (no animation) | DOM elements removed. React state for these sections resets to `idle`. |
| User selects new destination | Date Details (Calendar stays visible, re-fetches) | **Instant** for Date Details | Date Details DOM removed. Calendar content swaps to skeleton (no animation on content swap). |
| User removes all queue items | Comparison | **Instant** (no animation) | Comparison DOM removed. Comparison result state resets to `idle`. |

### 8.2 Why No Fade-Out

Fade-out animations on section hiding would:
1. Show stale data during the fade-out duration (confusing)
2. Require managing `unmountOnExit` timing with the animation (complex)
3. Conflict with the "fresh start" semantics of changing upstream data

The instant removal communicates clearly: "This data is no longer relevant."

### 8.3 Content Replacement Within a Visible Section (No Section-Level Animation)

When a section stays visible but its content changes (e.g., calendar re-fetches for a new destination), there is **no section-level animation**. The content simply swaps:

- Old content → Skeleton (instant)
- Skeleton → New content (instant, when API responds)

The `<Fade>` animation only applies to the section's initial appearance (`visible: false → true`). It does not re-trigger when the section's internal content changes.

---

## 9. Interaction Blocking During Transitions

### 9.1 Rule: No Interaction Blocking During Fade-In

The 500ms fade-in animation does **not** block user interaction. Even while a section is fading in (opacity < 1), the user can:
- Click on skeleton elements (though nothing happens — skeletons are not interactive)
- Scroll the page
- Interact with sections above (Search, Calendar)
- Type in inputs

MUI's `<Fade>` does not set `pointer-events: none` during the transition by default, and we do not add it.

### 9.2 Rule: Loading State Blocks Duplicate Requests

While an API request is in-flight (section content is showing skeleton), the relevant trigger is debounced or disabled:
- Calendar skeleton: User cannot select dates (no calendar grid to click on)
- Date Detail skeletons: User can still change dates on the calendar (which cancels in-flight requests and starts new ones)
- Comparison skeleton: "Compare" button is disabled and remove buttons are disabled

### 9.3 Rule: The Search Input Is Never Disabled

Regardless of what state any section is in, the destination search input, origin airport input, and traveler count input are **always interactive**. The user can always go back and change their inputs.

---

## 10. Complete Transition Timeline Matrix

This matrix documents every possible state transition, what the user sees, and the timing.

| # | User Action | Immediate Visual (0ms) | Fade-In (0–500ms) | After Fade (500ms+) | API Response (variable) | Scroll |
|---|-------------|----------------------|-------------------|---------------------|------------------------|--------|
| 1 | **First page load** | Blank page | Search section fades in | Search section fully visible, inputs interactive | N/A | No (already at top) |
| 2 | **Select destination** | Dropdown closes, destination shown in input | Calendar section fades in with skeleton | Calendar skeleton fully opaque, pulsing | Skeleton → calendar grid (or error) | Yes → `#calendar` |
| 3 | **Select date range** | Calendar highlights selected range | Date Details section fades in with 3 skeleton cards | 3 skeleton cards fully opaque | Each card independently: skeleton → content | Yes → `#dateDetails` |
| 4 | **Add first item to queue** | Button → "Added!" (green, check icon) | Comparison section fades in with queue panel (1 item) | Queue panel visible, Compare button disabled | N/A (no API call) | Yes → `#comparison` |
| 5 | **Add 2nd+ item to queue** | Button → "Added!" (green, check icon) | N/A (Comparison already visible) | New item appears in queue panel | N/A | No (section already visible) |
| 6 | **Click "Compare"** | Button → "Comparing..." with spinner, disabled | N/A (section already visible) | Comparison table area shows skeleton | Skeleton → comparison table (or error) | No |
| 7 | **Clear destination** | Input empties | Calendar + Date Details instantly hidden (no fade) | Only Search section visible | N/A | No |
| 8 | **Select new destination** | Input shows new destination | Calendar skeleton appears (instant content swap, no section fade) | Calendar skeleton pulsing | Skeleton → new calendar data | No |
| 9 | **Select new date range** | Calendar highlights new range | Date Details skeleton appears (instant content swap, no section fade) | 3 skeleton cards pulsing | Each card independently: skeleton → content | No |
| 10 | **Remove all queue items** | Queue items removed one by one (or via Clear All) | Comparison section instantly hidden (no fade) | Section removed from DOM | N/A | No |

---

## 11. Implementation Reference: SectionContainer Component

### 11.1 Full Implementation Skeleton

```typescript
// frontend/src/components/layout/SectionContainer.tsx
'use client';

import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import type { SectionId } from '@/types/frontend';

export interface SectionContainerProps {
  sectionId: SectionId;
  visible: boolean;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export default function SectionContainer({
  sectionId,
  visible,
  title,
  subtitle,
  children,
}: SectionContainerProps): JSX.Element | null {
  // When not visible, render nothing.
  // The Fade component handles mountOnEnter/unmountOnExit,
  // but we also guard with a conditional for clarity.
  return (
    <Fade
      in={visible}
      timeout={{ enter: 500, exit: 0 }}
      appear={true}
      mountOnEnter
      unmountOnExit
    >
      <Box
        id={sectionId}
        component="section"
        sx={{ mb: 6 }}
      >
        {title && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h2">
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Box>
    </Fade>
  );
}
```

### 11.2 Key Implementation Notes

1. **`<Fade>` requires a single child that accepts `ref`**: The `<Box>` component satisfies this requirement (all MUI components forward refs).

2. **`timeout={{ enter: 500, exit: 0 }}`**: Asymmetric timing — 500ms fade-in, instant hide.

3. **`appear={true}`**: Ensures the fade animation plays even on the initial mount (important for the Search section, which is visible on page load).

4. **`mountOnEnter` + `unmountOnExit`**: Ensures hidden sections are not in the DOM, reducing memory usage and preventing accessibility tools from reading hidden content.

5. **`id={sectionId}`**: Provides the scroll anchor for `scrollIntoView()` calls.

6. **`component="section"`**: Uses semantic HTML `<section>` element for accessibility. Screen readers can navigate between sections.

7. **`mb: 6`**: 48px bottom margin between sections, providing consistent vertical rhythm.

### 11.3 HomePage Scroll Effect Hooks

```typescript
// Inside HomePage component body:

const prevShowCalendar = useRef(false);
const prevShowDateDetails = useRef(false);
const prevShowComparison = useRef(false);

// Scroll to calendar on first reveal
useEffect(() => {
  if (showCalendar && !prevShowCalendar.current) {
    scrollToSection('calendar');
  }
  prevShowCalendar.current = showCalendar;
}, [showCalendar]);

// Scroll to date details on first reveal
useEffect(() => {
  if (showDateDetails && !prevShowDateDetails.current) {
    scrollToSection('dateDetails');
  }
  prevShowDateDetails.current = showDateDetails;
}, [showDateDetails]);

// Scroll to comparison on first reveal (queue 0 → 1)
useEffect(() => {
  if (showComparison && !prevShowComparison.current) {
    scrollToSection('comparison');
  }
  prevShowComparison.current = showComparison;
}, [showComparison]);
```

---

## 12. Additional Edge Cases & Clarifications

### 12.1 Browser Back/Forward Button Behavior

Since WhenToGo is a single-page application with all state in memory (React `useState` and Context), browser navigation buttons have **no effect** on the progressive reveal state:

- **Back button**: Navigates away from the page entirely (to the browser's previous URL). If the user returns, all state resets (same as page refresh — see progressive-reveal spec §10.9).
- **Forward button**: N/A — there is no history entry to go forward to.
- **No `pushState` / `replaceState`**: The application does NOT manipulate browser history. There is no URL hash (`#calendar`, `#comparison`, etc.) that tracks which section is visible. The URL is always `/`.

### 12.2 Skeleton-to-Error Transition

When a section transitions from `loading` to `error` (API call fails):

- **No animation**: Same as skeleton-to-success (§5.6). The skeleton is immediately replaced by the `InlineError` component.
- **Height change**: The `InlineError` component is typically shorter than the skeleton. This causes a minor layout shift (acceptable — error states are exceptional). No special handling is needed.
- **Content below shifts up**: If sections below the error section exist, they shift up. This is normal browser reflow.

### 12.3 Skeleton-to-Empty Transition

When a section transitions from `loading` to `empty`:

- **No animation**: Same as skeleton-to-success. The skeleton is immediately replaced by the `EmptyState` component.
- **Height change**: Similar to error, the `EmptyState` is typically shorter than the skeleton. Minor layout shift is acceptable.

### 12.4 Multiple Concurrent Section Transitions

It is possible (though unlikely) for two sections to reveal simultaneously — for example, if the user adds a first queue item at the exact moment they also triggered a date range selection. In such a case:

- Both `<Fade>` components animate independently and concurrently. Both take 500ms.
- Scroll targets the **lower** of the two newly revealed sections (the `useEffect` hooks fire in order of declaration, so the last one wins for `scrollIntoView`).
- This is a theoretical edge case. In practice, transitions are sequential because each user action gates the next.

### 12.5 Initial Page Load Animation Sequence

On the very first page load (`/`):

| Time | What Renders |
|------|-------------|
| 0ms | React hydration begins. All state is at initial values. Only Section 1 (Destination Search) passes `visible={true}`. |
| ~16ms (first paint) | `<Fade appear={true} in={true}>` begins animating Section 1. Opacity starts at 0. |
| 0–500ms | Section 1 fades in (opacity 0 → 1). All inputs are interactive immediately (even at opacity < 1). |
| 500ms | Fade-in complete. Section 1 fully opaque. User sees search form. |

No other sections render until the user takes action. There is no "loading screen" or "splash" before the search section appears.

### 12.6 Window Resize During Fade-In

If the browser window is resized during a 500ms fade-in animation:

- MUI's `<Fade>` component handles resize gracefully — it only animates `opacity`, not dimensions.
- The section content reflows normally per CSS responsive rules.
- No special handling needed.

---

*End of Section Reveal Transitions, Animations, Scroll Behavior & Visual Progress Specification*
