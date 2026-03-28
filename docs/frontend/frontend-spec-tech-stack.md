# WhenToGo Frontend Specification — Technology Stack & Environment Setup

> **Audience**: Ralph Loop (autonomous implementation agent)
> **Purpose**: Exact package versions, configuration files, environment variables, and project scaffolding so Ralph Loop can bootstrap without research
> **Prerequisite**: This is a **brownfield** project. The `frontend/` directory already exists with `package.json`, `tsconfig.json`, `next.config.ts`, and scaffold files. Do NOT run `create-next-app`. Work within the existing structure.

---

## 0.1 Exact Package Versions (Already Installed)

All dependencies below are **already declared** in `frontend/package.json` and locked in `frontend/package-lock.json`. Run `npm install` from the `frontend/` directory to install them — do NOT add, upgrade, or remove any packages unless explicitly stated.

### Production Dependencies

| Package | Version (package.json) | Purpose |
|---|---|---|
| `next` | `16.2.1` | App Router framework (Server & Client Components) |
| `react` | `19.2.4` | UI library (React 19 with use() hook, Actions, etc.) |
| `react-dom` | `19.2.4` | DOM renderer for React 19 |
| `@mui/material` | `^7.3.9` | Component library (MUI 7 — uses Pigment CSS internally but we use Emotion) |
| `@mui/icons-material` | `^7.3.9` | Material icon components |
| `@emotion/react` | `^11.14.0` | CSS-in-JS runtime for MUI's `sx` prop and styled() |
| `@emotion/styled` | `^11.14.1` | Emotion's styled component API |
| `axios` | `^1.14.0` | HTTP client for API calls via centralized service layer |
| `dayjs` | `^1.11.20` | Lightweight date manipulation (formatting, parsing, comparison) |

### Dev Dependencies

| Package | Version (package.json) | Purpose |
|---|---|---|
| `typescript` | `^5` | TypeScript compiler (strict mode enabled) |
| `@types/node` | `^20` | Node.js type definitions |
| `@types/react` | `^19` | React 19 type definitions |
| `@types/react-dom` | `^19` | ReactDOM 19 type definitions |
| `eslint` | `^9` | Linter |
| `eslint-config-next` | `16.2.1` | Next.js ESLint rules |

### No Additional Packages Required

Ralph Loop MUST NOT install any additional packages. Specifically:
- **No** `react-router` or `next/navigation` client routing — this is a single-page flow
- **No** `zustand`, `jotai`, `redux` — state management uses React Context only
- **No** `react-query` or `swr` — data fetching uses plain Axios + useState/useEffect
- **No** `date-fns` or `moment` — use `dayjs` exclusively
- **No** `notistack` or toast libraries — errors display inline with retry buttons
- **No** testing libraries in this scope (testing is out of scope for this spec)

---

## 0.2 Configuration Files

### 0.2.1 `frontend/tsconfig.json` (Already Exists — DO NOT MODIFY)

The existing `tsconfig.json` is correctly configured. Key settings Ralph Loop should be aware of:

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,              // <-- Strict mode is ON. All types must be explicit.
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]         // <-- Path alias. Use @/components/..., @/lib/..., etc.
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules"]
}
```

**Import convention**: Always use the `@/` path alias. Examples:
- `import { api } from '@/lib/api'`
- `import type { DestinationResult } from '@/types/api'`
- `import { useComparisonQueue } from '@/context/ComparisonQueueContext'`

### 0.2.2 `frontend/next.config.ts` (Modify As Shown)

The existing file is a bare skeleton. Update it to proxy API requests to the backend during development:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to backend to avoid CORS in development.
  // In production, configure reverse proxy (nginx/Vercel rewrites) instead.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/health`,
      },
    ];
  },
};

export default nextConfig;
```

**Why rewrites**: The backend runs on `http://localhost:8000`. By rewriting `/api/*` requests, the frontend Axios client can call `/api/v1/...` paths directly without CORS issues. The `NEXT_PUBLIC_API_URL` env var allows overriding the backend URL.

### 0.2.3 `frontend/eslint.config.mjs` (Already Exists — DO NOT MODIFY)

The existing ESLint config uses `eslint-config-next` with core-web-vitals and TypeScript rules. No changes needed.

### 0.2.4 `frontend/Dockerfile` (Already Exists — DO NOT MODIFY)

Uses `node:18-slim`, runs `npm install` and `npm run dev` on port 3000. No changes needed.

---

## 0.3 Environment Variables

### 0.3.1 Required Variable

| Variable | Type | Default | Where Used | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `string` | `http://localhost:8000` | `next.config.ts` rewrites, `src/lib/api.ts` | Base URL of the backend API server |

### 0.3.2 `.env.local` File (Create If Not Exists)

Create `frontend/.env.local` with:

```env
# Backend API base URL (used by next.config.ts rewrites and Axios baseURL fallback)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Note**: This file is gitignored (`.env*` pattern in `.gitignore`). The `docker-compose.yml` already sets `NEXT_PUBLIC_API_URL=http://localhost:8000` as an environment variable for the frontend container, so this `.env.local` is only needed for local development outside Docker.

