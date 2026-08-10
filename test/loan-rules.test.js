import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCanBorrow, calculateLateFine } from '../src/domain/loan-rules.js';

const activeMember = { id: 1, role: 'member', isActive: true };

test('anggota boleh meminjam hingga total dua unit aktif', () => {
  assert.doesNotThrow(() => assertCanBorrow({
    user: activeMember,
    activeItemCount: 1,
    requestedUnitIds: [10],
    durationDays: 5,
  }));
});

test('peminjaman ditolak ketika total unit aktif melebihi dua', () => {
  assert.throws(
    () => assertCanBorrow({
      user: activeMember,
      activeItemCount: 1,
      requestedUnitIds: [10, 11],
      durationDays: 3,
    }),
    /maksimal 2 unit aktif/i,
  );
});

test('durasi lebih dari lima hari ditolak', () => {
  assert.throws(
    () => assertCanBorrow({
      user: activeMember,
      activeItemCount: 0,
      requestedUnitIds: [10],
      durationDays: 6,
    }),
    /1 sampai 5 hari/i,
  );
});

test('denda dibulatkan per hari keterlambatan', () => {
  const result = calculateLateFine({
    dueAt: new Date('2026-08-10T10:00:00Z'),
    returnedAt: new Date('2026-08-12T10:01:00Z'),
    finePerDay: 15_000,
  });
  assert.deepEqual(result, { lateDays: 3, fineAmount: 45_000 });
});
