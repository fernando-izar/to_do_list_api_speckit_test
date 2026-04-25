jest.mock('../../src/auth/auth.service');

import request from 'supertest';
import app from '../../src/app';
import { register, login, refreshTokens } from '../../src/auth/auth.service';

const mockRegister = register as jest.Mock;
const mockLogin = login as jest.Mock;
const mockRefresh = refreshTokens as jest.Mock;

const tokens = { accessToken: 'access-tok', refreshToken: 'refresh-tok' };

beforeEach(() => {
  mockRegister.mockReset();
  mockLogin.mockReset();
  mockRefresh.mockReset();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with token pair on success', async () => {
    mockRegister.mockResolvedValue(tokens);
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'senha123' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(tokens);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'senha123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    mockRegister.mockRejectedValue(Object.assign(new Error('Email already registered'), { status: 409 }));
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@b.com', password: 'senha123' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for weak password', async () => {
    mockRegister.mockRejectedValue(Object.assign(new Error('Password too weak'), { status: 400 }));
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with token pair on success', async () => {
    mockLogin.mockResolvedValue(tokens);
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(tokens);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    mockLogin.mockRejectedValue(Object.assign(new Error('Invalid credentials'), { status: 401 }));
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 200 with new token pair', async () => {
    mockRefresh.mockResolvedValue(tokens);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'old-token' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(tokens);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid or expired refresh token', async () => {
    mockRefresh.mockRejectedValue(Object.assign(new Error('Invalid or expired refresh token'), { status: 401 }));
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'expired' });
    expect(res.status).toBe(401);
  });
});
