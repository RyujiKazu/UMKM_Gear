import { randomBytes } from 'node:crypto';
import { UNIT_AVAILABILITY } from '../domain/constants.js';
import { assertCanBorrow } from '../domain/loan-rules.js';
import { ConflictError, NotFoundError } from '../domain/errors.js';

function createLoanCode(now) {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `LN-${date}-${suffix}`;
}

export class LoanService {
  constructor({ loans, unitOfWork, clock = () => new Date() }) {
    this.loans = loans;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  listMine(user) {
    return this.loans.listMine(user.id);
  }

  async borrow(user, { unitIds, durationDays, notes = null }) {
    const normalizedIds = unitIds.map(Number);

    return this.unitOfWork.run(async ({ loans, units }) => {
      await loans.lockMember(user.id);
      const activeItemCount = await loans.countActiveItems(user.id);
      assertCanBorrow({
        user,
        activeItemCount,
        requestedUnitIds: normalizedIds,
        durationDays,
      });

      const selectedUnits = await units.findAvailableByIdsForUpdate(normalizedIds);
      if (selectedUnits.length !== normalizedIds.length) {
        throw new NotFoundError('Salah satu unit tidak ditemukan.');
      }

      const unavailable = selectedUnits.find(
        (unit) => unit.availabilityStatus !== UNIT_AVAILABILITY.AVAILABLE,
      );
      if (unavailable) {
        throw new ConflictError(`${unavailable.name} (${unavailable.unitCode}) sedang tidak tersedia.`);
      }

      const borrowedAt = this.clock();
      const dueAt = new Date(borrowedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const loan = await loans.create({
        loanCode: createLoanCode(borrowedAt),
        userId: user.id,
        borrowedAt,
        dueAt,
        notes,
      });

      const itemIds = [];
      for (const unit of selectedUnits) {
        const itemId = await loans.addItem({
          loanId: loan.id,
          unitId: unit.id,
          borrowedCondition: unit.conditionStatus,
          finePerDay: unit.finePerDay,
        });
        itemIds.push(itemId);
        await units.setAvailability(unit.id, UNIT_AVAILABILITY.BORROWED);
      }

      return {
        id: Number(loan.id),
        loanCode: loan.loan_code,
        borrowedAt: loan.borrowed_at,
        dueAt: loan.due_at,
        status: loan.status,
        itemIds,
      };
    });
  }
}
