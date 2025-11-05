/**
 * Main App component for Vite fixture
 */

import React, { useState } from 'react';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { formatCurrency } from './utils/helpers';
import { APP_NAME } from './utils/constants';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>{APP_NAME}</h1>
      <Card title="Counter">
        <p>Count: {count}</p>
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        <Button onClick={() => setCount(0)}>Reset</Button>
      </Card>
      <Card title="Price Formatter">
        <p>Formatted: {formatCurrency(1234.56)}</p>
      </Card>
    </div>
  );
}
