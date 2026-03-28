# WhenToGo Frontend Spec — Destination Autocomplete Search Interaction

> Sub-specification: Complete behavior, debounce logic, result rendering, and all edge cases for the DestinationAutocomplete component.
> **Cross-references**: `docs/frontend/frontend-spec.md` §1 (types), `docs/frontend/frontend-spec-search-section.md` (layout), `frontend/src/types/api.ts` (DestinationResult)

---

## 1. Component Overview

**File**: `frontend/src/components/DestinationAutocomplete.tsx`
**Directive**: `'use client'`
**Purpose**: Provides a type-ahead search for travel destinations using MUI `Autocomplete` backed by `GET /api/v1/search/destinations?q={query}` via the centralized API service layer at `src/lib/api.ts`.

---

## 2. Props Interface

```typescript
// Defined in DestinationAutocomplete.tsx
import type { DestinationResult } from '@/types/api';

interface DestinationAutocompleteProps {
  /** Currently selected destination, or null if none selected */
  value: DestinationResult | null;
  /** Callback when user selects or clears a destination */
  onChange: (destination: DestinationResult | null) => void;
  /** External error message to display below the field (e.g., validation error from parent) */
  error?: string;
}
```

- **`value`**: Controlled value from parent (`SearchSection`). Determines the displayed chip/text in the input when a destination is selected.
- **`onChange`**: Called with the full `DestinationResult` object on selection, or `null` on clear.
- **`error`**: Optional string. When truthy, the `TextField` renders in error state (red border, red helperText).

---

## 3. Internal State

```typescript
// All state is local to DestinationAutocomplete.tsx
const [inputValue, setInputValue] = useState<string>('');
const [options, setOptions] = useState<DestinationResult[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [fetchError, setFetchError] = useState<string | undefined>(undefined);
const debounceRef = useRef<ReturnType<typeof setTimeout>>();
```

| State variable | Type | Initial value | Description |
|----------------|------|---------------|-------------|
| `inputValue` | `string` | `''` | Current text the user has typed into the autocomplete input |
| `options` | `DestinationResult[]` | `[]` | Destination results fetched from the API for the current query |
| `isLoading` | `boolean` | `false` | Whether an API request is in flight |
| `fetchError` | `string \| undefined` | `undefined` | Error message from a failed API call; takes priority over `props.error` |
| `debounceRef` | `React.MutableRefObject<ReturnType<typeof setTimeout> \| undefined>` | `undefined` | Stores the debounce timer ID for cleanup |

---

## 4. Debounce Mechanism

### 4.1 Constants

Import from `@/types/constants`:

```typescript
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';
// MIN_SEARCH_QUERY_LENGTH = 3
// SEARCH_DEBOUNCE_MS = 300
```

### 4.2 Implementation

```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout>>();

const handleInputChange = (newInputValue: string) => {
  setInputValue(newInputValue);

  // Clear any pending debounced call
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }

  // If input is shorter than minimum, clear options immediately — no API call
  if (newInputValue.length < MIN_SEARCH_QUERY_LENGTH) {
    setOptions([]);
    setFetchError(undefined);
    return;
  }

  // Schedule API call after debounce delay
  debounceRef.current = setTimeout(() => {
    fetchDestinations(newInputValue);
  }, SEARCH_DEBOUNCE_MS);
};
```

### 4.3 Debounce Lifecycle

```
User types "T"
  → inputValue = "T"
  → length < 3 → clear options, no API call

User types "To" (50ms later)
  → inputValue = "To"
  → length < 3 → clear options, no API call

User types "Tok" (80ms later)
  → inputValue = "Tok"
  → length >= 3 → schedule API call in 300ms (timer A)

User types "Toky" (150ms later, before 300ms elapsed)
  → inputValue = "Toky"
  → length >= 3 → cancel timer A, schedule new API call in 300ms (timer B)

300ms elapses after "Toky"
  → timer B fires → fetchDestinations("Toky")
  → API call: GET /api/v1/search/destinations?q=Toky
```

### 4.4 Cleanup on Unmount

```typescript
useEffect(() => {
  return () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };
}, []);
```

This ensures no stale timer fires after the component is unmounted.

### 4.5 No External Library

