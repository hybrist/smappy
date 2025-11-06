/**
 * Global setup for Playwright e2e tests
 * No-op since database schema is initialized in db/index.ts when using :memory:
 */

async function globalSetup() {
	// Schema initialization is handled in src/lib/server/db/index.ts
	// when DATABASE_URL is :memory:
}

export default globalSetup;
