# WhenToGo Frontend Spec — Search Section Layout

> Sub-specification: Wireframe-level layout for the Search section of the single-page progressive flow.

---

## 1. Section Overview

The **Search section** is the topmost interactive section on the root route (`/`). It is always visible on page load. Its purpose is to collect four inputs from the user:

1. **Destination** — autocomplete city search
2. **Origin airport** — IATA code text input
3. **Traveler count** — numeric stepper
4. (Implicit: the selected destination's `latitude`, `longitude`, `iata_code` are stored in state but not rendered as fields)

Upon selecting a destination, the next section (Calendar / Date Selection) is progressively revealed below.

---

## 2. Page-Level Container

```
<Box component="main">                           // full viewport width
  <Container maxWidth="lg">                       // MUI Container, 1200px max
    <SearchSection />                             // THIS SPEC
    <CalendarSection />                           // revealed after destination selected
    <DateOptionBuilderSection />                  // revealed after date range selected
    <ComparisonQueueSection />                    // revealed after ≥1 option added
    <ComparisonResultsSection />                  // revealed after compare triggered
  </Container>
</Box>
```

- The `<Container maxWidth="lg">` centers all content with default MUI horizontal padding (24px at `lg` breakpoint).
- Each section is a direct child of the Container, stacked vertically with `marginBottom: 6` (48px) between sections.

---

## 3. SearchSection Component

### 3.1 File Location

```
frontend/src/components/SearchSection.tsx
```

Directive: `'use client'` — this component manages interactive state (autocomplete, inputs).

### 3.2 Component Hierarchy (ASCII wireframe)

```
┌─────────────────────────────────── Container maxWidth="lg" ───────────────────────────────────┐
│                                                                                                │
│  ┌──────────────────────────────── SearchSection ────────────────────────────────────────────┐  │
│  │                                                                                          │  │
│  │  ┌── Typography variant="h3" ──────────────────────────────────────────────────────────┐  │  │
│  │  │  "WhenToGo"                                                                        │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│  │  ┌── Typography variant="h6" color="text.secondary" ──────────────────────────────────┐  │  │
│  │  │  "Find the best dates for your next trip"                                          │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│  │                                                                                          │  │
│  │  mt: 4 (32px)                                                                            │  │
│  │                                                                                          │  │
│  │  ┌─── Paper elevation={2} sx={{ p: 4 }} ─────────────────────────────────────────────┐  │  │
│  │  │                                                                                    │  │  │
│  │  │  ┌── Grid2 container spacing={3} ───────────────────────────────────────────────┐  │  │  │
│  │  │  │                                                                              │  │  │  │
│  │  │  │  ┌─ Grid2 size={{ xs:12, md:5 }} ──┐  ┌─ Grid2 size={{ xs:12, md:4 }} ──┐  │  │  │  │
│  │  │  │  │                                  │  │                                  │  │  │  │  │
│  │  │  │  │  DestinationAutocomplete         │  │  OriginAirportInput              │  │  │  │  │
│  │  │  │  │  (Autocomplete + TextField)      │  │  (TextField)                     │  │  │  │  │
│  │  │  │  │                                  │  │                                  │  │  │  │  │
│  │  │  │  └──────────────────────────────────┘  └──────────────────────────────────┘  │  │  │  │
│  │  │  │                                                                              │  │  │  │
│  │  │  │  ┌─ Grid2 size={{ xs:12, md:3 }} ──┐                                        │  │  │  │
│  │  │  │  │                                  │                                        │  │  │  │
│  │  │  │  │  TravelerCountInput              │                                        │  │  │  │
│  │  │  │  │  (TextField type="number")       │                                        │  │  │  │
│  │  │  │  │                                  │                                        │  │  │  │
│  │  │  │  └──────────────────────────────────┘                                        │  │  │  │
│  │  │  │                                                                              │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                                    │  │  │
│  │  └────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 MUI Component Structure (JSX skeleton)

```tsx
<Box sx={{ mb: 6, pt: 4 }}>
  {/* Page title */}
  <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
    WhenToGo
  </Typography>
  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
    Find the best dates for your next trip
  </Typography>

  {/* Search card */}
  <Paper elevation={2} sx={{ p: 4 }}>
    <Grid2 container spacing={3}>
      {/* Destination autocomplete — 5/12 width on md+ */}
      <Grid2 size={{ xs: 12, md: 5 }}>
        <DestinationAutocomplete
          value={selectedDestination}
          onChange={handleDestinationChange}
          error={destinationError}
        />
      </Grid2>

      {/* Origin airport — 4/12 width on md+ */}
      <Grid2 size={{ xs: 12, md: 4 }}>
        <OriginAirportInput
          value={originAirport}
          onChange={handleOriginChange}
          error={originError}
        />
      </Grid2>

      {/* Traveler count — 3/12 width on md+ */}
      <Grid2 size={{ xs: 12, md: 3 }}>
        <TravelerCountInput
          value={travelerCount}
          onChange={handleTravelerCountChange}
        />
      </Grid2>
    </Grid2>
  </Paper>
</Box>
```

---

## 4. Individual Input Components

### 4.1 DestinationAutocomplete

**File**: `frontend/src/components/DestinationAutocomplete.tsx`
**Directive**: `'use client'`

#### MUI Components Used

- `Autocomplete` from `@mui/material/Autocomplete`
- `TextField` from `@mui/material/TextField`
- `CircularProgress` from `@mui/material/CircularProgress` (loading indicator inside input)

#### Layout Details

```tsx
<Autocomplete<DestinationResult, false, false, false>
  fullWidth
  options={options}                          // DestinationResult[]
  getOptionLabel={(opt) => `${opt.name}, ${opt.country}`}
  isOptionEqualToValue={(opt, val) => opt.name === val.name && opt.country === val.country}
  filterOptions={(x) => x}                  // disable client-side filtering; server-side only
  loading={isLoading}
  value={value}                             // DestinationResult | null
  onChange={(_e, newValue) => onChange(newValue)}
  onInputChange={(_e, newInput, reason) => {
    if (reason === 'input') handleInputChange(newInput);
  }}
  noOptionsText={inputValue.length < 3 ? "Type at least 3 characters" : "No destinations found"}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Destination"
      placeholder="e.g. Tokyo, Paris, New York"
      error={!!error}
      helperText={error || ' '}            // always render to prevent layout shift; space char for empty
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
  renderOption={(props, option) => (
    <li {...props} key={`${option.name}-${option.iata_code}`}>
      <Box>
        <Typography variant="body1">{option.name}, {option.country}</Typography>
        {option.iata_code && (
          <Typography variant="caption" color="text.secondary">
            Airport: {option.iata_code}
          </Typography>
        )}
      </Box>
    </li>
  )}
/>
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Debounce** | 300ms debounce on input change before calling API |
| **Min chars** | API call fires only when `inputValue.length >= 3` |
| **API endpoint** | `GET /api/v1/search/destinations?q={inputValue}` |
| **Response type** | `DestinationResult[]` from `frontend/src/types/api.ts` |
| **Loading state** | `CircularProgress` (size 20px) replaces the dropdown arrow while loading |
| **Empty state** | If < 3 chars typed: "Type at least 3 characters". If ≥ 3 chars and no results: "No destinations found" |
| **Error state** | If API fails: show `helperText` in red below field: `"Failed to search destinations. Please try again."` |
| **Selection effect** | On selection, store the full `DestinationResult` object in parent state; this provides `latitude`, `longitude`, `iata_code` for downstream API calls |
| **Clear** | MUI Autocomplete default clear button (X) clears the field and resets `selectedDestination` to `null` |

#### Props Interface

```ts
interface DestinationAutocompleteProps {
  value: DestinationResult | null;
  onChange: (destination: DestinationResult | null) => void;
  error?: string;
}
```

---

### 4.2 OriginAirportInput

**File**: `frontend/src/components/OriginAirportInput.tsx`
**Directive**: `'use client'`

#### MUI Components Used

- `TextField` from `@mui/material/TextField`

#### Layout Details

```tsx
<TextField
  fullWidth
  label="Origin Airport (IATA)"
  placeholder="e.g. ICN, LAX, JFK"
  value={value}
  onChange={(e) => onChange(e.target.value.toUpperCase())}
  error={!!error}
  helperText={error || ' '}
  slotProps={{
    htmlInput: {
      maxLength: 3,
      style: { textTransform: 'uppercase' },
    },
  }}
/>
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Max length** | 3 characters (HTML `maxLength` attribute) |
| **Transform** | Input is uppercased on every change (`toUpperCase()`) |
| **Validation** | Validated on blur: must be exactly 3 uppercase alphabetic characters (`/^[A-Z]{3}$/`). If invalid: `helperText = "Enter a 3-letter IATA airport code"` |
| **No API call** | This is a plain text field; no autocomplete/search |
| **Default value** | Empty string `""` |

#### Props Interface

```ts
interface OriginAirportInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}
```

---

### 4.3 TravelerCountInput

**File**: `frontend/src/components/TravelerCountInput.tsx`
**Directive**: `'use client'`

#### MUI Components Used

- `TextField` from `@mui/material/TextField`

#### Layout Details

```tsx
<TextField
  fullWidth
  label="Travelers"
  type="number"
  value={value}
  onChange={(e) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) onChange(num);
  }}
  slotProps={{
    htmlInput: {
      min: 1,
      max: 100,
      step: 1,
    },
  }}
  helperText={`${Math.ceil(value / 2)} room${Math.ceil(value / 2) !== 1 ? 's' : ''} needed`}