The debounce uses a raw `setTimeout`/`clearTimeout` pattern with `useRef`. Do NOT use lodash, use-debounce, or any other debounce library.

---

## 5. API Integration

### 5.1 Fetch Function

```typescript
import { api } from '@/lib/api';
import type { DestinationResult } from '@/types/api';

const fetchDestinations = async (query: string): Promise<void> => {
  setIsLoading(true);
  setFetchError(undefined);
  try {
    const response = await api.get<DestinationResult[]>(
      '/api/v1/search/destinations',
      { params: { q: query } }
    );
    setOptions(response.data);
  } catch (err: unknown) {
    setFetchError('Failed to search destinations. Please try again.');
    setOptions([]);
  } finally {
    setIsLoading(false);
  }
};
```

### 5.2 API Contract

| Aspect | Detail |
|--------|--------|
| **Method** | `GET` |
| **URL** | `/api/v1/search/destinations` |
| **Query parameter** | `q` — the search string (minimum 3 characters, enforced client-side) |
| **Success response** | `200` — `DestinationResult[]` (may be empty array `[]`) |
| **Error responses** | `400` (bad request), `500` (internal error), `504` (gateway timeout) |
| **Response shape** | Each item: `{ name, latitude, longitude, country, iata_code }` |

### 5.3 Error Handling

All error responses (network error, 400, 500, 504) are caught in the same `catch` block. The component does NOT distinguish between error types — it always shows the same user-facing message:

```
"Failed to search destinations. Please try again."
```

**Rationale**: The user's recovery action is the same regardless of error type — modify the query and try again. No toast, no auto-retry, no error codes shown to user.

### 5.4 Stale Response Prevention

If the user types a new query before the previous API call completes, the debounce mechanism cancels the previous timer and schedules a new one. However, a request already in-flight is NOT explicitly cancelled (no AbortController). Instead, the result is accepted — the MUI Autocomplete displays whatever `options` are set last.

**Why no AbortController**: The 300ms debounce makes concurrent requests unlikely. In the rare case of overlapping responses, the later response will overwrite `options`, which is acceptable since the dropdown options will update on the next render cycle.

---

## 6. MUI Autocomplete Configuration

### 6.1 Full JSX with Annotations

```tsx
<Autocomplete<DestinationResult, false, false, false>
  // ── Type parameters ──
  // <DestinationResult, Multiple=false, DisableClearable=false, FreeSolo=false>
  // Single selection, clearable, no free-text entry

  fullWidth

  // ── Options ──
  options={options}
  getOptionLabel={(option) => `${option.name}, ${option.country}`}
  isOptionEqualToValue={(option, value) =>
    option.name === value.name && option.country === value.country
  }
  filterOptions={(x) => x}
  // filterOptions identity function: DISABLES client-side filtering.
  // All filtering is server-side via the ?q= parameter.

  // ── Loading ──
  loading={isLoading}

  // ── Controlled value ──
  value={value}                                // from props (DestinationResult | null)
  onChange={(_event, newValue) => {
    onChange(newValue);                         // propagate to parent
  }}

  // ── Input text ──
  inputValue={inputValue}
  onInputChange={(_event, newInputValue, reason) => {
    if (reason === 'input') {
      handleInputChange(newInputValue);        // user typed → debounce logic
    }
    if (reason === 'clear') {
      setInputValue('');                       // user clicked X → clear input
      setOptions([]);
      setFetchError(undefined);
    }
    // reason === 'reset' is ignored — happens on selection, MUI handles it
  }}

  // ── Empty states ──
  noOptionsText={
    inputValue.length < MIN_SEARCH_QUERY_LENGTH
      ? 'Type at least 3 characters'
      : 'No destinations found'
  }

  // ── Custom rendering ──
  renderInput={(params) => (/* see §6.2 */)}
  renderOption={(props, option) => (/* see §6.3 */)}
/>
```

### 6.2 renderInput — The Text Field

```tsx
renderInput={(params) => (
  <TextField
    {...params}
    label="Destination"
    placeholder="e.g. Tokyo, Paris, New York"
    error={!!fetchError || !!error}
    helperText={fetchError || error || ' '}
    slotProps={{
      input: {
        ...params.InputProps,
        endAdornment: (
          <>
            {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
            {params.InputProps.endAdornment}
          </>
        ),
      },
    }}
  />
)}
```

