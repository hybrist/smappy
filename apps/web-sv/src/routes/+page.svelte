<script lang="ts">
  import { goto } from '$app/navigation';

  function navigateToDashboard() {
    goto('/dashboard');
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Hero Section -->
  <section
    class="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-16"
  >
    <div class="max-w-3xl text-center">
      <img
        src="/logo.svg"
        alt="Smappy - Bundle Analyzer"
        class="mx-auto mb-8 h-20 brightness-0 invert"
      />
      <p class="text-primary-100 mb-6 text-2xl font-medium sm:text-3xl">
        Visualize, analyze, and optimize your JavaScript bundles
      </p>
      <p class="text-primary-50 mb-8 text-lg leading-relaxed">
        Track bundle sizes over time, detect circular dependencies, and get AI-powered optimization
        suggestions for your Vite, Next.js, Webpack, and other JavaScript projects.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <button
          class="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-primary-600 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          onclick={navigateToDashboard}
        >
          View Dashboard
        </button>
        <a
          href="/chat"
          class="rounded-lg border-2 border-white bg-transparent px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-white/10"
        >
          AI Chat Assistant
        </a>
        <a
          href="#quick-start"
          class="rounded-lg border-2 border-white bg-transparent px-8 py-3 text-lg font-semibold text-white transition-all hover:bg-white/10"
        >
          Get Started
        </a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="mx-auto max-w-6xl px-6 py-20">
    <h2 class="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">Key Features</h2>
    <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div
        class="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-4 text-5xl">📊</div>
        <h3 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Bundle Size Tracking
        </h3>
        <p class="leading-relaxed text-gray-600 dark:text-gray-400">
          Monitor your bundle sizes over time and catch size regressions before they reach
          production.
        </p>
      </div>

      <div
        class="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-4 text-5xl">🔍</div>
        <h3 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Dependency Graph</h3>
        <p class="leading-relaxed text-gray-600 dark:text-gray-400">
          Visualize module dependencies and automatically detect circular dependencies that can
          cause issues.
        </p>
      </div>

      <div
        class="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-4 text-5xl">🤖</div>
        <h3 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          AI-Powered Suggestions
        </h3>
        <p class="leading-relaxed text-gray-600 dark:text-gray-400">
          Get intelligent optimization recommendations to reduce bundle size and improve
          performance.
        </p>
      </div>

      <div
        class="rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-4 text-5xl">⚡</div>
        <h3 class="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Multi-Bundler Support
        </h3>
        <p class="leading-relaxed text-gray-600 dark:text-gray-400">
          Works seamlessly with Vite, Next.js, Webpack, Rollup, and other popular JavaScript
          bundlers.
        </p>
      </div>
    </div>
  </section>

  <!-- Quick Start Section -->
  <section id="quick-start" class="mx-auto max-w-4xl px-6 py-20">
    <h2 class="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">Quick Start</h2>
    <div class="flex flex-col gap-8">
      <div
        class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          1. Install the plugin
        </h3>
        <pre
          class="overflow-x-auto rounded-md bg-gray-900 p-4 font-mono text-sm dark:bg-gray-950"><code
            class="text-gray-200">npm install smappy-plugin --save-dev</code
          ></pre>
      </div>

      <div
        class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          2. Configure your bundler
        </h3>
        <pre
          class="overflow-x-auto rounded-md bg-gray-900 p-4 font-mono text-sm dark:bg-gray-950"><code
            class="text-gray-200"
            >{`// vite.config.js
import { smappyPlugin } from 'smappy-plugin';

export default {
  plugins: [smappyPlugin()]
};`}</code
          ></pre>
      </div>

      <div
        class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">3. Run your build</h3>
        <pre
          class="overflow-x-auto rounded-md bg-gray-900 p-4 font-mono text-sm dark:bg-gray-950"><code
            class="text-gray-200">npm run build</code
          ></pre>
      </div>

      <div
        class="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          4. View the dashboard
        </h3>
        <p class="leading-relaxed text-gray-600 dark:text-gray-400">
          Visit <a
            href="/dashboard"
            class="font-medium text-primary-600 underline hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >the dashboard</a
          > to see your bundle analysis
        </p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer
    class="border-t border-gray-200 bg-white px-6 py-12 dark:border-gray-700 dark:bg-gray-800"
  >
    <div class="mx-auto max-w-6xl text-center">
      <div class="mb-4 flex flex-wrap items-center justify-center gap-8">
        <a
          href="https://github.com/hybrist/smappy"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >GitHub</a
        >
        <a
          href="/dashboard"
          class="font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >Dashboard</a
        >
        <a
          href="https://github.com/hybrist/smappy/blob/main/docs/bundler-integration/README.md"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-gray-600 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >Documentation</a
        >
      </div>
      <p class="text-sm text-gray-500 dark:text-gray-600">Smappy v0.0.1</p>
    </div>
  </footer>
</div>
