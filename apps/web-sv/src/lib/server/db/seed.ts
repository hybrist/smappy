/**
 * Database seed data for development and testing
 * Provides realistic example analysis data that can be used across tests and for manual seeding
 */

import { ingestBundle, type BundleIngestionInput } from '@smappy/cli/ingestion';
import type { BundleInput, ModuleInput, ChunkInput } from '@smappy/core';
import { db } from './index.js';
import { sql } from 'drizzle-orm';

/**
 * Clean all data from the database
 */
export async function cleanDatabase() {
  // Delete all data from all tables (in correct order to avoid foreign key constraints)
  await db.run(sql`DELETE FROM SourceMapEntry`);
  await db.run(sql`DELETE FROM Dependency`);
  await db.run(sql`DELETE FROM Symbol`);
  await db.run(sql`DELETE FROM Chunk_Module`);
  await db.run(sql`DELETE FROM Suggestion_Link`);
  await db.run(sql`DELETE FROM Suggestion`);
  await db.run(sql`DELETE FROM Module`);
  await db.run(sql`DELETE FROM Chunk`);
  await db.run(sql`DELETE FROM Bundle`);
  await db.run(sql`DELETE FROM AnalysisRun`);
}

/**
 * Seed data profile types
 */
export type SeedProfile = 'minimal' | 'realistic' | 'comprehensive';

/**
 * Generate a minimal seed data set (single simple project)
 */
export function createMinimalSeedData(): BundleIngestionInput {
  const modules: ModuleInput[] = [
    {
      filePath: './src/main.js',
      sourceContent: `export function main() { console.log('Hello World'); }`,
      fileType: 'js',
    },
  ];

  const bundles: BundleInput[] = [
    {
      fileName: 'main.js',
      content: '/* bundled code */',
      type: 'js',
    },
  ];

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds: ['./src/main.js'],
    },
  ];

  return {
    options: {
      bundlerType: 'vite',
      projectName: 'minimal-example',
    },
    bundles,
    modules,
    chunks,
  };
}

/**
 * Generate realistic seed data (typical React/TypeScript app)
 */
export function createRealisticSeedData(projectName = 'react-dashboard'): BundleIngestionInput {
  const modules: ModuleInput[] = [
    {
      filePath: './src/main.tsx',
      sourceContent: `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      fileType: 'tsx',
    },
    {
      filePath: './src/App.tsx',
      sourceContent: `
import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import './App.css';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <Header title="My Dashboard" />
      <Dashboard count={count} onIncrement={() => setCount(c => c + 1)} />
    </div>
  );
}`,
      fileType: 'tsx',
    },
    {
      filePath: './src/components/Dashboard.tsx',
      sourceContent: `
import { Card } from './Card';
import { formatNumber } from '../utils/format';

interface DashboardProps {
  count: number;
  onIncrement: () => void;
}

export function Dashboard({ count, onIncrement }: DashboardProps) {
  return (
    <div className="dashboard">
      <Card title="Counter">
        <p>Count: {formatNumber(count)}</p>
        <button onClick={onIncrement}>Increment</button>
      </Card>
    </div>
  );
}`,
      fileType: 'tsx',
    },
    {
      filePath: './src/components/Header.tsx',
      sourceContent: `
interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="header">
      <h1>{title}</h1>
    </header>
  );
}`,
      fileType: 'tsx',
    },
    {
      filePath: './src/components/Card.tsx',
      sourceContent: `
import { ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-content">{children}</div>
    </div>
  );
}`,
      fileType: 'tsx',
    },
    {
      filePath: './src/utils/format.ts',
      sourceContent: `
export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}`,
      fileType: 'ts',
    },
    {
      filePath: 'node_modules/react/index.js',
      sourceContent: `// React library`,
      fileType: 'js',
    },
    {
      filePath: 'node_modules/react-dom/client.js',
      sourceContent: `// ReactDOM client`,
      fileType: 'js',
    },
  ];

  const bundles: BundleInput[] = [
    {
      fileName: 'main.js',
      content: '/* main bundle with React and app code */',
      type: 'js',
    },
  ];

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds: modules.map((m) => m.filePath),
    },
  ];

  return {
    options: {
      bundlerType: 'vite',
      projectName,
    },
    bundles,
    modules,
    chunks,
  };
}