**Key details**:

| Aspect | Value | Notes |
|--------|-------|-------|
| `label` | `"Destination"` | Rendered as `<label>` element above the input |
| `placeholder` | `"e.g. Tokyo, Paris, New York"` | Visible when input is empty and not focused |
| `error` | `!!fetchError \|\| !!error` | Red border + red helperText when either internal or external error exists |
| `helperText` | `fetchError \|\| error \|\| ' '` | **Always rendered** — single space `' '` when no error, prevents layout shift. `fetchError` (internal API error) takes priority over `error` (external prop). |
| Loading spinner | `<CircularProgress color="inherit" size={20} />` | 20px spinner inside the input's end adornment, rendered BEFORE MUI's default endAdornment (which includes the clear X and dropdown arrow) |
| `slotProps.input` | Spreads `params.InputProps` first | Preserves MUI Autocomplete's ref, className, startAdornment, etc. |

### 6.3 renderOption — Dropdown Item Rendering

```tsx
renderOption={(props, option) => {
  // Extract key from props to avoid React warning about key in spread
  const { key, ...restProps } = props;
  return (
    <li key={`${option.name}-${option.iata_code ?? option.country}`} {...restProps}>
      <Box>
        <Typography variant="body1">
          {option.name}, {option.country}
        </Typography>
        {option.iata_code && (
          <Typography variant="caption" color="text.secondary">
            Airport: {option.iata_code}
          </Typography>
        )}
      </Box>
    </li>
  );
}}
```

**Each dropdown item renders**:

```
┌────────────────────────────────────────┐
│ Tokyo, Japan                            │  ← body1 (16px, primary color)
│ Airport: TYO                            │  ← caption (12px, secondary color)
├────────────────────────────────────────┤
│ Toronto, Canada                         │
│ Airport: YYZ                            │
├────────────────────────────────────────┤
│ Tulum, Mexico                           │  ← no iata_code → no "Airport:" line
│                                         │
└────────────────────────────────────────┘
```

**Rendering rules**:

| Aspect | Rule |
|--------|------|
| **Primary line** | Always shown: `"{name}, {country}"` using `Typography variant="body1"` |
| **Secondary line** | Shown ONLY when `option.iata_code` is not `null`: `"Airport: {iata_code}"` using `Typography variant="caption" color="text.secondary"` |
| **Key** | `"${option.name}-${option.iata_code ?? option.country}"` — unique enough for the result set from a single query |
| **Hover style** | MUI Autocomplete default highlight (background color on hover/focus via keyboard). No custom styles needed. |
| **Click behavior** | Selecting an option calls `onChange(newValue)` which propagates the full `DestinationResult` to the parent |

### 6.4 MUI Autocomplete Behavior Defaults (DO NOT override)

These behaviors come from MUI `Autocomplete` out-of-the-box and should NOT be customized:

| Feature | Default Behavior |
|---------|-----------------|
| **Clear button (X)** | Appears when a value is selected. Clicking it calls `onChange(null)` and triggers `onInputChange` with `reason === 'clear'` |
| **Dropdown arrow** | Toggle button to open/close the dropdown list |
| **Keyboard navigation** | Arrow keys to navigate options, Enter to select, Escape to close dropdown |
| **Open on focus** | Dropdown opens when input receives focus (if options exist) |
| **Close on select** | Dropdown closes after the user selects an option |
| **ARIA roles** | `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-activedescendant` — all handled by MUI |

---

## 7. State Machine — All UI States

The autocomplete has 6 distinct visual states:

### 7.1 State: Idle (Initial)

**Condition**: Component just mounted, no user interaction.

```
┌──────────────────────────────────┐
│ Destination                       │  ← label above
│ e.g. Tokyo, Paris, New York      │  ← placeholder text (grey)
│                                   │
└──────────────────────────────────┘
  (space for helperText)               ← ' ' (invisible spacer)
```

- `inputValue` = `''`
- `options` = `[]`
- `isLoading` = `false`
- `fetchError` = `undefined`
- No dropdown shown

### 7.2 State: Typing (Below Minimum Characters)

