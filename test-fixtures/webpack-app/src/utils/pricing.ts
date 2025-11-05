/**
 * Pricing utility functions (TypeScript)
 */

export interface PriceOptions {
  discount?: number;
  tax?: number;
}

export function calculatePrice(basePrice: number, discount: number = 0): number {
  const discountedPrice = basePrice * (1 - discount);
  return Math.round(discountedPrice * 100) / 100;
}

export function calculateTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Unused export for tree-shaking test
export function unusedHelper() {
  return 'never used';
}
