/**
 * Dynamic product page - demonstrates dynamic routes
 */

import { Card } from '@/components/Card';

interface ProductPageProps {
  params: {
    id: string;
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="container">
      <h1>Product {params.id}</h1>
      <Card title="Product Details">
        <p>Product ID: {params.id}</p>
        <p>This is a dynamic route page.</p>
      </Card>
    </div>
  );
}
