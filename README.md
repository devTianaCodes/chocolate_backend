# Chocolate Backend

## Test And Coverage Policy

Backend quality gates for `chocolate_backend/server/src`:

- overall source coverage target: `80%`
- new or changed backend code target: `90%`

These targets follow common industry guidance:

- `80%` overall is a practical minimum for sustained backend quality
- `90%` on changed code keeps new work from lowering confidence

## Commands

From `chocolate_backend/server`:

```bash
npm test
npm run test:coverage
npm run test:integration:db
```

Changed-code coverage check:

```bash
npm run test:coverage
npm run test:coverage:changed -- --base <git-base-sha>
```

## Real DB Integration Tests

`npm run test:integration:db` runs only when a working test database is available through the normal backend env vars.

Current live DB integration coverage:

- `GET /api/categories`
- `GET /api/products`
- `GET /api/categories/:slug/products`

## CI Enforcement

CI enforces:

- backend unit/integration-focused test suite
- overall backend source coverage at `80%`
- changed backend code coverage at `90%` on pull requests
