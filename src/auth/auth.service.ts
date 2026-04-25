import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/client';
import { RegisterInput, LoginInput, TokenPair } from './auth.types';

const ACCESS_EXPIRES = '1h';
const REFRESH_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

/** Hashes a plain-text password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Returns true if the plain password matches the stored hash. */
export async function validatePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Generates a JWT access token and an opaque refresh token for the given userId. */
export async function generateTokenPair(userId: string): Promise<TokenPair> {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_EXPIRES,
  });

  const rawRefresh = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );

  return { accessToken, refreshToken: rawRefresh };
}

/** Registers a new user. Throws on duplicate email or weak password. */
export async function register(input: RegisterInput): Promise<TokenPair> {
  if (!PASSWORD_REGEX.test(input.password)) {
    const err = Object.assign(new Error('Password must be at least 8 characters with a letter and a number'), { status: 400 });
    throw err;
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rowCount && existing.rowCount > 0) {
    const err = Object.assign(new Error('Email already registered'), { status: 409 });
    throw err;
  }

  const passwordHash = await hashPassword(input.password);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [input.email, passwordHash],
  );

  return generateTokenPair(result.rows[0].id);
}

/** Authenticates a user. Returns token pair or throws 401. */
export async function login(input: LoginInput): Promise<TokenPair> {
  const result = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [input.email]);
  const user = result.rows[0];

  if (!user || !(await validatePassword(input.password, user.password_hash))) {
    const err = Object.assign(new Error('Invalid credentials'), { status: 401 });
    throw err;
  }

  return generateTokenPair(user.id);
}

/** Rotates a refresh token: revokes old one, issues a new pair. */
export async function refreshTokens(rawToken: string): Promise<TokenPair> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const result = await pool.query(
    'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash],
  );

  const stored = result.rows[0];
  if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
    const err = Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
    throw err;
  }

  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [stored.id]);

  return generateTokenPair(stored.user_id);
}
