/**
 * About page - demonstrates route-based code splitting
 */

import { Card } from '@/components/Card';

export default function AboutPage() {
  return (
    <div className="container">
      <h1>About</h1>
      <Card title="About This App">
        <p>This is a Next.js fixture application for testing bundle analysis.</p>
        <p>It demonstrates the App Router structure with code splitting.</p>
      </Card>
    </div>
  );
}
