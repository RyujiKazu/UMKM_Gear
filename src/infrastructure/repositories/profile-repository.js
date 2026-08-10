function mapProfile(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    businessName: row.business_name,
    businessType: row.business_type,
    phone: row.phone,
    address: row.address,
    updatedAt: row.updated_at,
  };
}

export class PostgresProfileRepository {
  constructor(database) {
    this.database = database;
  }

  async findByUserId(userId) {
    const result = await this.database.query('SELECT * FROM profiles WHERE user_id = $1 LIMIT 1', [userId]);
    return mapProfile(result.rows[0]);
  }

  async upsert(userId, { businessName, businessType, phone, address }) {
    const result = await this.database.query(
      `INSERT INTO profiles (user_id, business_name, business_type, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         business_type = EXCLUDED.business_type,
         phone = EXCLUDED.phone,
         address = EXCLUDED.address
       RETURNING *`,
      [userId, businessName, businessType, phone, address],
    );
    return mapProfile(result.rows[0]);
  }
}
