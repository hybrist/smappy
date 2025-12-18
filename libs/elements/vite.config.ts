/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [tailwindcss()],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    include: ['src/**/*.spec.{ts,tsx}'],
  },
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: 'preact/compat',
      },
      {
        find: 'react-dom',
        replacement: 'preact/compat',
      },
    ],
  },
});
