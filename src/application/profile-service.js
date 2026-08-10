import { USER_ROLES } from '../domain/constants.js';
import { AuthorizationError } from '../domain/errors.js';

export class ProfileService {
  constructor({ profiles }) {
    this.profiles = profiles;
  }

  getProfile(user) {
    if (user.role !== USER_ROLES.MEMBER) {
      throw new AuthorizationError('Profil UMKM hanya tersedia untuk anggota.');
    }
    return this.profiles.findByUserId(user.id);
  }

  updateProfile(user, data) {
    if (user.role !== USER_ROLES.MEMBER) {
      throw new AuthorizationError('Profil UMKM hanya tersedia untuk anggota.');
    }
    return this.profiles.upsert(user.id, data);
  }
}
