/**
 * Creates the FIRST super admin on a fresh database (staging/production). Never prints the password.
 *
 *   ADMIN_EMAIL=you@your-domain.nl npx ts-node scripts/create-admin.ts
 *
 * The password is typed interactively (hidden, asked twice). Refuses when a super admin already exists
 * or the e-mail is taken. At first login the admin must enrol the authenticator app (needs ENCRYPTION_KEY).
 */
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export const MIN_ADMIN_PASSWORD_LENGTH = 14;
const MAX_BCRYPT_BYTES = 72; // bcrypt ignores everything after 72 bytes
const BCRYPT_ROUNDS = 12; // same cost as AuthService

/** Returns the problems with the input; empty when it is acceptable. Never echoes the password. */
export function validateAdminInput(email: string, password: string, confirmation: string): string[] {
  const errors: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('ADMIN_EMAIL is not a valid e-mail address');
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) errors.push(`password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_BYTES) errors.push(`password must be at most ${MAX_BCRYPT_BYTES} bytes`);
  if (password !== password.trim()) errors.push('password must not start or end with a space');
  if (password !== confirmation) errors.push('the two passwords do not match');
  return errors;
}

function describeTarget(): string {
  try {
    const u = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || '');
    return `${u.hostname}${u.pathname}`; // never the credentials
  } catch {
    return '(unparseable database url)';
  }
}

/** Reads one line from the terminal without echoing it. */
function askHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';
    const finish = (err?: Error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish();
        if (ch === '\u0003' || ch === '\u0004') return finish(new Error('Cancelled'));
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdout.write(question);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('Set ADMIN_EMAIL, e.g. ADMIN_EMAIL=you@your-domain.nl npx ts-node scripts/create-admin.ts');
  if (!process.stdin.isTTY) throw new Error('Run this in an interactive terminal: the password must be typed, not piped');

  const prisma = new PrismaClient();
  try {
    console.log(`Target database: ${describeTarget()}`);
    if (await prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, deletedAt: null }, select: { id: true } })) {
      throw new Error('A super admin already exists. This script only creates the first one.');
    }

    const password = await askHidden(`Password for ${email} (min ${MIN_ADMIN_PASSWORD_LENGTH} characters): `);
    const confirmation = await askHidden('Type it again: ');
    const errors = validateAdminInput(email, password, confirmation);
    if (errors.length) throw new Error(errors.join('; '));

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    // Check and insert together, so two runs at the same time cannot create two admins.
    const admin = await prisma.$transaction(
      async (tx) => {
        if (await tx.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, deletedAt: null }, select: { id: true } })) {
          throw new Error('A super admin already exists. This script only creates the first one.');
        }
        if (await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })) {
          throw new Error('That e-mail address already belongs to an account.');
        }
        return tx.user.create({
          data: { email, passwordHash, role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
          select: { id: true, email: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    console.log(`Super admin created: ${admin.email} (id ${admin.id}).`);
    console.log('Log in at /login; you will be asked to set up an authenticator app (requires ENCRYPTION_KEY on the API).');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err: Error) => {
    console.error(`create-admin: ${err.message}`);
    process.exit(1);
  });
}
