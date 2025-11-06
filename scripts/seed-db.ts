#!/usr/bin/env node

// IMPORTANT: Load .env BEFORE any database imports so DATABASE_URL is available
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env file if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key.trim() === 'DATABASE_URL' && !process.env.DATABASE_URL) {
          // Strip quotes from the value if present
          process.env.DATABASE_URL = value.trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  } catch {
    // .env file doesn't exist, that's okay
  }
}

// Default to :memory: if still not set
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set, using :memory: (data will not persist)');
  console.warn('   To persist data, create a .env file with: DATABASE_URL=local.db');
  process.env.DATABASE_URL = ':memory:';
}

/**
 * Script to seed the database with example data
 * Usage:
 *   pnpm run db:seed                      # Seed with realistic data
 *   pnpm run db:seed --profile minimal    # Seed with minimal data
 *   pnpm run db:seed --profile comprehensive  # Seed with comprehensive data
 *   pnpm run db:seed --no-clean           # Don't clean database before seeding
 */

// Import AFTER setting DATABASE_URL
import { seedDatabase, type SeedProfile } from '../src/lib/server/db/seed.js';

// Parse command line arguments
const args = process.argv.slice(2);
let profile: SeedProfile = 'realistic';
let clean = true;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--profile' && args[i + 1]) {
    profile = args[i + 1] as SeedProfile;
    i++;
  } else if (arg === '--no-clean') {
    clean = false;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: pnpm run db:seed [options]

Options:
  --profile <profile>    Seed data profile: minimal, realistic, or comprehensive (default: realistic)
  --no-clean            Don't clean the database before seeding
  --help, -h            Show this help message

Examples:
  pnpm run db:seed                          # Seed with realistic data
  pnpm run db:seed --profile minimal        # Seed with minimal data
  pnpm run db:seed --profile comprehensive  # Seed with comprehensive data
  pnpm run db:seed --no-clean               # Keep existing data and add seed data
`);
    process.exit(0);
  }
}

// Validate profile
if (!['minimal', 'realistic', 'comprehensive'].includes(profile)) {
  console.error(`❌ Invalid profile: ${profile}`);
  console.error('Valid profiles: minimal, realistic, comprehensive');
  process.exit(1);
}

// Run seeding
console.log('Starting database seed...');
console.log(`Database: ${process.env.DATABASE_URL}`);
console.log(`Profile: ${profile}`);
console.log(`Clean database first: ${clean}`);
console.log('');

seedDatabase(profile, clean)
  .then(() => {
    console.log('');
    console.log('Database seeded successfully! 🎉');
    console.log('');
    console.log('You can now:');
    console.log('  - Start the dev server: pnpm run dev');
    console.log('  - View the dashboard: http://localhost:5173/dashboard');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Error seeding database:');
    console.error(error);
    process.exit(1);
  });
