/**
 * Lazy-loaded component for code splitting demo
 */

import React from 'react';

export default function LazyComponent() {
  return (
    <div className="lazy-component">
      <h3>This is a lazy-loaded component</h3>
      <p>Loaded via React.lazy() for code splitting</p>
    </div>
  );
}
