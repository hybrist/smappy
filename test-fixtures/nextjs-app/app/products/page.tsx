/**
 * Products page - demonstrates dynamic routes and code splitting
 */

import { ProductList } from '@/components/ProductList';

export default function ProductsPage() {
  return (
    <div className="container">
      <h1>Products</h1>
      <ProductList />
    </div>
  );
}