/**
 * Generate comprehensive seed data (multiple projects, various bundlers)
 */
export function createComprehensiveSeedData(): BundleIngestionInput[] {
  return [
    createMinimalSeedData(),
    createRealisticSeedData('ecommerce-frontend'),
    createRealisticSeedData('admin-dashboard'),
    {
      options: {
        bundlerType: 'webpack',
        projectName: 'legacy-webapp',
      },
      bundles: [
        {
          fileName: 'bundle.js',
          content: '/* webpack bundled code */',
          type: 'js',
        },
      ],
      modules: [
        {
          filePath: './src/index.js',
          sourceContent: `import { app } from './app'; app.init();`,
          fileType: 'js',
        },
        {
          filePath: './src/app.js',
          sourceContent: `export const app = { init() { console.log('App started'); } };`,
          fileType: 'js',
        },
        {
          filePath: 'node_modules/jquery/dist/jquery.js',
          sourceContent: `// jQuery library`,
          fileType: 'js',
        },
        {
          filePath: 'node_modules/lodash/lodash.js',
          sourceContent: `// Lodash library`,
          fileType: 'js',
        },
      ],
      chunks: [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: ['./src/index.js', './src/app.js'],
        },
        {
          name: 'vendor',
          isEntry: false,
          isAsync: false,
          moduleIds: ['node_modules/jquery/dist/jquery.js', 'node_modules/lodash/lodash.js'],
        },
      ],
    },
  ];
}

/**
 * Seed the database with example data
 * @param profile - The seed data profile to use (defaults to 'realistic')
 * @param clean - Whether to clean the database first (defaults to true)
 */
export async function seedDatabase(profile: SeedProfile = 'realistic', clean = true) {
  if (clean) {
    console.log('🧹 Cleaning database...');
    await cleanDatabase();
  }

  console.log(`🌱 Seeding database with ${profile} data...`);

  let datasets: BundleIngestionInput[];

  switch (profile) {
    case 'minimal':
      datasets = [createMinimalSeedData()];
      break;
    case 'realistic':
      datasets = [createRealisticSeedData()];
      break;
    case 'comprehensive':
      datasets = createComprehensiveSeedData();
      break;
  }

  for (const dataset of datasets) {
    console.log(`  📦 Ingesting project: ${dataset.options.projectName}`);
    await ingestBundle(db, dataset);
  }

  console.log('✅ Database seeded successfully!');
}

/**
 * Create test data for dashboard E2E tests
 * These match the data structures expected by the dashboard tests
 */
export function createDashboardTestData() {
  // Simple projects for landing page tests
  const landingPageProjects = ['test-project-1', 'test-project-2'].map(
    (projectName): BundleIngestionInput => ({
      options: {
        bundlerType: 'vite',
        projectName,
      },
      bundles: [
        {
          fileName: `${projectName}.js`,
          content: '/* bundled code */',
          type: 'js',
        },
      ],
      modules: [
        {
          filePath: `./src/${projectName}/main.js`,
          sourceContent: `export function main() { return '${projectName}'; }`,
          fileType: 'js',
        },
      ],
      chunks: [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: [`./src/${projectName}/main.js`],
        },
      ],
    }),
  );

  // Detailed project for project dashboard tests
  const detailedProject: BundleIngestionInput = {
    options: {
      bundlerType: 'vite',
      projectName: 'dashboard-test-project',
    },
    bundles: [
      {
        fileName: 'main.js',
        content: '/* main bundle code */',
        type: 'js',
      },
    ],
    modules: [
      {
        filePath: './src/components/Button.tsx',
        sourceContent: `export function Button() { return <button>Click</button>; }`,
        fileType: 'tsx',
      },
      {
        filePath: './src/utils/helpers.ts',
        sourceContent: `export function formatDate(d: Date) { return d.toISOString(); }`,
        fileType: 'ts',
      },
      {
        filePath: './src/main.ts',
        sourceContent: `import { Button } from './components/Button';`,
        fileType: 'ts',
      },
    ],
    chunks: [
      {
        name: 'main',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/main.ts', './src/components/Button.tsx', './src/utils/helpers.ts'],
      },
    ],
  };

  return {
    landingPageProjects,
    detailedProject,
  };
}
