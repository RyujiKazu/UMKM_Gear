import bcrypt from 'bcryptjs';
import { assertSafeDatabaseName, config } from '../src/infrastructure/config/env.js';
import { pool } from '../src/infrastructure/database/pool.js';

assertSafeDatabaseName();

const categories = [
  ['Produksi Makanan', 'Alat untuk mengolah dan memproduksi makanan.'],
  ['Pengemasan', 'Alat untuk menimbang, menyegel, dan memberi label produk.'],
  ['Foto Produk', 'Peralatan untuk membuat materi foto dan video produk.'],
  ['Perlengkapan Bazar', 'Peralatan untuk penjualan langsung dan pameran UMKM.'],
  ['Kerajinan', 'Alat produksi untuk usaha fesyen dan kerajinan tangan.'],
];

const units = [
  { code: 'MIX-001', name: 'Mixer Planetary 7L', category: 'Produksi Makanan', fine: 25000, description: 'Mixer adonan kapasitas 7 liter.' },
  { code: 'MIX-002', name: 'Mixer Planetary 7L', category: 'Produksi Makanan', fine: 25000, description: 'Unit kedua untuk produksi kue skala rumahan.' },
  { code: 'OVN-001', name: 'Oven Listrik 45L', category: 'Produksi Makanan', fine: 30000, description: 'Oven listrik dengan pengaturan suhu atas dan bawah.' },
  { code: 'BLD-001', name: 'Blender Heavy Duty', category: 'Produksi Makanan', fine: 20000, description: 'Blender untuk bumbu dan minuman.' },
  { code: 'VAC-001', name: 'Vacuum Sealer', category: 'Pengemasan', fine: 18000, description: 'Mesin pengemas vakum makanan kering dan beku.' },
  { code: 'CUP-001', name: 'Cup Sealer', category: 'Pengemasan', fine: 18000, description: 'Mesin penyegel gelas minuman.' },
  { code: 'LBL-001', name: 'Printer Label Thermal', category: 'Pengemasan', fine: 15000, description: 'Printer label produk dan alamat pengiriman.' },
  { code: 'SCL-001', name: 'Timbangan Digital', categories: ['Produksi Makanan', 'Pengemasan'], fine: 10000, description: 'Timbangan presisi untuk produksi dan pengemasan.' },
  { code: 'CAM-001', name: 'Kamera Mirrorless', categories: ['Foto Produk', 'Perlengkapan Bazar'], fine: 50000, description: 'Kamera untuk katalog produk dan konten promosi.' },
  { code: 'LGT-001', name: 'Paket Softbox', category: 'Foto Produk', fine: 20000, description: 'Dua lampu softbox untuk foto produk.' },
  { code: 'TRI-001', name: 'Tripod Kamera', category: 'Foto Produk', fine: 10000, description: 'Tripod aluminium dengan tinggi 160 cm.' },
  { code: 'POS-001', name: 'Paket Kasir Digital', category: 'Perlengkapan Bazar', fine: 30000, description: 'Tablet kasir dan printer struk thermal.' },
  { code: 'DSR-001', name: 'Rak Display Lipat', category: 'Perlengkapan Bazar', fine: 15000, description: 'Rak produk portabel untuk bazar.' },
  { code: 'SEW-001', name: 'Mesin Jahit Portable', category: 'Kerajinan', fine: 25000, description: 'Mesin jahit multifungsi untuk produksi kecil.' },
  { code: 'HPR-001', name: 'Heat Press 38x38', category: 'Kerajinan', fine: 35000, description: 'Mesin press untuk kaus, tote bag, dan produk sublimasi.' },
];

async function ensureUser(client, { name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await client.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
    [email],
  );
  if (existing.rowCount > 0) {
    const result = await client.query(
      `UPDATE users SET name = $2, password_hash = $3, role = $4, is_active = TRUE
       WHERE id = $1 RETURNING id`,
      [existing.rows[0].id, name, passwordHash, role],
    );
    return Number(result.rows[0].id);
  }
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, LOWER($2), $3, $4) RETURNING id`,
    [name, email, passwordHash, role],
  );
  return Number(result.rows[0].id);
}

const client = await pool.connect();
try {
  await client.query('BEGIN');

  await ensureUser(client, {
    name: 'Admin UMKM Gear',
    email: 'admin@umkmgear.local',
    password: 'Admin123!',
    role: 'admin',
  });
  const memberId = await ensureUser(client, {
    name: 'Siti Rahma',
    email: 'member@umkmgear.local',
    password: 'Member123!',
    role: 'member',
  });
  const secondMemberId = await ensureUser(client, {
    name: 'Budi Santoso',
    email: 'budi@umkmgear.local',
    password: 'Member123!',
    role: 'member',
  });

  await client.query(
    `INSERT INTO profiles (user_id, business_name, business_type, phone, address)
     VALUES ($1, 'Dapur Rahma', 'Makanan Olahan', '081234567890', 'Kecamatan Sukamaju')
     ON CONFLICT (user_id) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       business_type = EXCLUDED.business_type,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address`,
    [memberId],
  );
  await client.query(
    `INSERT INTO profiles (user_id, business_name, business_type, phone, address)
     VALUES ($1, 'Kreasi Budi', 'Kerajinan', '081298765432', 'Kecamatan Mekarjaya')
     ON CONFLICT (user_id) DO UPDATE SET
       business_name = EXCLUDED.business_name,
       business_type = EXCLUDED.business_type,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address`,
    [secondMemberId],
  );

  const categoryIds = new Map();
  for (const [name, description] of categories) {
    const existing = await client.query(
      'SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
      [name],
    );
    let id;
    if (existing.rowCount > 0) {
      id = Number(existing.rows[0].id);
      await client.query('UPDATE categories SET description = $2 WHERE id = $1', [id, description]);
    } else {
      const result = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
        [name, description],
      );
      id = Number(result.rows[0].id);
    }
    categoryIds.set(name, id);
  }

  for (const unit of units) {
    const existing = await client.query(
      'SELECT id FROM units WHERE LOWER(unit_code) = LOWER($1) AND deleted_at IS NULL',
      [unit.code],
    );
    let unitId;
    if (existing.rowCount > 0) {
      unitId = Number(existing.rows[0].id);
      await client.query(
        `UPDATE units SET name = $2, description = $3, fine_per_day = $4
         WHERE id = $1`,
        [unitId, unit.name, unit.description, unit.fine],
      );
    } else {
      const result = await client.query(
        `INSERT INTO units (unit_code, name, description, fine_per_day)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [unit.code, unit.name, unit.description, unit.fine],
      );
      unitId = Number(result.rows[0].id);
    }
    const assignedCategories = unit.categories ?? [unit.category];
    for (const categoryName of assignedCategories) {
      await client.query(
        `INSERT INTO unit_categories (unit_id, category_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [unitId, categoryIds.get(categoryName)],
      );
    }
  }

  await client.query('COMMIT');
  console.log(`Seed database ${config.database.name} selesai.`);
  console.log('Akun demo: admin@umkmgear.local dan member@umkmgear.local');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
