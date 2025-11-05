/**
 * Vendor entry point - demonstrates code splitting
 */

import { debounce, throttle } from 'lodash';

export function setupVendorFeatures() {
  const throttledScroll = throttle(() => {
    console.log('Scrolling');
  }, 100);

  const debouncedResize = debounce(() => {
    console.log('Window resized');
  }, 300);

  window.addEventListener('scroll', throttledScroll);
  window.addEventListener('resize', debouncedResize);
}

setupVendorFeatures();
