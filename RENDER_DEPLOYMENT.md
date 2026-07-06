# Render Deployment

Railway is no longer usable for the live demo if the free trial credits are exhausted. Use Render for the API and a separate MySQL-compatible database host.

## Render Web Service

- Repository: `devTianaCodes/chocolate_backend`
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

The included `render.yaml` sets these values for a Blueprint deploy.

## Required Environment Variables

Set these in Render:

```text
CLIENT_URL=https://chocolate-frontend-one.vercel.app
DB_HOST=<mysql-host>
DB_PORT=3306
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_NAME=<mysql-database>
JWT_ACCESS_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
STRIPE_SECRET_KEY=<stripe-test-or-live-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
```

## Seed The Database

After the Render service can connect to MySQL, import the SQL seed files once. This is the path that keeps the full product catalogue available in the live demo.

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/schema.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/seeds/categories.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/seeds/sample_products.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/seeds/product_images_seed.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/seeds/shipping_methods.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/seeds/admin_user.sql
```

The `db/seeds/sample_products.sql` file contains the larger product set for the live Chocolate Craft House catalogue.

## Connect Frontend

In Vercel for the Chocolate frontend, set:

```text
VITE_API_URL=https://<render-chocolate-api-url>/api
```

Then redeploy the frontend.