**Condition**: User has typed 1 or 2 characters (less than `MIN_SEARCH_QUERY_LENGTH`).

```
┌──────────────────────────────────┐
│ Destination                       │
│ To                                │  ← user's text
│                                   │  ← dropdown MAY open (MUI default)
└──────────────────────────────────┘
  (space for helperText)
  ┌────────────────────────────────┐
  │ Type at least 3 characters     │  ← noOptionsText
  └────────────────────────────────┘
```

- `options` = `[]` (cleared immediately when length < 3)
- `isLoading` = `false`
- MUI shows `noOptionsText` because `options` is empty
- The dropdown displays: `"Type at least 3 characters"`

### 7.3 State: Loading

**Condition**: User typed ≥3 characters, debounce timer has fired, API request in-flight.

```
┌──────────────────────────────────┐
│ Destination                       │
│ Tokyo                         ⟳  │  ← CircularProgress spinner (20px)
│                                   │
└──────────────────────────────────┘
  (space for helperText)
  ┌────────────────────────────────┐
  │ Loading…                       │  ← MUI default loading text
  └────────────────────────────────┘
```

- `isLoading` = `true`
- `loading={true}` on Autocomplete triggers MUI's built-in `"Loading…"` text in the dropdown
- `CircularProgress` (20px, `color="inherit"`) appears inside the input field's end adornment area
- Previous `options` are replaced with `"Loading…"` text in the dropdown

### 7.4 State: Success (Results Found)

**Condition**: API returned a non-empty array.

```
┌──────────────────────────────────┐
│ Destination                       │
│ Tokyo                          ▾ │
│                                   │
└──────────────────────────────────┘
  (space for helperText)
  ┌────────────────────────────────┐
  │ Tokyo, Japan                   │  ← option 1
  │ Airport: TYO                   │
  ├────────────────────────────────┤
  │ Toronto, Canada                │  ← option 2
  │ Airport: YYZ                   │
  └────────────────────────────────┘
```

- `isLoading` = `false`
- `options` = `[...DestinationResult items]`
- Dropdown shows all options, each rendered by `renderOption`
- No maximum on displayed options (typically 2–10 results from Amadeus)
- Dropdown is scrollable if it exceeds MUI's default max height (~40vh)

### 7.5 State: Success (No Results)

**Condition**: API returned an empty array `[]`.

```
┌──────────────────────────────────┐
│ Destination                       │
│ Xyzabc                        ▾ │
│                                   │
└──────────────────────────────────┘
  (space for helperText)
  ┌────────────────────────────────┐
  │ No destinations found          │  ← noOptionsText
  └────────────────────────────────┘
```

- `options` = `[]`
- `isLoading` = `false`
- `inputValue.length >= 3` → `noOptionsText = "No destinations found"`
- User recovery: modify the query text to trigger a new search

### 7.6 State: Error

**Condition**: API call threw an error (network failure, 400, 500, 504).

```
┌──────────────────────────────────┐
│ Destination                       │  ← label in red
│ Tokyo                          ▾ │  ← border in red
│                                   │
└──────────────────────────────────┘
  Failed to search destinations.    │  ← helperText in red
  Please try again.                 │
  ┌────────────────────────────────┐
  │ No destinations found          │  ← options cleared to []
  └────────────────────────────────┘
```

- `fetchError` = `"Failed to search destinations. Please try again."`
- `options` = `[]`
- `isLoading` = `false`
- `error={true}` on TextField (red border, red label, red helperText)
- No separate "Retry" button — user retries by modifying the input text (which triggers a new debounced search)
- `fetchError` is cleared on the next API call (see `fetchDestinations`: `setFetchError(undefined)` at start)

### 7.7 State: Selected

**Condition**: User has clicked/selected a destination from the dropdown.

```
┌──────────────────────────────────┐
│ Destination                       │
│ Tokyo, Japan                  ✕  │  ← selected value displayed, clear button (X)
│                                   │
└──────────────────────────────────┘
  (space for helperText)
```

