import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    sveltekit: {
      // Mock SvelteKit environment for components that use $app/environment
      browser: true,
    },
  },
};

export default preview;
