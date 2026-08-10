import { config } from '../infrastructure/config/env.js';
import { createApp } from './app.js';
import { container } from './container.js';

try {
  await container.database.query('SELECT 1');
  const app = createApp(container);
  app.listen(config.port, () => {
    console.log(`UMKM Gear berjalan di http://localhost:${config.port}`);
  });
} catch (error) {
  console.error('Aplikasi gagal terhubung ke PostgreSQL:', error.message);
  process.exit(1);
}
