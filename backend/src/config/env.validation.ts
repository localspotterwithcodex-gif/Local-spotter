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

  const stripeKey = typeof config.STRIPE_SECRET_KEY === 'string' ? config.STRIPE_SECRET_KEY.trim() : '';
  if (stripeKey) {
    if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(stripeKey)) {
      errors.push('STRIPE_SECRET_KEY must be a Stripe secret key (sk_test_... or sk_live_...)');
    }
    const webhookSecret = typeof config.STRIPE_WEBHOOK_SECRET === 'string' ? config.STRIPE_WEBHOOK_SECRET.trim() : '';
    if (webhookSecret && !/^whsec_[A-Za-z0-9]{10,}$/.test(webhookSecret)) {
      errors.push('STRIPE_WEBHOOK_SECRET must be a Stripe webhook signing secret (whsec_...)');
    }
    if (isProd && !webhookSecret) {
      errors.push('STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set in production (payments are confirmed by Stripe webhooks)');
    }
    if (isProd && !config.FRONTEND_URL) {
      errors.push('FRONTEND_URL is required when STRIPE_SECRET_KEY is set in production (customers return there after paying)');
    }
    // Stripe rejects a checkout whose return URL is not an absolute http(s) URL, which would fail every payment.
    if (config.FRONTEND_URL && !/^https?:\/\/[^\s/]+/i.test(String(config.FRONTEND_URL).trim())) {
      errors.push('FRONTEND_URL must be a full URL including https:// (e.g. https://your-app.vercel.app)');
    }
  }

  const encryptionKey = typeof config.ENCRYPTION_KEY === 'string' ? config.ENCRYPTION_KEY.trim() : '';
  if (encryptionKey && Buffer.from(encryptionKey, 'base64').length !== 32) {
    errors.push('ENCRYPTION_KEY must be base64 of exactly 32 bytes (node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))")');
  }
  const intVar = (name: string, min: number, max: number) => {
    const raw = config[name];
    if (raw === undefined || raw === '') return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) errors.push(`${name} must be an integer between ${min} and ${max}`);
  };
  intVar('COMMISSION_DEFAULT_BPS', 0, 5000);
  intVar('PAYOUT_HOLD_DAYS', 0, 90);
  intVar('PAYOUT_MIN_CENTS', 0, 10000000);
  intVar('RETURN_WINDOW_DAYS', 1, 90);

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${errors.join('\n - ')}`);
  }
  return config;
}
