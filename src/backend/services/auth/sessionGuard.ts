import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/backend/repositories/UserRepository';
import { IUser } from '@/backend/domain/user';

export const SESSION_COOKIE_NAME = 'laymor_uid';
export const SSO_TOKEN_COOKIE_NAME = 'laymor_sso_token';
export const SSO_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

interface SignedSsoPayload extends IUser {
  iat?: number;
  exp?: number;
}

function getSsoSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'laymor-3d-unified-sso-secret-2026'
  );
}

/**
 * Signs a minimal user snapshot with HMAC-SHA256 for cross-route SSO cookies.
 */
export function createSignedSsoToken(user: IUser): string {
  const now = Date.now();
  const safeSnapshot: SignedSsoPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    walletBalanceVnd: user.walletBalanceVnd,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt,
    status: user.status,
    allowedModules: user.allowedModules,
    allowedFeatures: user.allowedFeatures,
    iat: now,
    exp: now + SSO_COOKIE_MAX_AGE_SEC * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(safeSnapshot), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSsoSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies an HMAC-signed SSO token using constant-time comparison.
 */
export function verifySignedSsoToken(token?: string): IUser | null {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSsoSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SignedSsoPayload;
    if (!parsed || !parsed.id || parsed.status === 'suspended') return null;
    if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function attachSsoCookies(res: NextResponse, user: IUser): void {
  res.cookies.set(SESSION_COOKIE_NAME, user.id, {
    path: '/',
    maxAge: SSO_COOKIE_MAX_AGE_SEC,
    sameSite: 'lax',
  });
  res.cookies.set(SSO_TOKEN_COOKIE_NAME, createSignedSsoToken(user), {
    path: '/',
    maxAge: SSO_COOKIE_MAX_AGE_SEC,
    httpOnly: true,
    sameSite: 'lax',
  });
}

export function clearSsoCookies(res: NextResponse): void {
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.delete(SSO_TOKEN_COOKIE_NAME);
}

/**
 * Resolves the authenticated caller strictly from the HMAC-signed SSO token
 * (cookie or Bearer token) — never from spoofable client flags or plain UID headers.
 */
export async function resolveRequestUser(
  req: NextRequest
): Promise<{ user: IUser | null; verifiedByToken: boolean }> {
  await userRepository.ensureHydrated();

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const ssoToken =
    req.cookies.get(SSO_TOKEN_COOKIE_NAME)?.value ||
    req.headers.get('x-laymor-sso-token') ||
    bearerToken ||
    '';

  if (!ssoToken) {
    return { user: null, verifiedByToken: false };
  }

  const verifiedSnapshot = verifySignedSsoToken(ssoToken);
  if (!verifiedSnapshot) {
    return { user: null, verifiedByToken: false };
  }

  // Reconcile against live user store (e.g. role change or suspension since token issue)
  const stored = userRepository.getAuthenticatedUser(verifiedSnapshot.id);
  const resolved = stored || userRepository.upsertVerifiedSessionUser(verifiedSnapshot);
  if (!resolved || resolved.status === 'suspended') {
    return { user: null, verifiedByToken: false };
  }

  return { user: resolved, verifiedByToken: true };
}

export function isModerationAdmin(user: IUser | null | undefined): boolean {
  return Boolean(user && (user.role === 'admin' || user.role === 'mod' || user.username === 'hlcai_admin'));
}
