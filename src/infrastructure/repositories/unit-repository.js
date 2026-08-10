function mapUnit(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    unitCode: row.unit_code,
    name: row.name,
    description: row.description,
    conditionStatus: row.condition_status,
    availabilityStatus: row.availability_status,
    finePerDay: Number(row.fine_per_day),
    categories: Array.isArray(row.categories) ? row.categories.map((category) => ({
      id: Number(category.id),
      name: category.name,
    })) : [],
  };
}

export class PostgresUnitRepository {
  constructor(database) {
    this.database = database;
  }

  async search({ query = '', onlyAvailable = false } = {}) {
    const result = await this.database.query(
      `SELECT u.*,
         COALESCE(
           JSONB_AGG(JSONB_BUILD_OBJECT('id', c.id, 'name', c.name) ORDER BY c.name)
             FILTER (WHERE c.id IS NOT NULL),
           '[]'::jsonb
         ) AS categories
       FROM units u
       LEFT JOIN unit_categories uc ON uc.unit_id = u.id
       LEFT JOIN categories c ON c.id = uc.category_id AND c.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
         AND ($1 = '' OR u.name ILIKE '%' || $1 || '%' OR u.unit_code ILIKE '%' || $1 || '%')
         AND (NOT $2::boolean OR u.availability_status = 'available')
       GROUP BY u.id
       ORDER BY (u.availability_status = 'available') DESC, u.name, u.unit_code`,
      [query.trim(), onlyAvailable],
    );
    return result.rows.map(mapUnit);
  }

  async findAvailableByIdsForUpdate(ids) {
    const result = await this.database.query(
      `SELECT * FROM units
       WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL
       ORDER BY id
       FOR UPDATE`,
      [ids],
    );
    return result.rows.map(mapUnit);
  }

  async findByIdForUpdate(id) {
    const result = await this.database.query(
      'SELECT * FROM units WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
      [id],
    );
    return mapUnit(result.rows[0]);
  }

  async create({ unitCode, name, description, conditionStatus, availabilityStatus, finePerDay }) {
    const result = await this.database.query(
      `INSERT INTO units
         (unit_code, name, description, condition_status, availability_status, fine_per_day)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [unitCode, name, description, conditionStatus, availabilityStatus, finePerDay],
    );
    return mapUnit(result.rows[0]);
  }

  async update(id, { unitCode, name, description, conditionStatus, availabilityStatus, finePerDay }) {
    const result = await this.database.query(
      `UPDATE units SET
         unit_code = $2,
         name = $3,
         description = $4,
         condition_status = $5,
         availability_status = $6,
         fine_per_day = $7
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, unitCode, name, description, conditionStatus, availabilityStatus, finePerDay],
    );
    return mapUnit(result.rows[0]);
  }

  async replaceCategories(unitId, categoryIds) {
    await this.database.query('DELETE FROM unit_categories WHERE unit_id = $1', [unitId]);
    if (categoryIds.length === 0) return;
    await this.database.query(
      `INSERT INTO unit_categories (unit_id, category_id)
       SELECT $1, UNNEST($2::bigint[])`,
      [unitId, categoryIds],
    );
  }

  async setAvailability(id, availabilityStatus, conditionStatus = null) {
    const result = await this.database.query(
      `UPDATE units
       SET availability_status = $2,
           condition_status = COALESCE($3, condition_status)
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, availabilityStatus, conditionStatus],
    );
    return mapUnit(result.rows[0]);
  }

  async softDelete(id) {
    const result = await this.database.query(
      `UPDATE units
       SET deleted_at = NOW(), availability_status = 'inactive'
       WHERE id = $1 AND deleted_at IS NULL AND availability_status <> 'borrowed'
       RETURNING id`,
      [id],
    );
    return result.rowCount > 0;
  }
}
