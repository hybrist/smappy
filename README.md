# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Keyboard Shortcuts

Smappy includes keyboard shortcuts for power users to navigate quickly:

### Navigation

- `1` - Go to Overview tab
- `2` - Go to Dependencies tab
- `3` - Go to Compare tab
- `4` - Go to Suggestions tab
- `G` then `D` - Go to Dashboard home
- `G` then `H` - Go to Home

### Help

- `?` - Show keyboard shortcuts help modal
- `Esc` - Close modals / Clear focus

Press `?` while using the dashboard to see all available shortcuts.

## Contributing

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) for the complete contributor workflow, tooling setup, and pull request checklist.
