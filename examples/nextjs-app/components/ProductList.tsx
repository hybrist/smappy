/**
 * Product list component - demonstrates client component
 */

'use client';

import React, { useState } from 'react';
import { Card } from './Card';

const products = [
  { id: '1', name: 'Product A', price: 99.99 },
  { id: '2', name: 'Product B', price: 149.99 },
  { id: '3', name: 'Product C', price: 199.99 },
];

export function ProductList() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card title="Product List">
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            <button onClick={() => setSelected(product.id)}>
              {product.name} - ${product.price}
            </button>
            {selected === product.id && <span> (Selected)</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
