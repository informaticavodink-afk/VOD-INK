# VOD-INK

## Development prerequisites

- Node.js 24.x is the application runtime.
- Bun 1.4.0 is the package manager and task runner.
- Docker is required for the local Supabase release gate.

Install the exact locked dependencies:

```sh
bun install --frozen-lockfile
```

Run the standard checks:

```sh
bun run test
bun run lint
bun run build
```

Run the local Supabase CLI from the pinned project dependency, without allowing
an implicit download:

```sh
bunx --no-install supabase --version
```

Historical implementation evidence retains the package-manager commands that
were executed at the time; it is not current setup guidance.