/>
```

#### Behavior

| Aspect | Detail |
|--------|--------|
| **Type** | `number` input with spinner arrows |
| **Range** | Min: 1, Max: 100. Values outside range are clamped. |
| **Default value** | `1` |
| **helperText** | Always shows rooms needed: `"X room(s) needed"` using `Math.ceil(value / 2)` |
| **Integer only** | Only integer values accepted; decimals ignored |

#### Props Interface

```ts
interface TravelerCountInputProps {
  value: number;
  onChange: (value: number) => void;
}
```

---

## 5. Grid Layout Breakdown

### 5.1 Desktop (md and above: ≥900px)

The three inputs sit in a **single row** using MUI `Grid2`:

| Column | Grid `size.md` | Width fraction | Content |
|--------|---------------|----------------|---------|
| 1 | 5 | 5/12 ≈ 41.7% | Destination autocomplete |
| 2 | 4 | 4/12 ≈ 33.3% | Origin airport input |
| 3 | 3 | 3/12 = 25% | Traveler count input |

Total: 5 + 4 + 3 = 12 columns (full row).

**Spacing**: `spacing={3}` = 24px gap between grid items (MUI default spacing unit = 8px).

### 5.2 Below md (<900px)

Each input takes `xs: 12` (full width), stacking vertically. Three rows:

```
Row 1: Destination autocomplete  (full width)
Row 2: Origin airport input      (full width)
Row 3: Traveler count input      (full width)
```

Gap between rows: 24px (from `spacing={3}`).

> **Note**: This is a desktop-first layout. No special mobile/tablet-specific styling is required. The `xs: 12` simply ensures inputs don't overflow on smaller viewports.

---

## 6. Spacing and Sizing Summary

| Element | Property | Value | Pixels (at 8px unit) |
|---------|----------|-------|---------------------|
| SearchSection outer Box | `pt` | 4 | 32px top padding |
| SearchSection outer Box | `mb` | 6 | 48px bottom margin (space to next section) |
| Subtitle to Paper gap | `mb` on subtitle Typography | 4 | 32px |
| Paper internal padding | `p` | 4 | 32px all sides |
| Paper elevation | `elevation` | 2 | subtle shadow |
| Grid spacing | `spacing` | 3 | 24px between grid items |
| TextField helperText | always rendered | `' '` or actual text | prevents layout shift (~20px reserved) |

---

## 7. State Managed by SearchSection

The `SearchSection` component manages the following local state, which is lifted to a parent-level state holder (either a Context or the page component):

```ts
// State shape managed at page/context level
interface SearchState {
  selectedDestination: DestinationResult | null;  // full object from API
  originAirport: string;                          // 3-letter IATA code
  travelerCount: number;                          // 1–100, default 1
}
```

**Progressive reveal trigger**: The Calendar section becomes visible when `selectedDestination !== null`.

---

## 8. Error Handling

| Error scenario | Display location | Message text | Retry mechanism |
|----------------|-----------------|--------------|-----------------|
| Destination API call fails (network/500/504) | `helperText` under Destination field (red) | `"Failed to search destinations. Please try again."` | User re-types to trigger new search |
| Destination API returns empty array | Autocomplete dropdown `noOptionsText` | `"No destinations found"` | User modifies query |
| Origin airport invalid format | `helperText` under Origin field (red) | `"Enter a 3-letter IATA airport code"` | User corrects input |
| Traveler count out of range | Input HTML constraint prevents entry | N/A (clamped to 1–100) | N/A |

No toast notifications. No auto-retry. All errors are inline.

---

## 9. Accessibility Notes (Best-Effort)

- All `TextField` components include `label` prop (renders as `<label>` via MUI)
- Autocomplete has built-in ARIA roles (`role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`)
- `helperText` is associated with its input via `aria-describedby` (MUI default behavior)
- Focus order follows DOM order: Destination → Origin → Traveler count
- Error states use MUI's `error` prop which sets `aria-invalid="true"`

---

## 10. Visual Reference (Approximate Pixel Layout at 1200px viewport)

```
├──── 24px padding ────┤
│                      │
│  WhenToGo           (h3, ~36px font, bold, left-aligned)
│  Find the best...   (h6, ~20px font, secondary color)
│                      │
│  ┌─ 32px gap ────────────────────────────────────────────────────────────────┐
│  │                                                                            │
│  │  ┌─ Paper (32px internal padding, shadow) ──────────────────────────────┐  │
│  │  │                                                                      │  │
│  │  │  ┌──── 478px ────┐ 24px ┌──── 376px ────┐ 24px ┌──── 270px ────┐   │  │
│  │  │  │ Destination    │ gap  │ Origin Airport │ gap  │ Travelers     │   │  │
│  │  │  │ [autocomplete] │      │ [text field]   │      │ [number]      │   │  │
│  │  │  │ helperText     │      │ helperText     │      │ "X rooms"     │   │  │
│  │  │  └────────────────┘      └────────────────┘      └───────────────┘   │  │
│  │  │                                                                      │  │
│  │  └──────────────────────────────────────────────────────────────────────┘  │
│  │                                                                            │
│  └────────────────────────────────────────────────────────────────────────────┘
│                      │
├──── 48px margin-bottom to next section ────┤
```

**Width math at 1200px viewport** (Container maxWidth="lg"):
- Container content width: 1200px − 2×24px padding = 1152px
- Paper content width: 1152px − 2×32px padding = 1088px
- Grid available width: 1088px − 2×24px gaps = 1040px distributable
- Column widths: 5/12 × 1088px ≈ 453px | 4/12 × 1088px ≈ 363px | 3/12 × 1088px ≈ 272px
- (MUI Grid2 handles exact calculation including gap distribution)

---

## 11. Import Map

```ts
// SearchSection.tsx imports
import { Box, Paper, Typography, Grid2 } from '@mui/material';
import { DestinationAutocomplete } from './DestinationAutocomplete';
import { OriginAirportInput } from './OriginAirportInput';
import { TravelerCountInput } from './TravelerCountInput';
import type { DestinationResult } from '@/types/api';