### 0.3.3 How the Frontend Uses the API URL

The centralized API service layer (`src/lib/api.ts`) creates an Axios instance. Because `next.config.ts` rewrites proxy `/api/*` to the backend, the Axios `baseURL` should be **empty string** (relative to the frontend origin) in all environments:

```typescript
// src/lib/api.ts — Axios baseURL
const apiClient = axios.create({
  baseURL: "",  // Requests go to /api/v1/... which next.config.ts rewrites to the backend
  timeout: 15000, // 15s client timeout (backend has 10s timeout on external APIs)
  headers: {
    "Content-Type": "application/json",
  },
});
```

This means the frontend NEVER constructs absolute backend URLs. All API paths are relative: `/api/v1/search/destinations`, `/api/v1/flights/price`, etc.

---

## 0.4 MUI 7 Theme Setup

### 0.4.1 ThemeRegistry Component

MUI 7 with Emotion requires a client-side `ThemeProvider` and Emotion `CacheProvider` to work with Next.js App Router's server-side rendering. Create a `ThemeRegistry` wrapper component.

**File**: `frontend/src/theme/ThemeRegistry.tsx`

```typescript
"use client";

import { useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

// Use MUI 7 default theme — no customization needed
const theme = createTheme({
  // Default MUI 7 theme. No overrides.
  // MUI 7 default palette uses:
  //   primary: #1976d2 (blue)
  //   secondary: #9c27b0 (purple)
  //   error: #d32f2f (red)
  //   warning: #ed6c02 (orange)
  //   info: #0288d1 (light blue)
  //   success: #2e7d32 (green)
});

function createEmotionCache() {
  return createCache({ key: "mui", prepend: true });
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [emotionCache] = useState(createEmotionCache);

  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
```

**Key details**:
- `"use client"` directive is required — MUI ThemeProvider uses React Context internally.
- `CssBaseline` resets browser styles (replaces the need for most of `globals.css`).
- `createCache({ key: "mui", prepend: true })` ensures MUI styles are inserted before other Emotion styles for correct specificity.
- **No custom theme overrides**. Use MUI 7 defaults for all colors, typography, spacing, and breakpoints.

### 0.4.2 Integration with RootLayout

The existing `frontend/src/app/layout.tsx` must be modified to wrap children in `ThemeRegistry`:

```typescript
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";

export const metadata: Metadata = {
  title: "WhenToGo — Find Your Best Travel Dates",
  description: "Compare flight prices, hotel rates, and weather to find the optimal travel window.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
```

**Changes from existing layout.tsx**:
1. Remove Geist font imports and CSS variables — MUI 7 uses Roboto by default (loaded via CssBaseline or add `@fontsource/roboto`). Since MUI's default theme works without explicit Roboto loading (falls back to system fonts), no font package is needed.
2. Remove `import "./globals.css"` — `CssBaseline` handles CSS reset. Delete or empty `globals.css`.
3. Wrap `{children}` in `<ThemeRegistry>`.
4. Update `metadata` to reflect WhenToGo branding.
5. `RootLayout` remains a **Server Component** (no `"use client"` directive).

### 0.4.3 MUI Styling Conventions

Ralph Loop MUST follow these styling conventions throughout:

| Approach | When to Use | Example |
|---|---|---|
| `sx` prop | One-off styles on MUI components | `<Box sx={{ mt: 2, display: 'flex' }}>` |
| MUI `styled()` | Reusable styled components with theme access | `const StyledCard = styled(Card)(({ theme }) => ({ ... }))` |
| MUI component props | Layout, spacing, typography | `<Typography variant="h5">`, `<Stack spacing={2}>` |
| Emotion `styled()` | Styling non-MUI HTML elements (rare) | `const Wrapper = styled('div')({ ... })` |

**Do NOT use**:
- CSS Modules (`.module.css` files) — delete `page.module.css`
- Tailwind CSS or utility classes
- Inline `style` attributes (use `sx` instead)
- Global CSS beyond what `CssBaseline` provides

---

## 0.5 Project Directory Structure

After scaffolding, the `frontend/src/` directory MUST have this structure:

```
frontend/src/
├── app/
│   ├── layout.tsx                 # RootLayout (Server Component) — MODIFY existing
│   ├── page.tsx                   # HomePage (Client Component) — REPLACE existing
│   └── globals.css                # EMPTY or DELETE (CssBaseline replaces it)
├── components/
│   ├── ThemeRegistry.tsx          # MUI theme + Emotion cache provider
│   ├── layout/
│   │   ├── AppShell.tsx           # Root client shell: Header + PageContainer + FAB + Footer
│   │   ├── Header.tsx             # App bar with "WhenToGo" branding + queue badge
│   │   ├── Footer.tsx             # Bottom bar with attribution text
│   │   ├── PageContainer.tsx      # MUI Container wrapping progressive sections
│   │   ├── SectionContainer.tsx   # Visibility wrapper for each progressive section
│   │   └── ComparisonQueueFAB.tsx # Floating action button showing queue item count
│   ├── search/                    # Destination search section components
│   ├── calendar/                  # Calendar & date picker section components
│   ├── dateOption/                # Date option builder (flights, hotels, weather)
│   └── comparison/                # Comparison queue & results section components
├── context/
│   └── ComparisonQueueContext.tsx  # React Context + Provider for comparison queue state
├── hooks/                         # Custom React hooks (if needed)
├── lib/
│   └── api.ts                     # Centralized Axios API service layer
└── types/
    ├── api.ts                     # EXISTING — API contract types (DO NOT MODIFY)
    ├── frontend.ts                # Frontend-only types (UI state, component props)
    └── constants.ts               # Shared constants and union types
```

