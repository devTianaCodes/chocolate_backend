import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultLogoCandidates = [
  path.resolve(__dirname, '../../../../chocolate_frontend/client/src/assets/logo1-transparent.png'),
  path.resolve(__dirname, '../../../../chocolate_frontend/client/src/assets/logo.png'),
];

let transporter = null;

function hasMailConfig() {
  return Boolean(
    (process.env.SMTP_SERVICE || process.env.SMTP_HOST) &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (!hasMailConfig()) return null;
  if (transporter) return transporter;

  transporter = process.env.SMTP_SERVICE
    ? nodemailer.createTransport({
        service: process.env.SMTP_SERVICE,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

  return transporter;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getLogoAttachment() {
  const configuredPath = process.env.ORDER_EMAIL_LOGO_PATH
    ? path.resolve(process.env.ORDER_EMAIL_LOGO_PATH)
    : defaultLogoCandidates.find((candidate) => fs.existsSync(candidate));

  if (!configuredPath) return null;
  if (!fs.existsSync(configuredPath)) return null;

  return {
    filename: path.basename(configuredPath),
    path: configuredPath,
    cid: 'chocolate-logo',
  };
}

function buildOrderEmailHtml({ customerName, order, items }) {
  const rows = items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return `
        <tr>
          <td style="padding:14px 0;color:#4f2121;font-size:15px;border-bottom:1px solid rgba(79,33,33,0.10);">${escapeHtml(item.name)}</td>
          <td style="padding:14px 0;color:#7a5d57;font-size:15px;text-align:center;border-bottom:1px solid rgba(79,33,33,0.10);">${quantity}</td>
          <td style="padding:14px 0;color:#4f2121;font-size:15px;text-align:right;border-bottom:1px solid rgba(79,33,33,0.10);">${escapeHtml(formatCurrency(price * quantity))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="margin:0;padding:32px 20px;background:#f8dfd4;font-family:Georgia, 'Times New Roman', serif;">
      <div style="max-width:680px;margin:0 auto;background:#f3dbcf;border:1px solid rgba(79,33,33,0.12);box-shadow:0 18px 36px rgba(39,19,13,0.12);">
        <div style="padding:28px 32px 18px;background:#4f2121;text-align:center;">
          <img src="cid:chocolate-logo" alt="Chocolate Craft House" style="max-width:360px;width:100%;height:auto;display:inline-block;" />
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 8px;color:#7a5d57;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Order confirmed</p>
          <h1 style="margin:0 0 16px;color:#4f2121;font-size:34px;line-height:1.1;">Thank you${customerName ? `, ${escapeHtml(customerName)}` : ''}.</h1>
          <p style="margin:0 0 24px;color:#5a3a34;font-size:16px;line-height:1.7;">
            Your order has been paid successfully and is now being prepared by the atelier.
          </p>

          <div style="margin:0 0 24px;padding:20px;background:#f7ebe6;border:1px solid rgba(79,33,33,0.12);">
            <p style="margin:0 0 10px;color:#7a5d57;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Order number</p>
            <p style="margin:0 0 16px;color:#4f2121;font-size:22px;">${escapeHtml(order.order_number)}</p>
            <p style="margin:0 0 6px;color:#5a3a34;font-size:14px;">Total: ${escapeHtml(formatCurrency(order.total))}</p>
            <p style="margin:0;color:#5a3a34;font-size:14px;">Placed on: ${escapeHtml(new Date(order.created_at).toLocaleDateString())}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr>
              <th style="padding:0 0 10px;border-bottom:1px solid rgba(79,33,33,0.18);color:#7a5d57;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-align:left;">Item</th>
              <th style="padding:0 0 10px;border-bottom:1px solid rgba(79,33,33,0.18);color:#7a5d57;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-align:center;">Qty</th>
              <th style="padding:0 0 10px;border-bottom:1px solid rgba(79,33,33,0.18);color:#7a5d57;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          </table>

          <p style="margin:0;color:#7a5d57;font-size:14px;line-height:1.7;">
            We will send you another update when your parcel is on its way.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildOrderEmailText({ customerName, order, items }) {
  const lines = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    return `- ${item.name} x${quantity}: ${formatCurrency(price * quantity)}`;
  });

  return [
    `Thank you${customerName ? `, ${customerName}` : ''}.`,
    '',
    'Your order has been paid successfully and is now being prepared.',
    '',
    `Order number: ${order.order_number}`,
    `Total: ${formatCurrency(order.total)}`,
    `Placed on: ${new Date(order.created_at).toLocaleDateString()}`,
    '',
    'Items:',
    ...lines,
  ].join('\n');
}

export async function sendOrderConfirmationEmail({ to, order, items }) {
  const mailer = getTransporter();
  if (!mailer || !to) {
    return { sent: false, reason: 'mail-disabled' };
  }

  const customerName = [order.first_name, order.last_name].filter(Boolean).join(' ').trim();
  const attachment = getLogoAttachment();

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Your Chocolate Craft House order ${order.order_number} is confirmed`,
    text: buildOrderEmailText({ customerName, order, items }),
    html: buildOrderEmailHtml({ customerName, order, items }),
    attachments: attachment ? [attachment] : [],
  });

  console.log(`Order confirmation email sent to ${to} for order ${order.order_number}`);
  return { sent: true };
}
