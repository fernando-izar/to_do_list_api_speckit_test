jest.mock('../../src/db/client', () => ({ __esModule: true, default: { query: jest.fn() } }));

import pool from '../../src/db/client';
import { hashPassword, validatePassword, register, login, refreshTokens } from '../../src/auth/auth.service';

const mockQuery = pool.query as jest.Mock;

beforeEach(() => mockQuery.mockReset());

describe('hashPassword / validatePassword', () => {
  it('hashes and verifies a matching password', async () => {
    const hash = await hashPassword('senha123');
    expect(hash).not.toBe('senha123');
    await expect(validatePassword('senha123', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('senha123');
    await expect(validatePassword('wrong', hash)).resolves.toBe(false);
  });
});

describe('register', () => {
  it('creates a user and returns token pair', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })       // email check
      .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })    // insert user
      .mockResolvedValueOnce({ rows: [] });                    // insert refresh token

    const result = await register({ email: 'a@b.com', password: 'senha123' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('throws 400 for weak password', async () => {
    await expect(register({ email: 'a@b.com', password: 'fraca' })).rejects.toMatchObject({ status: 400 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 409 for duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing' }], rowCount: 1 });
    await expect(register({ email: 'dup@b.com', password: 'senha123' })).rejects.toMatchObject({ status: 409 });
  });
});

describe('login', () => {
  it('returns token pair for valid credentials', async () => {
    const hash = await hashPassword('senha123');
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', password_hash: hash }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await login({ email: 'a@b.com', password: 'senha123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('throws 401 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(login({ email: 'x@b.com', password: 'senha123' })).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 for wrong password', async () => {
    const hash = await hashPassword('correta');
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-1', password_hash: hash }] });
    await expect(login({ email: 'a@b.com', password: 'errada' })).rejects.toMatchObject({ status: 401 });
  });
});

describe('refreshTokens', () => {
  it('rotates tokens for a valid refresh token', async () => {
    const future = new Date(Date.now() + 86400000);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'rt-1', user_id: 'user-1', expires_at: future, revoked_at: null }] })
      .mockResolvedValueOnce({ rows: [] })   // revoke old
      .mockResolvedValueOnce({ rows: [] });  // insert new

    const result = await refreshTokens('any-raw-token');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('throws 401 for unknown token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(refreshTokens('unknown')).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 for revoked token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rt-1', user_id: 'user-1', expires_at: new Date(), revoked_at: new Date() }] });
    await expect(refreshTokens('revoked')).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 for expired token', async () => {
    const past = new Date(Date.now() - 1000);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rt-1', user_id: 'user-1', expires_at: past, revoked_at: null }] });
    await expect(refreshTokens('expired')).rejects.toMatchObject({ status: 401 });
  });
});