### Files to Delete

Remove these default scaffold files that are no longer needed:
- `frontend/src/app/page.module.css` — replaced by MUI `sx` prop styling
- `frontend/public/next.svg` — not used
- `frontend/public/vercel.svg` — not used
- `frontend/public/file-text.svg` — not used (if present)
- `frontend/public/globe.svg` — not used (if present)
- `frontend/public/window.svg` — not used (if present)

---

## 0.6 NPM Scripts (Already Configured)

The existing `package.json` scripts are sufficient:

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Start dev server on `http://localhost:3000` with HMR |
| `npm run build` | `next build` | Production build |
| `npm run start` | `next start` | Start production server |
| `npm run lint` | `eslint` | Run ESLint |

---

## 0.7 Bootstrap Procedure (Step-by-Step for Ralph Loop)

Ralph Loop should execute these steps in order to set up the environment before writing any component code:

### Step 1: Install dependencies
```bash
cd frontend
npm install
```

### Step 2: Create `.env.local`
```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
```

### Step 3: Update `next.config.ts` with API rewrites
Apply the configuration shown in Section 0.2.2 above.

### Step 4: Create the ThemeRegistry component
Create `src/theme/ThemeRegistry.tsx` as shown in Section 0.4.1.

### Step 5: Update `layout.tsx`
Modify `src/app/layout.tsx` as shown in Section 0.4.2.

### Step 6: Create the centralized API service layer
Create `src/lib/api.ts` as defined in the API Service Layer spec (`docs/frontend/frontend-spec-api-service-layer.md`).

### Step 7: Create frontend type files
Create `src/types/frontend.ts` and `src/types/constants.ts` as defined in Section 1 of the main spec (`docs/frontend/frontend-spec.md`).

### Step 8: Create the ComparisonQueueContext
Create `src/context/ComparisonQueueContext.tsx` as defined in the Context Provider spec (`docs/frontend/frontend-spec-context-provider.md`).

### Step 9: Delete scaffold files
```bash
rm -f src/app/page.module.css
rm -f public/next.svg public/vercel.svg public/file-text.svg public/globe.svg public/window.svg
```

### Step 10: Empty globals.css
```bash
echo "/* CssBaseline handles CSS reset. This file is intentionally empty. */" > src/app/globals.css
```

### Step 11: Verify the dev server starts
```bash
npm run dev
```
The app should start on `http://localhost:3000` without errors. At this point it will show a blank page (since `page.tsx` hasn't been replaced yet).

### Step 12: Build layout components, then section components
Follow the component tree defined in Section 2 of the main spec (`docs/frontend/frontend-spec.md`), building from outermost (AppShell) to innermost (section-specific components).

---

## 0.8 Development Workflow Notes

### Server vs Client Components
- **Server Components** (default in App Router): `layout.tsx` — no `"use client"` directive, cannot use hooks or browser APIs.
- **Client Components**: Every other component in this app. Add `"use client"` as the first line. All components that use `useState`, `useEffect`, `useContext`, MUI components, or event handlers MUST be Client Components.
- **Rule of thumb**: In this app, only `layout.tsx` is a Server Component. Everything else is a Client Component because MUI requires client-side rendering.

### TypeScript Strict Mode Reminders
- All function parameters and return types must be explicitly typed (no `any`)
- Use `interface` for object shapes, `type` for unions and intersections
- Use `as const` for literal type narrowing where applicable
- Nullable fields must use `| null` (not `| undefined`) to match API contract
- Array types use `T[]` syntax (not `Array<T>`)

### Axios Error Handling Pattern
All API calls go through `src/lib/api.ts`. Errors are caught and normalized into a consistent shape. Components display errors inline with a retry button — never toast notifications, never auto-retry. See `docs/frontend/frontend-spec-api-service-layer.md` for the full error handling spec.

### Date Handling with dayjs
- Import: `import dayjs from 'dayjs'`
- Format dates for API: `dayjs(date).format('YYYY-MM-DD')`
- Parse API dates: `dayjs('2026-05-01')` — dayjs parses ISO date strings natively
- Display dates to user: `dayjs('2026-05-01').format('MMM D, YYYY')` → "May 1, 2026"
- Compare dates: `dayjs(a).isBefore(dayjs(b))`, `dayjs(a).isAfter(dayjs(b))`
- Date arithmetic: `dayjs().add(2, 'month')` for calendar range calculations
- **No dayjs plugins needed** for this project — the core API covers all use cases

---

*End of Section 0: Technology Stack & Environment Setup*
