import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/services/auth';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', () => {
    const stored = hashPassword('correct horse battery');
    expect(verifyPassword('correct horse battery', stored)).toBe(true);
    expect(verifyPassword('wrong password', stored)).toBe(false);
  });

  it('produces a different hash each time (random salt)', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });
});

describe('tokens', () => {
  it('signs and verifies a token round-trip', () => {
    const token = signToken(42, 'user@example.com');
    const payload = verifyToken(token);
    expect(payload?.sub).toBe(42);
    expect(payload?.email).toBe('user@example.com');
  });

  it('rejects a tampered token', () => {
    const token = signToken(42, 'user@example.com');
    const tampered = token.slice(0, -3) + 'aaa';
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signToken(42, 'user@example.com', -10); // already expired
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(verifyToken('not-a-token')).toBeNull();
  });
});
