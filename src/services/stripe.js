import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function createCheckoutSession({ betAmount, description, challengeId }) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Money Coach Challenge`, description },
        unit_amount: Math.round(betAmount * 100),
      },
      quantity: 1,
    }],
    mode: 'payment',
    payment_intent_data: { capture_method: 'manual' },
    metadata: { challengeId: String(challengeId) },
    success_url: `${BASE_URL}/challenges/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/challenges/cancel`,
  });

  return { sessionId: session.id, url: session.url };
}

export async function capturePayment(paymentIntentId) {
  return stripe.paymentIntents.capture(paymentIntentId);
}

export async function cancelPayment(paymentIntentId) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

export async function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

export async function getSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId);
}
