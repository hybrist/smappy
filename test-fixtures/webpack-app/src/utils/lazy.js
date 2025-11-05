/**
 * Lazy-loaded module for code splitting demo
 */

export function lazyFunction() {
  console.log('This is a lazy-loaded function');
}

export class LazyClass {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return `Hello from ${this.name}`;
  }
}
