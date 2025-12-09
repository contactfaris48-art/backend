import { createApp } from './app';
import { config } from './config';

const app = createApp();

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /users/:id        - Get user by ID`);
  console.log(`  POST /users            - Create new user`);
  console.log(`  GET  /cache-status     - Get cache statistics`);
  console.log(`  DELETE /cache          - Clear cache`);
  console.log(`  GET  /health           - Health check`);
});

