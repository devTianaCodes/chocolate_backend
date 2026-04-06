import 'dotenv/config';

const REQUIRED = [
  'PORT',
  'CLIENT_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES',
  'JWT_REFRESH_EXPIRES',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

export function loadEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  const hasMailService = Boolean(process.env.SMTP_SERVICE || process.env.SMTP_HOST);
  const hasMailUser = Boolean(process.env.SMTP_USER);
  const hasMailPass = Boolean(process.env.SMTP_PASS);
  const hasMailFrom = Boolean(process.env.SMTP_FROM);

  const mailVarsMissing = [];
  if (hasMailService || hasMailUser || hasMailPass || hasMailFrom) {
    if (!hasMailService) mailVarsMissing.push('SMTP_SERVICE/SMTP_HOST');
    if (!hasMailUser) mailVarsMissing.push('SMTP_USER');
    if (!hasMailPass) mailVarsMissing.push('SMTP_PASS');
    if (!hasMailFrom) mailVarsMissing.push('SMTP_FROM');
  }

  missing.push(...mailVarsMissing);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
