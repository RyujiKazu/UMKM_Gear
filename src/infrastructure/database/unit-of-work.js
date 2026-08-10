import { PostgresCategoryRepository } from '../repositories/category-repository.js';
import { PostgresLoanRepository } from '../repositories/loan-repository.js';
import { PostgresProfileRepository } from '../repositories/profile-repository.js';
import { PostgresUnitRepository } from '../repositories/unit-repository.js';
import { PostgresUserRepository } from '../repositories/user-repository.js';

export class PostgresUnitOfWork {
  constructor(pool) {
    this.pool = pool;
  }

  async run(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const repositories = {
        users: new PostgresUserRepository(client),
        profiles: new PostgresProfileRepository(client),
        categories: new PostgresCategoryRepository(client),
        units: new PostgresUnitRepository(client),
        loans: new PostgresLoanRepository(client),
      };
      const result = await work(repositories);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
