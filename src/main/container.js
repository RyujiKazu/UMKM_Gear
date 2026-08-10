import { AdminService } from '../application/admin-service.js';
import { AuthService } from '../application/auth-service.js';
import { CatalogService } from '../application/catalog-service.js';
import { LoanService } from '../application/loan-service.js';
import { ProfileService } from '../application/profile-service.js';
import { config } from '../infrastructure/config/env.js';
import { pool } from '../infrastructure/database/pool.js';
import { PostgresUnitOfWork } from '../infrastructure/database/unit-of-work.js';
import { PostgresCategoryRepository } from '../infrastructure/repositories/category-repository.js';
import { PostgresLoanRepository } from '../infrastructure/repositories/loan-repository.js';
import { PostgresProfileRepository } from '../infrastructure/repositories/profile-repository.js';
import { PostgresUnitRepository } from '../infrastructure/repositories/unit-repository.js';
import { PostgresUserRepository } from '../infrastructure/repositories/user-repository.js';
import { JwtTokenService } from '../infrastructure/security/token-service.js';

const repositories = {
  users: new PostgresUserRepository(pool),
  profiles: new PostgresProfileRepository(pool),
  categories: new PostgresCategoryRepository(pool),
  units: new PostgresUnitRepository(pool),
  loans: new PostgresLoanRepository(pool),
};

const unitOfWork = new PostgresUnitOfWork(pool);

export const container = {
  database: pool,
  tokenService: new JwtTokenService(config.auth),
  authConfig: config.auth,
  services: {
    auth: new AuthService({ users: repositories.users }),
    catalog: new CatalogService({ units: repositories.units, categories: repositories.categories }),
    profile: new ProfileService({ profiles: repositories.profiles }),
    loan: new LoanService({ loans: repositories.loans, unitOfWork }),
    admin: new AdminService({ ...repositories, unitOfWork }),
  },
};
