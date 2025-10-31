# Smappy

A tool to explore a set of bundled chunks based on their source maps.
It can show both high level size breakdowns and usage down to specific functions.

## Architecture

Smappy uses Angular 20 with Server-Side Rendering (SSR) and stores bundle data in a SQLite database on the server. The application consists of:

- **Frontend**: Angular standalone components with Tailwind CSS
- **Backend**: Express server with SQLite database (`better-sqlite3`)
- **Storage**: Server-side SQLite database
- **API**: REST endpoints at `/api/bundles/*` for bundle management

## Development

### Development Server

To start the development server, run:

```bash
pnpm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

**Note**: In development mode, the SSR server runs with hot-reload support. API endpoints are available and database changes persist in `./data/smappy.db`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Production Build & Deployment

To build the project for production:

```bash
pnpm run build
```

This will compile your project and store the build artifacts in the `dist/` directory, including:
- Browser bundles in `dist/smappy/browser/`
- Server bundles in `dist/smappy/server/`

To start the production server:

```bash
node dist/smappy/server/server.mjs
```

The server listens on port 4000 by default (configurable via `PORT` environment variable).

### Database

The SQLite database is stored in `./data/smappy.db` and contains:
- **bundles** table: Bundle metadata (id, name, importedAt)
- **bundle_files** table: File references (bundleId, name, storagePath)
- **file_contents** table: Actual file content (bundleId, storagePath, content)

The database is automatically created on first run.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
