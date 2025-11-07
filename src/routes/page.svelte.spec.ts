import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
  it('should render hero title', async () => {
    render(Page);

    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeInTheDocument();
    await expect.element(heading).toHaveTextContent('Smappy');
  });

  it('should render tagline', async () => {
    render(Page);

    const tagline = page.getByText(/Visualize, analyze, and optimize/);
    await expect.element(tagline).toBeInTheDocument();
  });

  it('should have dashboard button', async () => {
    render(Page);

    const button = page.getByRole('button', { name: /View Dashboard/ });
    await expect.element(button).toBeInTheDocument();
  });

  it('should have get started link', async () => {
    render(Page);

    const link = page.getByRole('link', { name: /Get Started/ });
    await expect.element(link).toBeInTheDocument();
  });

  it('should render features section', async () => {
    render(Page);

    const features = page.getByRole('heading', { name: /Key Features/ });
    await expect.element(features).toBeInTheDocument();
  });

  it('should render quick start section', async () => {
    render(Page);

    const quickStart = page.getByRole('heading', { name: /Quick Start/ });
    await expect.element(quickStart).toBeInTheDocument();
  });
});
