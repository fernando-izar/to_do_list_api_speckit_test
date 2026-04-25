import { Router, Request, Response, NextFunction } from 'express';
import { authRateLimiter } from '../middleware/rate-limit';
import { register, login, refreshTokens } from './auth.service';

const router = Router();

/** POST /auth/register — create account and return token pair. */
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const tokens = await register({ email, password });
    res.status(201).json(tokens);
  } catch (err) {
    next(err);
  }
});

/** POST /auth/login — authenticate and return token pair. */
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const tokens = await login({ email, password });
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

/** POST /auth/refresh — rotate refresh token and return new pair. */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }
    const tokens = await refreshTokens(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    next(err);
  }
});

export default router;
