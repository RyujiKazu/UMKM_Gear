import 'dotenv/config';

function booleanValue(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

function integerValue(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: integerValue(process.env.PORT, 3000),
  database: {
    host: process.env.DB_HOST ?? 'node1',
    port: integerValue(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME ?? 'umkm_gear_prototipe1',
    adminName: process.env.DB_ADMIN_NAME ?? 'postgres',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    ssl: booleanValue(process.env.DB_SSL),
  },
  auth: {
    secret: process.env.JWT_SECRET ?? 'development-only-change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    secureCookie: process.env.NODE_ENV === 'production',
  },
});

export function assertSafeDatabaseName(name = config.database.name) {
  if (!/^umkm_gear_[a-z0-9_]+$/.test(name)) {
    throw new Error('DB_NAME harus diawali umkm_gear_ dan hanya berisi huruf kecil, angka, atau underscore.');
  }

  if (['postgres', 'template0', 'template1'].includes(name)) {
    throw new Error('Database sistem tidak boleh dijadikan target aplikasi.');
  }
}
