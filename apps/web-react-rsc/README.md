# RSC + MCP Apps Integration

This example demonstrates integrating [React Server Components](https://react.dev/reference/rsc/server-components) with [MCP Apps](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865) - the Model Context Protocol extension for interactive user interfaces.

The goal is to show how RSC's server-rendered, streaming component model can power rich UI experiences within MCP tool results.

## Quick Start

```sh
# Run dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## What This Demo Shows

1. **RSC Framework Basics** - How to set up RSC with Vite using `@vitejs/plugin-rsc`
2. **MCP Apps Integration** - Serving RSC payloads as MCP tool results that render in host applications
3. **Server Actions via MCP** - Routing React server actions through MCP's tool protocol

## Architecture Overview

```
src/
├── root.tsx              # Demo app: main page component
├── action.tsx            # Demo app: server actions (counter state)
├── client.tsx            # Demo app: client components
│
├── framework/            # RSC framework layer (reusable)
│   ├── entry.rsc.tsx     # RSC environment entry (renders root, handles actions)
│   ├── entry.ssr.tsx     # SSR environment entry (HTML rendering)
│   ├── entry.browser.tsx # Browser entry (hydration, navigation)
│   ├── request.tsx       # Request parsing utilities
│   └── error-boundary.tsx
│
└── mcp/                  # MCP Apps integration layer
    ├── handler.ts        # MCP protocol handler (sessions, JSON-RPC routing)
    ├── entry.rsc.tsx     # RSC rendering for MCP tools
    ├── entry.client.tsx  # MCP App client bootstrap
    ├── bootstrap.html    # HTML template for MCP App shell
    ├── bootstrap-html.ts # Bootstrap HTML generator (substitutes base URL)
    └── components/       # Components rendered via MCP tools
        └── GreetingCard.tsx
```

### Key Concepts

- **RSC Environment** (`react-server` condition): Runs server components, serializes to RSC flight stream
- **SSR Environment**: Deserializes RSC stream, renders to HTML for initial page load
- **Browser Environment**: Hydrates HTML, handles client-side navigation and actions
- **MCP Layer**: Exposes RSC rendering as MCP tools, handles action dispatch via MCP protocol

## MCP Integration

The `/mcp` endpoint exposes an MCP server with:

- **Resource**: `ui://smappy/rsc-app` - Bootstrap HTML for the MCP App
- **Tool**: `render-greeting` - Renders an interactive greeting card using RSC
- **Tool**: `_rsc.dispatch-action` - Executes server actions (app-only visibility)

The MCP App client (`entry.client.tsx`) receives RSC payloads via `structuredContent` in tool results and deserializes them using React's flight client.

## Known Issues / Cleanup Needed

This implementation works end-to-end but contains technical debt from iterative development. The following areas need cleanup to make the architecture clearer:

### 1. Global State in vite.config.ts

The `rscRenderer` global creates "magic" data flow that's hard to trace. The Vite plugin sets it, and `handler.ts` imports a getter from the config file.

**Fix:** Pass the RSC environment reference explicitly through middleware, eliminating the need for globals.

> ✅ **Partially resolved:** `mcpBootstrapHtml` global removed. Bootstrap HTML is now generated on-demand from `src/mcp/bootstrap.html` using the base URL passed via request header.

### 2. Implicit Render Context

`currentRenderContext` in `mcp/entry.rsc.tsx` tracks what component to re-render after actions. This makes `dispatchAction()` behavior non-obvious.

**Fix:** Make component context an explicit parameter to `dispatchAction()`.

### 3. Plugin Logic in Config

~180 lines of runtime code (request adapters, HTML generation, middleware setup) live in `vite.config.ts`.

**Fix:** Extract to `src/mcp/vite-plugin.ts` or similar, keeping config as config.

### 4. ~~Inline HTML Templates~~ ✅ Resolved

~~Large HTML template strings in `vite.config.ts` (bootstrap) and `handler.ts` (fallback).~~

Bootstrap HTML extracted to `src/mcp/bootstrap.html` with `{{BASE_URL}}` placeholder, loaded via `src/mcp/bootstrap-html.ts`.

### 5. Duplicate RSC Logic

Both `framework/entry.rsc.tsx` and `mcp/entry.rsc.tsx` handle RSC rendering and action dispatch with similar but separate code.

**Fix:** Have MCP entry delegate to framework entry or extract shared utilities.

## References

### RSC / Vite

- [`@vitejs/plugin-rsc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-rsc)
- [React Server Components](https://react.dev/reference/rsc/server-components)

### MCP Apps

- [SEP-1865: MCP Apps Specification](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865)
- [MCP Apps Blog Post](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/)
- [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps) - SDK for MCP Apps

## File-by-File Guide

| File                          | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `vite.config.ts`              | Build config + MCP plugin (needs extraction)            |
| `framework/entry.rsc.tsx`     | `@vitejs/plugin-rsc/rsc` APIs                           |
| `framework/entry.ssr.tsx`     | `@vitejs/plugin-rsc/ssr` + `rsc-html-stream/server`     |
| `framework/entry.browser.tsx` | `@vitejs/plugin-rsc/browser` + `rsc-html-stream/client` |
| `mcp/handler.ts`              | MCP SDK server setup, tool registration                 |
| `mcp/entry.rsc.tsx`           | RSC rendering for MCP tool results                      |
| `mcp/entry.client.tsx`        | `@modelcontextprotocol/ext-apps` client                 |
| `mcp/bootstrap.html`          | HTML template for MCP App shell                         |
| `mcp/bootstrap-html.ts`       | Bootstrap HTML generator with base URL substitution     |
