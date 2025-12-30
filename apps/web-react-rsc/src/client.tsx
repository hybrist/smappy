'use client';

import React, { startTransition } from 'react';

import { updateServerCounter } from './action';

export function ClientCounter() {
  const [count, setCount] = React.useState(0);

  return (
    <button onClick={() => setCount((count) => count + 1)}>
      Client Counter: {count}
    </button>
  );
}

export function WrappedServerCounter({count, children} : { count: number, children: React.ReactNode }) {
  return (
    <button onClick={() => {
      startTransition(async () => {
        await updateServerCounter(1);
      });
    }}>
      Wrapped Server Counter: {count}
      {children}
    </button>
  );
}
