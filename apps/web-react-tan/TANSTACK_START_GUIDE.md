# TanStack Start Implementation Guide

This guide explains how to complete the migration to TanStack Start once Node.js 24 is available.

## Current Status

✅ **Completed:**
- Node.js 24 requirement documented (`.nvmrc`, `package.json` engines)
- TanStack Start server functions created (`src/server/functions.tanstack.ts`)
- Example routes updated for TanStack Start (`src/routes/*.tanstack.tsx`)
- Configuration file created (`app.config.ts`)

⏳ **Pending (requires Node.js 24):**
- Install TanStack Start packages
- Replace Express implementation
- Update package.json scripts
- Final testing

## Step-by-Step Migration

### 1. Ensure Node.js 24 is Active

```bash
# Using nvm
nvm install 24
nvm use 24

# Verify
node --version  # Should show v24.x.x
```

### 2. Install TanStack Start Packages

```bash
cd apps/web-react-tan

# Remove Express-related packages
pnpm remove express @types/express dotenv tsx concurrently

# Install TanStack Start
pnpm add @tanstack/start @tanstack/react-start vinxi

# Verify installation
pnpm list @tanstack/start
```

### 3. Replace Implementation Files

```bash
# Backup old files (optional)
mv src/server/functions.ts src/server/functions.express.ts.bak
mv src/routes/projects.tsx src/routes/projects.express.tsx.bak
mv src/routes/analysis.tsx src/routes/analysis.express.tsx.bak

# Use TanStack Start versions
mv src/server/functions.tanstack.ts src/server/functions.ts
mv src/routes/projects.tanstack.tsx src/routes/projects.tsx
mv src/routes/analysis.tanstack.tsx src/routes/analysis.tsx

# Remove Express API server (no longer needed!)
rm src/server/api.ts

# Remove client wrapper (no longer needed!)
rm -rf src/api
```

### 4. Update Configuration

The `app.config.ts` is already created and will replace `vite.config.ts`.

```bash
# Rename/backup old Vite config
mv vite.config.ts vite.config.ts.bak
```

### 5. Update package.json Scripts

Replace the scripts in `apps/web-react-tan/package.json`:

```json
{
  "scripts": {
    "dev": "vinxi dev",
    "build": "vinxi build",
    "start": "vinxi start",
    "test": "vitest run",
    "test:watch": "vitest",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "tsc --noEmit"
  }
}
```

**Remove these scripts:**
- `dev:api` (no longer needed)
- `dev:all` (no longer needed)
- `preview` (use `start` instead)

### 6. Update Environment Configuration

TanStack Start handles environment variables differently. Update `.env`:

```env
# Database Configuration (same as before)
DATABASE_URL=:memory:

# No need for ALLOWED_ORIGINS - TanStack Start handles this
```

### 7. Test the Implementation

```bash
# Start development server
pnpm dev

# Should see:
# - Vinxi building the application
# - Server and client bundles
# - Server running (usually on port 3000)

# Visit http://localhost:3000
```

### 8. Update Router (if needed)

If you created the example routes, register them in `src/router.tsx`:

```typescript
import { projectsRoute } from "@/routes/projects";
import { analysisRoute } from "@/routes/analysis";

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  projectsRoute,
  analysisRoute,
]);
```

## Key Differences from Express Implementation

### Before (Express + REST API)

```typescript
// Server: src/server/api.ts
app.get("/api/projects", async (req, res) => {
  const projects = await serverFunctions.getProjects();
  res.json(projects);
});

// Client: src/api/client.ts
export async function getProjects() {
  return fetchAPI<Project[]>("/api/projects");
}

// Component
const projects = await api.getProjects(); // HTTP request
```

### After (TanStack Start)

```typescript
// Server: src/server/functions.ts
export const getProjects = createServerFn("GET", async () => {
  // ... implementation
});

// Component - call directly!
import { getProjects } from "@/server/functions";
const projects = await getProjects(); // Direct call!
```

## Benefits You'll Get

1. **No REST Layer**: Direct function calls
2. **No CORS Issues**: Server and client in same app
3. **No API Contracts**: TypeScript types are the contract
4. **Better DX**: Faster development, less boilerplate
5. **Full Type Safety**: End-to-end TypeScript
6. **Automatic Serialization**: TanStack Start handles it
7. **Built-in Error Handling**: Errors propagate naturally

## Troubleshooting

### "Cannot find module '@tanstack/start'"

- Ensure Node.js 24 is active: `node --version`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`

### "Unsupported engine" error

- Check Node version: `node --version`
- Must be 24.x.x or higher
- Use `nvm use 24` or similar

### Server functions not found

- Ensure you renamed `functions.tanstack.ts` to `functions.ts`
- Check imports in route files
- Restart development server

### Build errors

- Clear Vinxi cache: `rm -rf .vinxi`
- Rebuild: `pnpm build`

## Verification Checklist

After migration, verify:

- [ ] `pnpm dev` starts without errors
- [ ] Application loads in browser
- [ ] Server functions can be called from components
- [ ] Data loads correctly
- [ ] No CORS errors in console
- [ ] Types work correctly (no `any` types)
- [ ] Build succeeds: `pnpm build`
- [ ] Production build works: `pnpm start`

## Rollback (if needed)

If you need to rollback to Express:

```bash
# Restore Express files
mv src/server/functions.express.ts.bak src/server/functions.ts
mv src/routes/projects.express.tsx.bak src/routes/projects.tsx
mv src/routes/analysis.express.tsx.bak src/routes/analysis.tsx

# Restore Express API
git checkout HEAD -- src/server/api.ts src/api/

# Restore Vite config
mv vite.config.ts.bak vite.config.ts

# Reinstall Express dependencies
pnpm install express @types/express dotenv tsx concurrently

# Remove TanStack Start
pnpm remove @tanstack/start @tanstack/react-start vinxi
```

## Next Steps

1. Complete the migration following this guide
2. Test all server functions
3. Update documentation
4. Deploy to production

## Questions?

See `TANSTACK_START_MIGRATION.md` for more context on why this migration was done.
