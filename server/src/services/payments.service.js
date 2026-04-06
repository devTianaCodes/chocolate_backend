import Stripe from 'stripe';
import { pool } from '../config/db.js';
import { sendAdminOrderNotificationEmail, sendOrderConfirmationEmail } from './mail.service.js';

const isMockStripe = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder');
const stripe = isMockStripe ? null : new Stripe(process.env.STRIPE_SECRET_KEY);

async function getOrderById(orderId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.user_id, o.order_number, o.total, o.status, o.created_at,
            u.email, u.first_name, u.last_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function getOrderItems(orderId) {
  const [rows] = await pool.query(
    'SELECT name, price, quantity, image FROM order_items WHERE order_id = ? ORDER BY id ASC',
    [orderId]
  );
  return rows;
}

async function upsertPayment({ orderId, providerPaymentId, amount, status }) {
  const [existing] = await pool.query(
    'SELECT id FROM payments WHERE order_id = ? LIMIT 1',
    [orderId]
  );

  if (existing.length > 0) {
    await pool.query(
      `UPDATE payments
       SET provider_payment_id = ?, amount = ?, status = ?
       WHERE id = ?`,
      [providerPaymentId, amount, status, existing[0].id]
    );
    return existing[0].id;
  }

  const [result] = await pool.query(
    `INSERT INTO payments (order_id, provider, provider_payment_id, amount, currency, status)
     VALUES (?, 'stripe', ?, ?, 'USD', ?)`,
    [orderId, providerPaymentId, amount, status]
  );
  return result.insertId;
}

async function markOrderPaid(orderId) {
  await pool.query(
    "UPDATE orders SET status = 'paid' WHERE id = ?",
    [orderId]
  );
}

async function maybeSendOrderConfirmationEmail(order) {
  if (!order?.email || order.status === 'paid') return;

  const items = await getOrderItems(order.id);

  try {
    const result = await sendOrderConfirmationEmail({
      to: process.env.ORDER_CONFIRMATION_RECIPIENT || order.email,
      order,
      items,
    });

    if (!result?.sent) {
      console.warn(`Order confirmation email skipped for order ${order.order_number}: ${result?.reason || 'unknown-reason'}`);
    }
  } catch (err) {
    console.error('Order confirmation email failed', err.message);
  }

  const adminRecipient = process.env.ADMIN_ORDER_EMAIL || process.env.STORE_ORDER_EMAIL;
  if (!adminRecipient) return;

  try {
    const result = await sendAdminOrderNotificationEmail({
      to: adminRecipient,
      order,
      items,
    });

    if (!result?.sent) {
      console.warn(`Admin order email skipped for order ${order.order_number}: ${result?.reason || 'unknown-reason'}`);
    }
  } catch (err) {
    console.error('Admin order email failed', err.message);
  }
}

export async function createStripeIntent({ orderId, userId }) {
  if (!orderId) {
    const err = new Error('orderId is required');
    err.status = 400;
    throw err;
  }

  const order = await getOrderById(orderId);
  if (!order) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (Number(order.user_id) !== Number(userId)) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  if (Number(order.total) <= 0) {
    const err = new Error('Invalid order total');
    err.status = 400;
    throw err;
  }

  if (isMockStripe) {
    const providerPaymentId = `pi_mock_${order.id}`;
    await upsertPayment({
      orderId: order.id,
      providerPaymentId,
      amount: Number(order.total),
      status: 'requires_payment_method',
    });

    return {
      clientSecret: `${providerPaymentId}_secret_mock`,
      paymentIntentId: providerPaymentId,
      mode: 'mock',
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(order.total) * 100),
    currency: 'usd',
    metadata: {
      orderId: String(order.id),
      orderNumber: order.order_number,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  await upsertPayment({
    orderId: order.id,
    providerPaymentId: paymentIntent.id,
    amount: Number(order.total),
    status: paymentIntent.status,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    mode: 'stripe',
  };
}

export async function handleStripeWebhook({ rawBody, signature, mockPayload }) {
  if (isMockStripe) {
    const orderId = Number(mockPayload?.orderId);
    const paymentIntentId = mockPayload?.paymentIntentId || `pi_mock_${orderId}`;

    if (!orderId) {
      const err = new Error('orderId is required for mock webhook');
      err.status = 400;
      throw err;
    }

    const order = await getOrderById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    await upsertPayment({
      orderId,
      providerPaymentId: paymentIntentId,
      amount: Number(order.total),
      status: 'succeeded',
    });
    await markOrderPaid(orderId);
    await maybeSendOrderConfirmationEmail(order);

    return { received: true, mode: 'mock' };
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = Number(paymentIntent.metadata?.orderId);

    if (orderId) {
      const order = await getOrderById(orderId);
      if (!order) {
        return { received: true, mode: 'stripe' };
      }

      await upsertPayment({
        orderId,
        providerPaymentId: paymentIntent.id,
        amount: Number(paymentIntent.amount_received || paymentIntent.amount || 0) / 100,
        status: paymentIntent.status,
      });
      await markOrderPaid(orderId);
      await maybeSendOrderConfirmationEmail(order);
    }
  }

  return { received: true, mode: 'stripe' };
}
