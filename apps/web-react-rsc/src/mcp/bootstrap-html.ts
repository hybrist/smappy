/**
 * Bootstrap HTML generator for MCP Apps.
 *
 * Reads the HTML template file and substitutes the base URL.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const templatePath = fileURLToPath(new URL('./bootstrap.html', import.meta.url));
const bootstrapTemplate = readFileSync(templatePath, 'utf-8');

/**
 * Generate the MCP App bootstrap HTML for a given base URL.
 *
 * This HTML document:
 * - Sets up basic styling
 * - Loads Vite's HMR client for development
 * - Loads React refresh runtime for component HMR
 * - Loads the MCP client entry point
 */
export function generateBootstrapHtml(baseUrl: string): string {
  return bootstrapTemplate.replaceAll('{{BASE_URL}}', baseUrl);
}
