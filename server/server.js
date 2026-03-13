import app from './src/app.js';
import { loadEnv } from './src/config/env.js';

loadEnv();

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
