/**
 * Dynamic product page - demonstrates dynamic routes
 */

import { Card } from "@/components/Card";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  return (
    <div className="container">
      <h1>Product {id}</h1>
      <Card title="Product Details">
        <p>Product ID: {id}</p>
        <p>This is a dynamic route page.</p>
      </Card>
    </div>
  );
}