- `value` = `{ name: "Tokyo", latitude: 35.6762, longitude: 139.6503, country: "Japan", iata_code: "TYO" }`
- The display text is `getOptionLabel(value)` → `"Tokyo, Japan"`
- Clear button (✕) appears at the right side of the input (MUI default `disableClearable=false`)
- Dropdown is closed
- `fetchError` is NOT cleared on selection — only on next API call
- **Side effect**: Parent `SearchSection` receives the full `DestinationResult` via `onChange`, stores it in `selectedDestination` state, which triggers the Calendar section to reveal

---

## 8. Interaction Flow — Step by Step

### 8.1 Happy Path: User Searches and Selects

```
1. Page loads → DestinationAutocomplete renders in Idle state
2. User clicks the Destination input → focus, no dropdown (options empty)
3. User types "T" → inputValue="T", length < 3 → options cleared, dropdown shows "Type at least 3 characters"
4. User types "o" → inputValue="To", length < 3 → same as above
5. User types "k" → inputValue="Tok", length >= 3 → debounce timer starts (300ms)
6. 300ms elapses → fetchDestinations("Tok") fires
   a. setIsLoading(true) → spinner appears, dropdown shows "Loading…"
   b. API responds 200 with [{ name: "Tokyo", country: "Japan", ... }, { name: "Tokushima", ... }]
   c. setOptions(response.data) → dropdown shows 2 results
   d. setIsLoading(false) → spinner disappears
7. User clicks "Tokyo, Japan" in dropdown
   a. MUI calls onChange(_, newValue) where newValue is the DestinationResult for Tokyo
   b. Component calls props.onChange(newValue) → parent receives DestinationResult
   c. MUI sets display text to "Tokyo, Japan" (via getOptionLabel)
   d. Dropdown closes
   e. Calendar section reveals below (handled by parent)
```

### 8.2 User Changes Selection

```
1. User currently has "Tokyo, Japan" selected
2. User clicks the clear button (✕)
   a. MUI calls onChange(_, null) → props.onChange(null)
   b. MUI calls onInputChange(_, '', 'clear') → setInputValue(''), setOptions([])
   c. Parent sets selectedDestination to null → Calendar section hides
3. User types a new query → same debounce flow as 8.1
```

### 8.3 User Types Over a Selection

```
1. User currently has "Tokyo, Japan" selected
2. User clicks into the input and starts typing "Par"
   a. MUI fires onInputChange with reason='input'
   b. Previous selection is cleared (MUI behavior when user edits the controlled Autocomplete input)
   c. onChange(_, null) fires → parent receives null
   d. inputValue="Par" → debounce starts for new query
```

### 8.4 User Backspaces Below Minimum

```
1. User has typed "Tok" and results are showing
2. User presses backspace → inputValue="To"
   a. length < 3 → clearTimeout(debounceRef), setOptions([])
   b. Dropdown shows "Type at least 3 characters"
3. User presses backspace again → inputValue="T"
   a. Same as above
4. User presses backspace again → inputValue=""
   a. Same as above
```

### 8.5 Rapid Typing (Debounce Cancellation)

```
1. User types "T-o-k-y-o" rapidly (each character within 300ms of the previous)
   - "T" → length < 3, no timer
   - "To" → length < 3, no timer
   - "Tok" → length >= 3, timer A starts (300ms)
   - "Toky" (typed at 200ms after "Tok") → cancel timer A, timer B starts (300ms)
   - "Tokyo" (typed at 150ms after "Toky") → cancel timer B, timer C starts (300ms)
2. 300ms after "Tokyo" → timer C fires → fetchDestinations("Tokyo")
3. Only ONE API call is made (for "Tokyo"), not three
```

---

## 9. Error Recovery Flow

### 9.1 API Failure and Retry via Re-typing

```
1. User types "Tok" → debounce fires → API call fails (500)
2. fetchError = "Failed to search destinations. Please try again."
3. TextField shows red border, red helperText
4. options = [] → dropdown shows "No destinations found"
5. User backspaces to "To" (length < 3) → fetchError cleared, options cleared
6. User types "k" again → "Tok" → debounce fires → new API call
   a. On entry to fetchDestinations: setFetchError(undefined) clears the error
   b. If API succeeds this time → options populate, error gone
   c. If API fails again → same error flow repeats
```

### 9.2 Error Clears When User Modifies Input

