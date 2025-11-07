<script lang="ts">
  import { goto } from '$app/navigation';

  function navigateToDashboard() {
    goto('/dashboard');
  }
</script>

<div class="landing-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Smappy</h1>
      <p class="hero-tagline">Visualize, analyze, and optimize your JavaScript bundles</p>
      <p class="hero-description">
        Track bundle sizes over time, detect circular dependencies, and get AI-powered optimization
        suggestions for your Vite, Next.js, Webpack, and other JavaScript projects.
      </p>
      <div class="hero-actions">
        <button class="btn-primary" onclick={navigateToDashboard}>View Dashboard</button>
        <a href="#quick-start" class="btn-secondary">Get Started</a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <h2 class="section-title">Key Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3 class="feature-title">Bundle Size Tracking</h3>
        <p class="feature-description">
          Monitor your bundle sizes over time and catch size regressions before they reach
          production.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🔍</div>
        <h3 class="feature-title">Dependency Graph</h3>
        <p class="feature-description">
          Visualize module dependencies and automatically detect circular dependencies that can
          cause issues.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3 class="feature-title">AI-Powered Suggestions</h3>
        <p class="feature-description">
          Get intelligent optimization recommendations to reduce bundle size and improve
          performance.
        </p>
      </div>

      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3 class="feature-title">Multi-Bundler Support</h3>
        <p class="feature-description">
          Works seamlessly with Vite, Next.js, Webpack, Rollup, and other popular JavaScript
          bundlers.
        </p>
      </div>
    </div>
  </section>

  <!-- Quick Start Section -->
  <section id="quick-start" class="quick-start">
    <h2 class="section-title">Quick Start</h2>
    <div class="quick-start-content">
      <div class="installation-step">
        <h3 class="step-title">1. Install the plugin</h3>
        <pre class="code-block"><code>npm install smappy-plugin --save-dev</code></pre>
      </div>

      <div class="installation-step">
        <h3 class="step-title">2. Configure your bundler</h3>
        <pre class="code-block"><code
            >{`// vite.config.js
import { smappyPlugin } from 'smappy-plugin';

export default {
  plugins: [smappyPlugin()]
};`}</code
          ></pre>
      </div>

      <div class="installation-step">
        <h3 class="step-title">3. Run your build</h3>
        <pre class="code-block"><code>npm run build</code></pre>
      </div>

      <div class="installation-step">
        <h3 class="step-title">4. View the dashboard</h3>
        <p class="step-description">
          Visit <a href="/dashboard" class="text-link">the dashboard</a> to see your bundle analysis
        </p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-links">
        <a
          href="https://github.com/hybrist/smappy"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link">GitHub</a
        >
        <a href="/dashboard" class="footer-link">Dashboard</a>
        <a
          href="https://github.com/hybrist/smappy/blob/main/docs/bundler-integration/README.md"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link">Documentation</a
        >
      </div>
      <p class="footer-version">Smappy v0.0.1</p>
    </div>
  </footer>
</div>

<style>
  .landing-page {
    min-height: 100vh;
    background-color: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .landing-page {
      background-color: #111827;
    }
  }

  /* Hero Section */
  .hero {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    padding: 4rem 1.5rem;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  }

  .hero-content {
    max-width: 48rem;
    text-align: center;
  }

  .hero-title {
    margin-bottom: 1rem;
    font-size: 3.75rem;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.025em;
  }

  @media (max-width: 640px) {
    .hero-title {
      font-size: 2.5rem;
    }
  }

  .hero-tagline {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 500;
    color: #dbeafe;
  }

  @media (max-width: 640px) {
    .hero-tagline {
      font-size: 1.25rem;
    }
  }

  .hero-description {
    margin-bottom: 2rem;
    font-size: 1.125rem;
    line-height: 1.75;
    color: #bfdbfe;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-primary {
    cursor: pointer;
    border-radius: 0.5rem;
    background-color: #ffffff;
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #2563eb;
    border: none;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2);
  }

  .btn-secondary {
    cursor: pointer;
    border-radius: 0.5rem;
    border: 2px solid #ffffff;
    background-color: transparent;
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
    text-decoration: none;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Features Section */
  .features {
    padding: 5rem 1.5rem;
    max-width: 72rem;
    margin: 0 auto;
  }

  .section-title {
    margin-bottom: 3rem;
    text-align: center;
    font-size: 2.25rem;
    font-weight: 700;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .section-title {
      color: #ffffff;
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  @media (min-width: 768px) {
    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .feature-card {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 2rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: box-shadow 0.2s;
  }

  .feature-card:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .feature-card {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .feature-icon {
    margin-bottom: 1rem;
    font-size: 2.5rem;
  }

  .feature-title {
    margin-bottom: 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .feature-title {
      color: #ffffff;
    }
  }

  .feature-description {
    line-height: 1.625;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .feature-description {
      color: #9ca3af;
    }
  }

  /* Quick Start Section */
  .quick-start {
    padding: 5rem 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  .quick-start-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .installation-step {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .installation-step {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .step-title {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .step-title {
      color: #ffffff;
    }
  }

  .step-description {
    line-height: 1.625;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .step-description {
      color: #9ca3af;
    }
  }

  .code-block {
    border-radius: 0.375rem;
    background-color: #111827;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  @media (prefers-color-scheme: dark) {
    .code-block {
      background-color: #030712;
    }
  }

  .code-block code {
    color: #e5e7eb;
  }

  .text-link {
    color: #2563eb;
    text-decoration: underline;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .text-link {
      color: #60a5fa;
    }
  }

  /* Footer */
  .footer {
    border-top: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 3rem 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .footer {
      border-top-color: #374151;
      background-color: #1f2937;
    }
  }

  .footer-content {
    max-width: 72rem;
    margin: 0 auto;
    text-align: center;
  }

  .footer-links {
    display: flex;
    gap: 2rem;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .footer-link {
    color: #4b5563;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;
  }

  .footer-link:hover {
    color: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .footer-link {
      color: #9ca3af;
    }

    .footer-link:hover {
      color: #60a5fa;
    }
  }

  .footer-version {
    color: #9ca3af;
    font-size: 0.875rem;
  }

  @media (prefers-color-scheme: dark) {
    .footer-version {
      color: #6b7280;
    }
  }
</style>
