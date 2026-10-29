// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Production must set JWT_SECRET (tokens would otherwise break on every restart).
function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  console.warn('JWT_SECRET not set - using an insecure development secret.');
  return 'dev-only-insecure-secret-change-me';
}

const SECRET = getSecret();

const b64url = (input) => Buffer.from(input).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

// ---- Passwords ----

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(String(password), salt, 64)).toString('hex');
  return { salt, hash };
}

export async function verifyPassword(password, salt, hash) {
  const attempt = await scrypt(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (attempt.length !== expected.length) return false;
  return crypto.timingSafeEqual(attempt, expected);
}

// Burn the same CPU time when the email doesn't exist, so login timing doesn't reveal accounts.
export async function fakeVerify(password) {
  await scrypt(String(password), 'unknown-user-salt', 64);
}

// ---- Session tokens (HS256 JWT built on Node's crypto) ----

export function signToken(payload, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  return `${header}.${body}.${hmac(`${header}.${body}`)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(hmac(`${header}.${body}`));
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Express middleware ----

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
  req.userId = payload.sub;
  req.userEmail = payload.email;
  next();
}