// DestinationAutocomplete.tsx imports
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import type { DestinationResult } from '@/types/api';

// OriginAirportInput.tsx imports
import { TextField } from '@mui/material';

// TravelerCountInput.tsx imports
import { TextField } from '@mui/material';
```

---

## 12. Debounce Implementation Note

For the destination autocomplete debounce, use a simple `setTimeout`/`clearTimeout` pattern inside a `useRef`:

```ts
const debounceRef = useRef<ReturnType<typeof setTimeout>>();

const handleInputChange = (input: string) => {
  setInputValue(input);
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (input.length < 3) {
    setOptions([]);
    return;
  }
  debounceRef.current = setTimeout(() => {
    fetchDestinations(input);
  }, 300);
};
```

No external debounce library is needed.

---

## 13. API Integration Point

The destination search is the only API call in this section:

```ts
// Called from DestinationAutocomplete after debounce
// Uses centralized API service at src/lib/api.ts
import { api } from '@/lib/api';

const fetchDestinations = async (query: string): Promise<void> => {
  setIsLoading(true);
  setError(undefined);
  try {
    const response = await api.get<DestinationResult[]>('/api/v1/search/destinations', {
      params: { q: query },
    });
    setOptions(response.data);
  } catch (err) {
    setError('Failed to search destinations. Please try again.');
    setOptions([]);
  } finally {
    setIsLoading(false);
  }
};
```

The `api` instance is an Axios instance created in `src/lib/api.ts` with `baseURL` pointing to the backend.
