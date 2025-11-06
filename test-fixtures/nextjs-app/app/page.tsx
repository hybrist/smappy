/**
 * Home page for Next.js app router
 */

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { formatCurrency } from '@/utils/helpers';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="container">
      <h1>Next.js Fixture App</h1>
      <div className="grid">
        <Card title="Home Page">
          <p>Welcome to the Next.js fixture application</p>
          <Button>Click Me</Button>
        </Card>
        <Card title="Price Formatter">
          <p>Formatted: {formatCurrency(1234.56)}</p>
        </Card>
        <Card title="Navigation">
          <Link href="/about">About Page</Link>
          <br />
          <Link href="/products">Products</Link>
        </Card>
      </div>
    </main>
  );
}
