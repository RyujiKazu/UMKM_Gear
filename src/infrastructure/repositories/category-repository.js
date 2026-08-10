function mapCategory(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    unitCount: row.unit_count === undefined ? undefined : Number(row.unit_count),
  };
}

export class PostgresCategoryRepository {
  constructor(database) {
    this.database = database;
  }

  async list() {
    const result = await this.database.query(
      `SELECT c.*, COUNT(u.id) AS unit_count
       FROM categories c
       LEFT JOIN unit_categories uc ON uc.category_id = c.id
       LEFT JOIN units u ON u.id = uc.unit_id AND u.deleted_at IS NULL
       WHERE c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.name`,
    );
    return result.rows.map(mapCategory);
  }

  async create({ name, description = null }) {
    const result = await this.database.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description],
    );
    return mapCategory(result.rows[0]);
  }

  async update(id, { name, description = null }) {
    const result = await this.database.query(
      `UPDATE categories SET name = $2, description = $3
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id, name, description],
    );
    return mapCategory(result.rows[0]);
  }

  async softDelete(id) {
    const result = await this.database.query(
      'UPDATE categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [id],
    );
    return result.rowCount > 0;
  }
}
