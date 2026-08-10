import test from 'node:test';
import assert from 'node:assert/strict';
import { AdminService } from '../src/application/admin-service.js';

function createService() {
  return new AdminService({
    users: {},
    units: {},
    categories: {},
    loans: {},
    unitOfWork: { run: async () => { throw new Error('unit of work tidak boleh dipanggil'); } },
  });
}

test('admin tidak dapat membuat unit langsung dengan status dipinjam', async () => {
  const service = createService();
  assert.throws(
    () => service.createUnit(
      { id: 1, role: 'admin' },
      { availabilityStatus: 'borrowed' },
    ),
    /hanya boleh berasal dari transaksi peminjaman/i,
  );
});

test('anggota tidak dapat membuka dashboard admin', () => {
  const service = createService();
  assert.throws(
    () => service.dashboard({ id: 2, role: 'member' }),
    /tidak memiliki akses/i,
  );
});