`fetchError` is cleared in two places:
1. **On new API call**: `fetchDestinations` sets `setFetchError(undefined)` at the start
2. **When input drops below 3 chars**: `handleInputChange` sets `setFetchError(undefined)` when `length < MIN_SEARCH_QUERY_LENGTH`

`fetchError` is NOT cleared on:
- Selection (reason === 'reset')
- Dropdown open/close

---

## 10. Import Map

```typescript
// DestinationAutocomplete.tsx — complete import list

'use client';

import { useState, useRef, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';
```

---

## 11. Complete Component Skeleton

This is the full component structure Ralph Loop should implement. All logic is specified; only the exact arrangement into a `function` body remains.

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/api';
import type { DestinationResult } from '@/types/api';
import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '@/types/constants';

interface DestinationAutocompleteProps {
  value: DestinationResult | null;
  onChange: (destination: DestinationResult | null) => void;
  error?: string;
}

export function DestinationAutocomplete({ value, onChange, error }: DestinationAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<DestinationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchDestinations = async (query: string): Promise<void> => {
    setIsLoading(true);
    setFetchError(undefined);
    try {
      const response = await api.get<DestinationResult[]>(
        '/api/v1/search/destinations',
        { params: { q: query } }
      );
      setOptions(response.data);
    } catch {
      setFetchError('Failed to search destinations. Please try again.');
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (newInputValue: string) => {
    setInputValue(newInputValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newInputValue.length < MIN_SEARCH_QUERY_LENGTH) {
      setOptions([]);
      setFetchError(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchDestinations(newInputValue);
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <Autocomplete<DestinationResult, false, false, false>
      fullWidth
      options={options}
      getOptionLabel={(opt) => `${opt.name}, ${opt.country}`}
      isOptionEqualToValue={(opt, val) =>
        opt.name === val.name && opt.country === val.country
      }
      filterOptions={(x) => x}
      loading={isLoading}
      value={value}
      onChange={(_e, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_e, newInput, reason) => {
        if (reason === 'input') handleInputChange(newInput);
        if (reason === 'clear') {
          setInputValue('');
          setOptions([]);
          setFetchError(undefined);
        }
      }}
      noOptionsText={
        inputValue.length < MIN_SEARCH_QUERY_LENGTH
          ? 'Type at least 3 characters'
          : 'No destinations found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Destination"
          placeholder="e.g. Tokyo, Paris, New York"
          error={!!fetchError || !!error}
          helperText={fetchError || error || ' '}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...restProps } = props;
        return (
          <li key={`${option.name}-${option.iata_code ?? option.country}`} {...restProps}>
            <Box>
              <Typography variant="body1">
                {option.name}, {option.country}
              </Typography>
              {option.iata_code && (
                <Typography variant="caption" color="text.secondary">
                  Airport: {option.iata_code}
                </Typography>
              )}
            </Box>
          </li>
        );
      }}
    />
  );
}
```

---

## 12. Edge Cases

### 12.1 Destination With No IATA Code

- `iata_code` is `string | null` in `DestinationResult`
- When `iata_code` is `null`, the "Airport: ..." caption line is NOT rendered in the dropdown
- The destination CAN still be selected — downstream flight lookup will use the destination `iata_code` from `DestinationResult`, but if it's null, the parent must handle that (e.g., user must enter it manually or the flight lookup is skipped)

### 12.2 API Returns Empty Array for Valid Query

- `options` is set to `[]`
- Dropdown shows `noOptionsText` = `"No destinations found"`
- NOT an error state — `fetchError` remains `undefined`, no red styling

### 12.3 Very Long Destination Names

- MUI Autocomplete and TextField handle text overflow with CSS `text-overflow: ellipsis` by default
- Dropdown items (`renderOption`) use `Box` which wraps text naturally
- No explicit truncation or maxWidth is needed

### 12.4 Special Characters in Query

- Characters like accents (é, ñ, ü), hyphens, apostrophes are passed through to the API as-is
- URL encoding is handled by Axios's `params` serialization (e.g., `q=São+Paulo`)
- No client-side sanitization or escaping is needed

### 12.5 Duplicate Destination Names

- It is possible for the API to return two destinations with the same `name` but different `country` values (e.g., "Portland, USA" and "Portland, UK")
- `isOptionEqualToValue` checks BOTH `name` AND `country`, so these are treated as distinct options
- `renderOption` key includes `iata_code ?? country` to ensure uniqueness

### 12.6 Component Re-renders Without User Input

- The component is controlled (`value` comes from props)
- If the parent re-renders and passes the same `value`, MUI Autocomplete handles this without side effects
- The debounce timer is not affected by re-renders (stored in `useRef`)

### 12.7 User Selects Same Destination Twice

- User selects "Tokyo, Japan" → clears → selects "Tokyo, Japan" again
- `onChange` fires both times with the same object; parent receives `null` then the same `DestinationResult`
- No deduplication logic in this component — that's the parent's concern (if needed)

### 12.8 Network Timeout (504 Gateway Timeout)

- Backend returns `504` with `{ error: "gateway_timeout", message: "External API request timed out after 10 seconds" }`
- Axios throws an error → caught in catch block
- Same `fetchError` message shown: `"Failed to search destinations. Please try again."`
- The backend's `message` field is NOT surfaced to the user (for consistency)

### 12.9 Concurrent Requests (Race Condition)

- User types "Tok" → timer fires → request A in-flight
- User quickly clears and types "Par" → timer fires → request B in-flight
- Request B completes first → `options` set to Paris results
- Request A completes second → `options` overwritten with Tokyo results (STALE)
- **This is a known, accepted edge case** — the debounce delay (300ms) makes it unlikely. If this becomes a problem in practice, add an AbortController; but for MVP, this is acceptable.

---

## 13. Accessibility (Best-Effort)

| Feature | How it's handled |
|---------|-----------------|
| **Label** | `label="Destination"` on TextField — renders `<label>` |
| **Placeholder** | `placeholder` visible when empty |
| **Combobox role** | MUI Autocomplete sets `role="combobox"` on the input |
| **Listbox role** | MUI sets `role="listbox"` on the dropdown |
| **aria-expanded** | MUI toggles based on dropdown open state |
| **aria-autocomplete** | Set to `"list"` by MUI |
| **aria-activedescendant** | MUI manages focus tracking in the listbox |
| **aria-describedby** | `helperText` is linked via `aria-describedby` (MUI default) |
| **aria-invalid** | Set to `"true"` when `error={true}` on TextField (MUI default) |
| **Keyboard** | Arrow keys navigate options, Enter selects, Escape closes |
| **Screen reader** | Loading state announced via `loading` prop and `loadingText` (MUI default: "Loading…") |

No additional ARIA attributes are needed. MUI provides comprehensive accessibility out-of-the-box.

---

## 14. Parent Integration (SearchSection)

The `SearchSection` component at `frontend/src/components/SearchSection.tsx` integrates the `DestinationAutocomplete` as follows:

```tsx
// Inside SearchSection.tsx
const [selectedDestination, setSelectedDestination] = useState<DestinationResult | null>(null);

const handleDestinationChange = (destination: DestinationResult | null) => {
  setSelectedDestination(destination);
  // When destination changes, downstream sections should reset:
  // - Calendar data clears
  // - Date range resets
  // - Date details reset
  // (handled by parent page state management, not by this component)
};

// In JSX:
<DestinationAutocomplete
  value={selectedDestination}
  onChange={handleDestinationChange}
  error={undefined}  // No external validation errors for this field
/>
```

**Progressive reveal trigger**: When `selectedDestination` changes from `null` to a `DestinationResult`, the Calendar section becomes visible. When it changes back to `null` (clear), the Calendar section and all downstream sections hide.

---

## 15. Testing Guidance (for Ralph Loop reference)

While not required to implement tests, these are the key behaviors to verify if tests are written:

1. **Debounce**: Typing 3+ characters should NOT immediately call the API; it should wait 300ms
2. **Minimum characters**: Typing 1-2 characters should NOT trigger an API call
3. **API success**: Results should populate the dropdown options
4. **API error**: helperText should show error message in red
5. **Selection**: Selecting an option should call `onChange` with the full `DestinationResult`
6. **Clear**: Clicking X should call `onChange(null)` and clear `inputValue`
7. **Rapid typing**: Only the final query (after 300ms idle) should trigger an API call
