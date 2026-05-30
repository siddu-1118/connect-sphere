import crypto from 'crypto';

export function generateOTP(): string {
  // Generate a cryptographically secure 6-digit numeric string
  const val = crypto.randomInt(100000, 999999);
  return val.toString();
}

export function isOTPExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date() > expiresAt;
}