# Migration to TanStack Start

This document outlines the migration from Express-based REST API to TanStack Start with Server Functions.

## Prerequisites

**Important**: TanStack Start requires Node.js 24+. The project now specifies this in:

- `.nvmrc` file (contains `24`)
- `package.json` engines field (`"node": ">=24.0.0"`)

## What Changed

### Removed

- Express API server (`src/server/api.ts`)
- Fetch-based API client (`src/api/client.ts`)
- Express-related dependencies (express, @types/express, dotenv, tsx, concurrently)

### Added

- TanStack Start packages (`@tanstack/start`, `@tanstack/react-router`)
- Vinxi bundler (required by TanStack Start)
- Server functions using TanStack Start's `createServerFn` pattern

### Modified

- `src/server/functions.ts` - Converted to TanStack Start server functions
- Route files - Updated to use server functions directly
- Build configuration - Using TanStack Start instead of Vite
- Package scripts - Updated for TanStack Start workflow

## Key Benefits

1. **True Server Functions**: Direct server-side code execution without REST layer
2. **Type Safety**: Full TypeScript support from server to client
3. **Simplified Development**: No CORS, no API endpoints, no client wrapper needed
4. **Built-in Features**: Automatic serialization, error handling, loading states

## Usage

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview
pnpm preview
```

## Server Functions

All server functions are now callable directly from the client using TanStack Start's server function pattern:

```typescript
import { getProjects } from "@/server/functions";

// In a component or loader
const projects = await getProjects();
```

No fetch calls, no API endpoints, no client wrapper - just direct function calls with full type safety!
