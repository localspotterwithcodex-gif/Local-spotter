/**
 * Fail-fast validation of required environment variables. Runs once at
 * bootstrap (ConfigModule `validate`). Secrets are never echoed in messages.
 */
const MIN_SECRET_LENGTH = 32;
const KNOWN_PLACEHOLDERS = ['changeme', 'change_me', 'change-me', 'secret', 'localspotter_super_secret_jwt_key_2026_change_in_production'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const env = String(config.NODE_ENV ?? 'development');
  const isProd = env === 'production';

  const jwt = typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : '';
  if (jwt.length < MIN_SECRET_LENGTH) {
    errors.push(`JWT_SECRET is required and must be at least ${MIN_SECRET_LENGTH} characters (generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")`);
  } else if (KNOWN_PLACEHOLDERS.some((p) => jwt.toLowerCase().includes(p))) {
    errors.push('JWT_SECRET looks like a placeholder; set a unique random value');
  }

  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (isProd) {
    if (!config.CORS_ORIGIN) errors.push('CORS_ORIGIN is required in production');
    if (config.MAIL_TRANSPORT === 'dev-file') errors.push('MAIL_TRANSPORT=dev-file is not allowed in production');
  }

  if (config.MAIL_TRANSPORT === 'resend') {
    if (!config.RESEND_API_KEY) errors.push('RESEND_API_KEY is required when MAIL_TRANSPORT=resend');
    if (!config.MAIL_FROM) errors.push('MAIL_FROM is required when MAIL_TRANSPORT=resend (e.g. "LocalSpotter <no-reply@your-domain>")');
  }
  if (isProd && config.MAIL_TRANSPORT !== 'resend') {
    errors.push('MAIL_TRANSPORT=resend is required in production (otherwise signup and password reset return 503)');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }
  return config;
}
