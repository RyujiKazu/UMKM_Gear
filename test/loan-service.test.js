import test from 'node:test';
import assert from 'node:assert/strict';
import { LoanService } from '../src/application/loan-service.js';

test('LoanService membuat header, item, dan mengubah status unit dalam satu unit of work', async () => {
  const calls = [];
  const repositories = {
    loans: {
      lockMember: async (id) => calls.push(['lockMember', id]),
      countActiveItems: async () => 0,
      create: async (data) => ({ id: 77, loan_code: data.loanCode, borrowed_at: data.borrowedAt, due_at: data.dueAt, status: 'active' }),
      addItem: async (data) => { calls.push(['addItem', data.unitId]); return data.unitId + 100; },
    },
    units: {
      findAvailableByIdsForUpdate: async () => [
        { id: 1, name: 'Mixer', unitCode: 'MIX-001', conditionStatus: 'good', availabilityStatus: 'available', finePerDay: 25_000 },
        { id: 2, name: 'Oven', unitCode: 'OVN-001', conditionStatus: 'good', availabilityStatus: 'available', finePerDay: 30_000 },
      ],
      setAvailability: async (id, status) => calls.push(['setAvailability', id, status]),
    },
  };
  const service = new LoanService({
    loans: repositories.loans,
    unitOfWork: { run: (work) => work(repositories) },
    clock: () => new Date('2026-08-10T08:00:00Z'),
  });

  const result = await service.borrow(
    { id: 9, role: 'member', isActive: true },
    { unitIds: [1, 2], durationDays: 5, notes: 'Produksi bazar' },
  );

  assert.equal(result.id, 77);
  assert.deepEqual(result.itemIds, [101, 102]);
  assert.equal(new Date(result.dueAt).toISOString(), '2026-08-15T08:00:00.000Z');
  assert.deepEqual(calls, [
    ['lockMember', 9],
    ['addItem', 1],
    ['setAvailability', 1, 'borrowed'],
    ['addItem', 2],
    ['setAvailability', 2, 'borrowed'],
  ]);
});
