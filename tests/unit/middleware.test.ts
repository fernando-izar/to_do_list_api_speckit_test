import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from '../../src/middleware/auth.middleware';

const makeReq = (auth?: string): AuthRequest =>
  ({ headers: { authorization: auth } } as unknown as AuthRequest);

const makeRes = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  return res;
};

describe('requireAuth', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => (next as jest.Mock).mockReset());

  it('calls next and attaches userId for a valid token', () => {
    const token = jwt.sign({ sub: 'user-1' }, process.env.JWT_ACCESS_SECRET!);
    const req = makeReq(`Bearer ${token}`);
    requireAuth(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-1');
  });

  it('returns 401 when Authorization header is missing', () => {
    const res = makeRes();
    requireAuth(makeReq(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed header', () => {
    const res = makeRes();
    requireAuth(makeReq('Token abc'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for an invalid token', () => {
    const res = makeRes();
    requireAuth(makeReq('Bearer invalid.token.here'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for an expired token', () => {
    const token = jwt.sign({ sub: 'user-1' }, process.env.JWT_ACCESS_SECRET!, { expiresIn: -1 });
    const res = makeRes();
    requireAuth(makeReq(`Bearer ${token}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
