/**
 * Main entry point for the Webpack fixture app
 */

import { Button } from './components/Button.js';
import { calculatePrice } from './utils/pricing.js';
import { formatDate } from './utils/date.js';
import './styles/main.css';

// Third-party dependency
import { debounce } from 'lodash';

// Initialize the app
function init() {
  const button = new Button('Click me');
  button.render();

  // Example usage of utilities
  const price = calculatePrice(100, 0.2);
  console.log(`Price: $${price}`);

  const date = formatDate(new Date());
  console.log(`Today: ${date}`);

  // Example of debounced function
  const debouncedLog = debounce(() => {
    console.log('Debounced action');
  }, 300);

  document.addEventListener('click', debouncedLog);
}

// Dynamic import example
async function loadLazyModule() {
  const { lazyFunction } = await import('./utils/lazy.js');
  lazyFunction();
}

// Export for potential tree-shaking test
export function unusedExport() {
  console.log('This export is never used');
}

export { Button, calculatePrice };

if (typeof window !== 'undefined') {
  init();
  loadLazyModule();
}
