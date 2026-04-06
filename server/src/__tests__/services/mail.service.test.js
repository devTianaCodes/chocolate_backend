import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadMailService({ logoExists = true, withMailConfig = true } = {}) {
  vi.resetModules();

  if (withMailConfig) {
    process.env.SMTP_SERVICE = 'gmail';
    process.env.SMTP_USER = 'orders@example.com';
    process.env.SMTP_PASS = 'app-password';
    process.env.SMTP_FROM = 'Chocolate Craft House <orders@example.com>';
  } else {
    delete process.env.SMTP_SERVICE;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  }

  delete process.env.ORDER_EMAIL_LOGO_PATH;

  const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-1' });
  const createTransport = vi.fn(() => ({ sendMail }));
  const existsSync = vi.fn((filePath) => (logoExists ? String(filePath).includes('logo1-transparent.png') : false));

  vi.doMock('nodemailer', () => ({
    default: {
      createTransport,
    },
  }));

  vi.doMock('fs', () => ({
    default: {
      existsSync,
    },
    existsSync,
  }));

  const service = await import('../../services/mail.service.js');

  return {
    ...service,
    createTransport,
    sendMail,
    existsSync,
  };
}

describe('mail.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips sending when mail config is missing', async () => {
    const { sendOrderConfirmationEmail, createTransport, sendMail } = await loadMailService({
      withMailConfig: false,
    });

    const result = await sendOrderConfirmationEmail({
      to: 'ada@example.com',
      order: {
        order_number: 'CH-10',
        total: '14.95',
        created_at: '2025-01-01T12:00:00.000Z',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
      items: [{ name: 'Dark Bar', quantity: 1, price: '14.95' }],
    });

    expect(result).toEqual({ sent: false, reason: 'mail-disabled' });
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends a customer order email with the logo attachment and branded HTML', async () => {
    const { sendOrderConfirmationEmail, createTransport, sendMail } = await loadMailService();

    const result = await sendOrderConfirmationEmail({
      to: 'ada@example.com',
      order: {
        order_number: 'CH-11',
        total: '19.90',
        created_at: '2025-01-03T12:00:00.000Z',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
      items: [{ name: 'Praline Box', quantity: 2, price: '9.95' }],
    });

    expect(result).toEqual({ sent: true });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'gmail',
        auth: {
          user: 'orders@example.com',
          pass: 'app-password',
        },
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        subject: 'Your Chocolate Craft House order CH-11 is confirmed',
        html: expect.stringContaining('background:#4f2121'),
        attachments: [
          expect.objectContaining({
            cid: 'chocolate-logo',
            filename: 'logo1-transparent.png',
          }),
        ],
      })
    );
  });

  it('sends the admin notification without attaching the logo', async () => {
    const { sendAdminOrderNotificationEmail, sendMail } = await loadMailService();

    await sendAdminOrderNotificationEmail({
      to: 'store@example.com',
      order: {
        order_number: 'CH-12',
        total: '29.90',
        created_at: '2025-01-04T12:00:00.000Z',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
      },
      items: [{ name: 'Gift Box', quantity: 1, price: '29.90' }],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'store@example.com',
        subject: 'New paid order CH-12',
        html: expect.stringContaining('New paid order'),
        attachments: [],
      })
    );
  });
});
