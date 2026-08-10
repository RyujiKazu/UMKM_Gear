import pg from 'pg';
import { assertSafeDatabaseName, config } from '../src/infrastructure/config/env.js';

const { Client } = pg;

assertSafeDatabaseName();

const client = new Client({
  host: config.database.host,
  port: config.database.port,
  database: config.database.adminName,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5_000,
});

try {
  await client.connect();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.database.name]);

  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${config.database.name}"`);
    console.log(`Database ${config.database.name} berhasil dibuat.`);
  } else {
    console.log(`Database ${config.database.name} sudah ada; tidak ada perubahan.`);
  }
} finally {
  await client.end();
}
