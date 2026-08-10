import { MAX_ACTIVE_UNITS, MAX_LOAN_DAYS, USER_ROLES } from './constants.js';
import { AuthorizationError, ConflictError, ValidationError } from './errors.js';

export function assertCanBorrow({ user, activeItemCount, requestedUnitIds, durationDays }) {
  if (user.role !== USER_ROLES.MEMBER) {
    throw new AuthorizationError('Hanya anggota yang dapat meminjam unit.');
  }

  if (!user.isActive) {
    throw new AuthorizationError('Akun anggota sedang tidak aktif.');
  }

  const uniqueIds = [...new Set(requestedUnitIds)];
  if (uniqueIds.length === 0 || uniqueIds.length > MAX_ACTIVE_UNITS) {
    throw new ValidationError(`Pilih satu sampai ${MAX_ACTIVE_UNITS} unit.`);
  }

  if (uniqueIds.length !== requestedUnitIds.length) {
    throw new ValidationError('Unit yang sama tidak boleh dipilih dua kali.');
  }

  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_LOAN_DAYS) {
    throw new ValidationError(`Durasi peminjaman harus 1 sampai ${MAX_LOAN_DAYS} hari.`);
  }

  if (activeItemCount + uniqueIds.length > MAX_ACTIVE_UNITS) {
    throw new ConflictError(`Anggota hanya boleh memiliki maksimal ${MAX_ACTIVE_UNITS} unit aktif.`);
  }
}

export function calculateLateFine({ dueAt, returnedAt, finePerDay }) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const lateMilliseconds = new Date(returnedAt).getTime() - new Date(dueAt).getTime();
  const lateDays = Math.max(0, Math.ceil(lateMilliseconds / millisecondsPerDay));

  return {
    lateDays,
    fineAmount: lateDays * Number(finePerDay),
  };
}
