import jwt from 'jsonwebtoken';

export class JwtTokenService {
  constructor({ secret, expiresIn }) {
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  sign(user) {
    return jwt.sign(
      { sub: String(user.id), role: user.role },
      this.secret,
      { expiresIn: this.expiresIn },
    );
  }

  verify(token) {
    return jwt.verify(token, this.secret);
  }
}
