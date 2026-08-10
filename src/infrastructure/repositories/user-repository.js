function mapUser(row, includePassword = false) {
  if (!row) return null;
  const user = {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
  if (includePassword) user.passwordHash = row.password_hash;
  return user;
}

export class PostgresUserRepository {
  constructor(database) {
    this.database = database;
  }

  async findByEmail(email) {
    const result = await this.database.query(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
       LIMIT 1`,
      [email],
    );
    return mapUser(result.rows[0], true);
  }

  async findById(id) {
    const result = await this.database.query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    return mapUser(result.rows[0]);
  }

  async listMembers() {
    const result = await this.database.query(
      `SELECT u.*, p.business_name, p.phone
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.role = 'member' AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
    );
    return result.rows.map((row) => ({
      ...mapUser(row),
      businessName: row.business_name,
      phone: row.phone,
    }));
  }

  async create({ name, email, passwordHash, role = 'member', isActive = true }) {
    const result = await this.database.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING *`,
      [name, email, passwordHash, role, isActive],
    );
    return mapUser(result.rows[0]);
  }

  async updateMember(id, { name, email, passwordHash, isActive }) {
    const result = await this.database.query(
      `UPDATE users
       SET name = $2,
           email = LOWER($3),
           password_hash = COALESCE($4, password_hash),
           is_active = $5
       WHERE id = $1 AND role = 'member' AND deleted_at IS NULL
       RETURNING *`,
      [id, name, email, passwordHash, isActive],
    );
    return mapUser(result.rows[0]);
  }

  async softDeleteMember(id) {
    const result = await this.database.query(
      `UPDATE users
       SET deleted_at = NOW(), is_active = FALSE
       WHERE id = $1 AND role = 'member' AND deleted_at IS NULL
       RETURNING id`,
      [id],
    );
    return result.rowCount > 0;
  }
}
