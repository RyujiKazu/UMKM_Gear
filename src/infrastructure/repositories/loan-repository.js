function mapLoanRow(row) {
  return {
    loanId: Number(row.loan_id),
    loanCode: row.loan_code,
    memberId: Number(row.user_id),
    memberName: row.member_name,
    memberEmail: row.member_email,
    borrowedAt: row.borrowed_at,
    dueAt: row.due_at,
    loanStatus: row.loan_status,
    notes: row.notes,
    itemId: Number(row.item_id),
    unitId: Number(row.unit_id),
    unitCode: row.unit_code,
    unitName: row.unit_name,
    itemStatus: row.item_status,
    borrowedCondition: row.borrowed_condition,
    returnedAt: row.returned_at,
    returnedCondition: row.returned_condition,
    returnedByName: row.returned_by_name,
    lateDays: Number(row.late_days),
    fineAmount: Number(row.fine_amount),
    finePerDay: Number(row.fine_per_day_snapshot),
    isOverdue: row.is_overdue,
  };
}

const loanDetailQuery = `
  SELECT l.id AS loan_id, l.loan_code, l.user_id, member.name AS member_name,
    member.email AS member_email, l.borrowed_at, l.due_at, l.status AS loan_status, l.notes,
    li.id AS item_id, li.unit_id, u.unit_code, u.name AS unit_name,
    li.status AS item_status, li.borrowed_condition, li.fine_per_day_snapshot,
    li.returned_at, li.returned_condition, li.late_days, li.fine_amount,
    admin.name AS returned_by_name,
    (li.status = 'borrowed' AND l.due_at < NOW()) AS is_overdue
  FROM loans l
  JOIN users member ON member.id = l.user_id
  JOIN loan_items li ON li.loan_id = l.id
  JOIN units u ON u.id = li.unit_id
  LEFT JOIN users admin ON admin.id = li.returned_by
`;

export class PostgresLoanRepository {
  constructor(database) {
    this.database = database;
  }

  async lockMember(userId) {
    await this.database.query('SELECT pg_advisory_xact_lock($1::bigint)', [userId]);
  }

  async countActiveItems(userId) {
    const result = await this.database.query(
      `SELECT COUNT(*)::int AS total
       FROM loan_items li
       JOIN loans l ON l.id = li.loan_id
       WHERE l.user_id = $1 AND li.status = 'borrowed'`,
      [userId],
    );
    return Number(result.rows[0].total);
  }

  async create({ loanCode, userId, borrowedAt, dueAt, notes }) {
    const result = await this.database.query(
      `INSERT INTO loans (loan_code, user_id, borrowed_at, due_at, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [loanCode, userId, borrowedAt, dueAt, notes],
    );
    return result.rows[0];
  }

  async addItem({ loanId, unitId, borrowedCondition, finePerDay }) {
    const result = await this.database.query(
      `INSERT INTO loan_items
         (loan_id, unit_id, borrowed_condition, fine_per_day_snapshot)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [loanId, unitId, borrowedCondition, finePerDay],
    );
    return Number(result.rows[0].id);
  }

  async listMine(userId) {
    const result = await this.database.query(
      `${loanDetailQuery}
       WHERE l.user_id = $1
       ORDER BY l.borrowed_at DESC, li.id`,
      [userId],
    );
    return result.rows.map(mapLoanRow);
  }

  async listActive() {
    const result = await this.database.query(
      `${loanDetailQuery}
       WHERE li.status = 'borrowed'
       ORDER BY is_overdue DESC, l.due_at, l.borrowed_at`,
    );
    return result.rows.map(mapLoanRow);
  }

  async listHistory() {
    const result = await this.database.query(
      `${loanDetailQuery}
       ORDER BY l.borrowed_at DESC, l.id DESC, li.id`,
    );
    return result.rows.map(mapLoanRow);
  }

  async findItemForReturn(itemId) {
    const result = await this.database.query(
      `${loanDetailQuery}
       WHERE li.id = $1
       FOR UPDATE OF li, u`,
      [itemId],
    );
    return result.rows[0] ? mapLoanRow(result.rows[0]) : null;
  }

  async markReturned(itemId, { returnedAt, returnedBy, returnedCondition, lateDays, fineAmount, notes }) {
    await this.database.query(
      `UPDATE loan_items SET
         status = 'returned',
         returned_at = $2,
         returned_by = $3,
         returned_condition = $4,
         late_days = $5,
         fine_amount = $6,
         return_notes = $7
       WHERE id = $1`,
      [itemId, returnedAt, returnedBy, returnedCondition, lateDays, fineAmount, notes],
    );
  }

  async refreshLoanStatus(loanId) {
    const result = await this.database.query(
      `UPDATE loans l SET status = CASE
         WHEN NOT EXISTS (
           SELECT 1 FROM loan_items li WHERE li.loan_id = l.id AND li.status = 'borrowed'
         ) THEN 'completed'
         WHEN EXISTS (
           SELECT 1 FROM loan_items li WHERE li.loan_id = l.id AND li.status = 'returned'
         ) THEN 'partially_returned'
         ELSE 'active'
       END
       WHERE l.id = $1
       RETURNING status`,
      [loanId],
    );
    return result.rows[0]?.status;
  }

  async dashboard() {
    const result = await this.database.query(`
      SELECT
        (SELECT COUNT(*) FROM units WHERE deleted_at IS NULL) AS total_units,
        (SELECT COUNT(*) FROM units WHERE deleted_at IS NULL AND availability_status = 'available') AS available_units,
        (SELECT COUNT(*) FROM loan_items WHERE status = 'borrowed') AS borrowed_units,
        (SELECT COUNT(*) FROM loan_items li JOIN loans l ON l.id = li.loan_id
          WHERE li.status = 'borrowed' AND l.due_at < NOW()) AS overdue_units,
        (SELECT COUNT(*) FROM users WHERE role = 'member' AND deleted_at IS NULL) AS total_members
    `);
    const row = result.rows[0];
    return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
  }
}
