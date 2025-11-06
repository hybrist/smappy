/**
 * End-to-end tests for dashboard UI
 * Tests that the UI correctly displays ingested bundle data
 */

import { test, expect } from '@playwright/test';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import type {
  BundleInput,
  ModuleInput,
  ChunkInput,
} from '../../src/lib/server/ingestion/types/index.js';

test.describe('Dashboard Landing Page', () => {
  test.beforeEach(async () => {
    // Set up test data with multiple projects
    const projects = ['test-project-1', 'test-project-2', 'test-project-3'];

    for (const projectName of projects) {
      const modules: ModuleInput[] = [
        {
          filePath: `./src/${projectName}/main.js`,
          sourceContent: `export function main() { return '${projectName}'; }`,
          fileType: 'js',
        },
      ];

      const bundles: BundleInput[] = [
        {
          fileName: `${projectName}.js`,
          content: '/* bundled code */',
          type: 'js',
        },
      ];

      const chunks: ChunkInput[] = [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: [`./src/${projectName}/main.js`],
        },
      ];

      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'vite',
          projectName,
          enableIncremental: false,
        },
        bundles,
        modules,
        chunks,
      };

      await ingestBundle(input);
    }
  });

  test('should display dashboard landing page with project list', async ({ page }) => {
    await page.goto('/dashboard');

    // Check the page title
    await expect(page.locator('h1')).toContainText('Bundle Analysis Dashboard');

    // Check the description
    await expect(page.getByText('Select a project to view its analysis data')).toBeVisible();

    // Verify project cards are displayed
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount(3);

    // Verify project names are visible
    await expect(page.getByText('test-project-1')).toBeVisible();
    await expect(page.getByText('test-project-2')).toBeVisible();
    await expect(page.getByText('test-project-3')).toBeVisible();
  });

  test('should navigate to project dashboard when clicking project card', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on the first project card
    await page.locator('.project-card').first().click();

    // Should navigate to project dashboard
    await expect(page).toHaveURL(/\/dashboard\/test-project-\d/);
  });
});

test.describe('Project Dashboard Page', () => {
  let projectName: string;

  test.beforeEach(async () => {
    projectName = 'dashboard-e2e-project';

    // Set up test data with realistic bundle analysis
    const modules: ModuleInput[] = [
      {
        filePath: './src/components/Button.tsx',
        sourceContent: `
export function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}
        `.trim(),
        fileType: 'tsx',
      },
      {
        filePath: './src/utils/helpers.ts',
        sourceContent: `
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function formatCurrency(amount: number): string {
  return \`$\${amount.toFixed(2)}\`;
}
        `.trim(),
        fileType: 'ts',
      },
      {
        filePath: './src/main.ts',
        sourceContent: `
import { Button } from './components/Button';
import { formatDate } from './utils/helpers';

console.log('App started', formatDate(new Date()));
        `.trim(),
        fileType: 'ts',
      },
    ];

    const bundles: BundleInput[] = [
      {
        fileName: 'main.js',
        content: '/* main bundle code */',
        type: 'js',
      },
      {
        fileName: 'vendor.js',
        content: '/* vendor bundle code */',
        type: 'js',
      },
    ];

    const chunks: ChunkInput[] = [
      {
        name: 'main',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/main.ts', './src/components/Button.tsx', './src/utils/helpers.ts'],
      },
    ];

    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'vite',
        projectName,
        enableIncremental: false,
      },
      bundles,
      modules,
      chunks,
    };

    await ingestBundle(input);
  });

  test('should display project dashboard with analysis data', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`);

    // Check navigation
    await expect(page.getByText('Bundle Analysis')).toBeVisible();

    // Check stats section is visible
    await expect(page.locator('.stat-card').first()).toBeVisible();
  });

  test('should display correct bundle statistics', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`);

    // Wait for stats to load
    await page.waitForSelector('.stat-card', { timeout: 10000 });

    // Check that stat cards are present
    await expect(page.getByText('Total Size')).toBeVisible();
    await expect(page.getByText('Modules')).toBeVisible();
    await expect(page.getByText('Bundler')).toBeVisible();

    // Verify module count
    const modulesCard = page.locator('.stat-card:has(h3:has-text("Modules"))');
    await expect(modulesCard).toContainText('3'); // We have 3 modules

    // Verify bundler
    const bundlerCard = page.locator('.stat-card:has(h3:has-text("Bundler"))');
    await expect(bundlerCard).toContainText('vite');
  });

  test('should display project selector with current project selected', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`);

    // Check project selector exists
    const projectSelect = page.locator('#project-select');
    await expect(projectSelect).toBeVisible();

    // Check current project is selected
    await expect(projectSelect).toHaveValue(projectName);
  });

  test('should display analysis selector', async ({ page }) => {
    await page.goto(`/dashboard/${projectName}`);

    // Check analysis selector exists
    const analysisSelect = page.locator('#analysis-select');
    await expect(analysisSelect).toBeVisible();

    // Should have at least one option (our ingested analysis)
    await expect(analysisSelect.locator('option')).toHaveCount(1);
  });

  test('should handle non-existent project gracefully', async ({ page }) => {
    await page.goto('/dashboard/non-existent-project');

    // Should still load the page
    await expect(page.getByText('Bundle Analysis')).toBeVisible();

    // Should show no analysis message
    await expect(
      page.getByText('No analysis data found for project "non-existent-project"'),
    ).toBeVisible();
  });
});

test.describe('Dashboard Integration Tests', () => {
  test('should display multiple analysis runs for a project', async ({ page }) => {
    const projectName = 'multi-analysis-project';

    // Create multiple analysis runs
    for (let i = 1; i <= 3; i++) {
      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'vite',
          projectName,
          enableIncremental: false,
        },
        bundles: [{ fileName: `bundle-${i}.js`, content: '/* code */', type: 'js' }],
        modules: [
          {
            filePath: `./src/app-${i}.js`,
            sourceContent: `console.log("version ${i}");`,
            fileType: 'js',
          },
        ],
        chunks: [{ name: 'main', isEntry: true, isAsync: false, moduleIds: [`./src/app-${i}.js`] }],
      };
      await ingestBundle(input);
    }

    await page.goto(`/dashboard/${projectName}`);

    // Check analysis selector has multiple options
    const analysisSelect = page.locator('#analysis-select');
    await expect(analysisSelect.locator('option')).toHaveCount(3);
  });

  test('should persist page state after reload', async ({ page }) => {
    const projectName = 'persist-test-project';
    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'rollup',
        projectName,
        enableIncremental: false,
      },
      bundles: [{ fileName: 'bundle.js', content: '/* code */', type: 'js' }],
      modules: [
        {
          filePath: './src/index.js',
          sourceContent: 'export default function() {}',
          fileType: 'js',
        },
      ],
      chunks: [{ name: 'main', isEntry: true, isAsync: false, moduleIds: ['./src/index.js'] }],
    };
    await ingestBundle(input);

    await page.goto(`/dashboard/${projectName}`);

    // Verify initial state
    await expect(page.getByText('Bundler')).toBeVisible();

    // Reload page
    await page.reload();

    // State should persist
    await expect(page.getByText('Bundler')).toBeVisible();
    const bundlerCard = page.locator('.stat-card:has(h3:has-text("Bundler"))');
    await expect(bundlerCard).toContainText('rollup');
  });
});
