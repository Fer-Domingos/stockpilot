import crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getInviteExpiry(): Date {
  // 7 days from now
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

export function getResetExpiry(): Date {
  // 1 hour from now
  return new Date(Date.now() + 60 * 60 * 1000);
}

export function getMagicLinkExpiry(): Date {
  // 15 minutes from now
  return new Date(Date.now() + 15 * 60 * 1000);
}
