import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

import {
  createAdminPasswordReset,
  getAdminCredential,
  getAdminPasswordResetByTokenHash,
  invalidateAdminPasswordResets,
  markAdminPasswordResetUsed,
  saveAdminCredential,
} from './db';

const PASSWORD_HASH_PREFIX = 'scrypt';
const PASSWORD_KEY_LENGTH = 64;
const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MINUTES = 30;

type PasswordResetRecord = Awaited<ReturnType<typeof getAdminPasswordResetByTokenHash>>;

export function getConfiguredAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim() || '';
}

export function getConfiguredAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? '';
}

export function getAdminResetEmail() {
  return process.env.ADMIN_RESET_EMAIL?.trim() || process.env.MONITORING_TO_EMAIL?.trim() || process.env.SENDGRID_TO_EMAIL?.trim() || '';
}

export function getAdminResetFromEmail() {
  return process.env.ADMIN_RESET_FROM_EMAIL?.trim() || process.env.SENDGRID_FROM_EMAIL?.trim() || process.env.MONITORING_FROM_EMAIL?.trim() || '';
}

export function getSiteUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim() || '';

  if (!candidate) {
    return '';
  }

  return candidate.startsWith('http') ? candidate : `https://${candidate}`;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('base64url');

  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [prefix, salt, storedKey] = passwordHash.split(':');

  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !storedKey) {
    return false;
  }

  const incomingKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expectedKey = Buffer.from(storedKey, 'base64url');

  if (incomingKey.length !== expectedKey.length) {
    return false;
  }

  return timingSafeEqual(incomingKey, expectedKey);
}

export async function verifyAdminCredentials(username: string, password: string) {
  const configuredUsername = getConfiguredAdminUsername();

  if (!configuredUsername || username !== configuredUsername) {
    return false;
  }

  const storedCredential = await getAdminCredential(username);

  if (storedCredential) {
    return verifyPassword(password, storedCredential.password_hash);
  }

  const configuredPassword = getConfiguredAdminPassword();
  return Boolean(configuredPassword) && password === configuredPassword;
}

export async function updateAdminPassword(username: string, password: string) {
  const passwordHash = hashPassword(password);
  await saveAdminCredential(username, passwordHash);
}

export function createPasswordResetToken() {
  return randomBytes(RESET_TOKEN_BYTES).toString('base64url');
}

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('base64url');
}

export function getPasswordResetExpiryDate() {
  return new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);
}

export function getPasswordResetExpiryMinutes() {
  return RESET_EXPIRY_MINUTES;
}

export async function issueAdminPasswordReset(username: string) {
  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = getPasswordResetExpiryDate();

  await invalidateAdminPasswordResets(username);
  await createAdminPasswordReset(username, tokenHash, expiresAt.toISOString());

  return {
    token,
    expiresAt,
  };
}

export async function findUsablePasswordReset(token: string): Promise<PasswordResetRecord> {
  return getAdminPasswordResetByTokenHash(hashPasswordResetToken(token));
}

export function isPasswordResetUsable(record: PasswordResetRecord) {
  if (!record || record.used_at) {
    return false;
  }

  return new Date(record.expires_at).getTime() > Date.now();
}

export async function consumePasswordReset(token: string, nextPassword: string) {
  const record = await findUsablePasswordReset(token);

  if (!record || record.used_at || new Date(record.expires_at).getTime() <= Date.now()) {
    return { ok: false as const };
  }

  await updateAdminPassword(record.username, nextPassword);
  await markAdminPasswordResetUsed(record.id);
  await invalidateAdminPasswordResets(record.username);

  return { ok: true as const, username: record.username };
}