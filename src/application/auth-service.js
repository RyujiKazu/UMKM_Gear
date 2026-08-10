import bcrypt from 'bcryptjs';
import { AuthenticationError, AuthorizationError } from '../domain/errors.js';

export class AuthService {
  constructor({ users }) {
    this.users = users;
  }

  async login({ email, password }) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AuthenticationError();
    }

    if (!user.isActive) {
      throw new AuthorizationError('Akun Anda sedang dinonaktifkan. Hubungi admin.');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUser(id) {
    const user = await this.users.findById(id);
    if (!user || !user.isActive) throw new AuthenticationError('Sesi tidak lagi valid.');
    return user;
  }
}
