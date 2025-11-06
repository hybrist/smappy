#!/usr/bin/env node
/**
 * Script to seed the database with example data
 * Usage:
 *   pnpm run seed                      # Seed with realistic data
 *   pnpm run seed --profile minimal    # Seed with minimal data
 *   pnpm run seed --profile comprehensive  # Seed with comprehensive data
 *   pnpm run seed --no-clean           # Don't clean database before seeding
 */

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
Usage: pnpm run seed [options]

Options:
  --profile <profile>    Seed data profile: minimal, realistic, or comprehensive (default: realistic)
  --no-clean            Don't clean the database before seeding
  --help, -h            Show this help message

Examples:
  pnpm run seed                          # Seed with realistic data
  pnpm run seed --profile minimal        # Seed with minimal data
  pnpm run seed --profile comprehensive  # Seed with comprehensive data
  pnpm run seed --no-clean               # Keep existing data and add seed data
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
