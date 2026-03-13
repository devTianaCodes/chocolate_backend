import { loadEnv } from './src/config/env.js';

loadEnv();

const { default: app } = await import('./src/app.js');
const { testConnection } = await import('./src/config/db.js');

await testConnection();

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
