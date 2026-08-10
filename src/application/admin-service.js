import bcrypt from 'bcryptjs';
import { UNIT_AVAILABILITY, UNIT_CONDITIONS, USER_ROLES } from '../domain/constants.js';
import { calculateLateFine } from '../domain/loan-rules.js';
import { AuthorizationError, ConflictError, NotFoundError } from '../domain/errors.js';

export class AdminService {
  constructor({ users, units, categories, loans, unitOfWork, clock = () => new Date() }) {
    this.users = users;
    this.units = units;
    this.categories = categories;
    this.loans = loans;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  assertAdmin(user) {
    if (user.role !== USER_ROLES.ADMIN) throw new AuthorizationError();
  }

  dashboard(user) {
    this.assertAdmin(user);
    return this.loans.dashboard();
  }

  listActiveLoans(user) {
    this.assertAdmin(user);
    return this.loans.listActive();
  }

  listHistory(user) {
    this.assertAdmin(user);
    return this.loans.listHistory();
  }

  async returnItem(user, itemId, { returnedCondition, notes = null }) {
    this.assertAdmin(user);

    return this.unitOfWork.run(async ({ loans, units }) => {
      const item = await loans.findItemForReturn(itemId);
      if (!item) throw new NotFoundError('Detail peminjaman tidak ditemukan.');
      if (item.itemStatus !== 'borrowed') throw new ConflictError('Unit ini sudah dikembalikan.');

      const returnedAt = this.clock();
      const { lateDays, fineAmount } = calculateLateFine({
        dueAt: item.dueAt,
        returnedAt,
        finePerDay: item.finePerDay,
      });

      await loans.markReturned(itemId, {
        returnedAt,
        returnedBy: user.id,
        returnedCondition,
        lateDays,
        fineAmount,
        notes,
      });

      const availability = returnedCondition === UNIT_CONDITIONS.DAMAGED
        ? UNIT_AVAILABILITY.MAINTENANCE
        : UNIT_AVAILABILITY.AVAILABLE;
      await units.setAvailability(item.unitId, availability, returnedCondition);
      const loanStatus = await loans.refreshLoanStatus(item.loanId);

      return { itemId, returnedAt, lateDays, fineAmount, loanStatus, availability };
    });
  }

  listUnits(user, query = '') {
    this.assertAdmin(user);
    return this.units.search({ query, onlyAvailable: false });
  }

  createUnit(user, data) {
    this.assertAdmin(user);
    if (data.availabilityStatus === UNIT_AVAILABILITY.BORROWED) {
      throw new ConflictError('Status dipinjam hanya boleh berasal dari transaksi peminjaman.');
    }
    return this.unitOfWork.run(async ({ units }) => {
      const unit = await units.create(data);
      await units.replaceCategories(unit.id, data.categoryIds);
      return unit;
    });
  }

  updateUnit(user, id, data) {
    this.assertAdmin(user);
    return this.unitOfWork.run(async ({ units }) => {
      const current = await units.findByIdForUpdate(id);
      if (!current) throw new NotFoundError('Unit tidak ditemukan.');
      const changesBorrowedState =
        (current.availabilityStatus === UNIT_AVAILABILITY.BORROWED) !==
        (data.availabilityStatus === UNIT_AVAILABILITY.BORROWED);
      if (changesBorrowedState) {
        throw new ConflictError('Status dipinjam hanya dapat berubah melalui proses pinjam atau kembali.');
      }
      const unit = await units.update(id, data);
      await units.replaceCategories(unit.id, data.categoryIds);
      return unit;
    });
  }

  async deleteUnit(user, id) {
    this.assertAdmin(user);
    const deleted = await this.units.softDelete(id);
    if (!deleted) throw new ConflictError('Unit tidak ditemukan atau masih sedang dipinjam.');
  }

  listCategories(user) {
    this.assertAdmin(user);
    return this.categories.list();
  }

  createCategory(user, data) {
    this.assertAdmin(user);
    return this.categories.create(data);
  }

  async updateCategory(user, id, data) {
    this.assertAdmin(user);
    const category = await this.categories.update(id, data);
    if (!category) throw new NotFoundError('Kategori tidak ditemukan.');
    return category;
  }

  async deleteCategory(user, id) {
    this.assertAdmin(user);
    const deleted = await this.categories.softDelete(id);
    if (!deleted) throw new NotFoundError('Kategori tidak ditemukan.');
  }

  listMembers(user) {
    this.assertAdmin(user);
    return this.users.listMembers();
  }

  async createMember(user, data) {
    this.assertAdmin(user);
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.users.create({ ...data, role: USER_ROLES.MEMBER, passwordHash });
  }

  async updateMember(user, id, data) {
    this.assertAdmin(user);
    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;
    const member = await this.users.updateMember(id, { ...data, passwordHash });
    if (!member) throw new NotFoundError('Anggota tidak ditemukan.');
    return member;
  }

  async deleteMember(user, id) {
    this.assertAdmin(user);
    const activeItems = await this.loans.countActiveItems(id);
    if (activeItems > 0) throw new ConflictError('Anggota masih mempunyai unit aktif.');
    const deleted = await this.users.softDeleteMember(id);
    if (!deleted) throw new NotFoundError('Anggota tidak ditemukan.');
  }
}
