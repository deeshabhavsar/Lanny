import express from 'express';
import { pool } from '../db/client.js';
import { createCheckoutSession, capturePayment, cancelPayment, constructWebhookEvent, getSession } from '../services/stripe.js';
import { donate } from '../services/everydotorg.js';

const router = express.Router();

// Create a new challenge and return a Stripe payment link
router.post('/create', async (req, res) => {
  const { phone, merchantToAvoid, betAmount, days, charitySlug } = req.body;

  if (!phone || !merchantToAvoid || !betAmount || !days) {
    return res.status(400).json({ error: 'phone, merchantToAvoid, betAmount, and days are required' });
  }

  try {
    const userRes = await pool.query(`SELECT id FROM users WHERE phone = $1`, [phone]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const userId = userRes.rows[0].id;

    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const charity = charitySlug || 'feeding-america';
    const description = `No ${merchantToAvoid} for ${days} days`;

    const { rows } = await pool.query(
      `INSERT INTO challenges (user_id, description, merchant_to_avoid, bet_amount, charity_slug, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, description, merchantToAvoid, betAmount, charity, endsAt]
    );
    const challengeId = rows[0].id;

    const { url } = await createCheckoutSession({ betAmount, description, challengeId });

    res.json({ challengeId, paymentUrl: url, endsAt });
  } catch (err) {
    console.error('Challenge create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe webhook — activates challenge once payment is authorized
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = await constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Stripe webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const challengeId = session.metadata?.challengeId;
    const paymentIntentId = session.payment_intent;

    if (challengeId) {
      await pool.query(
        `UPDATE challenges SET status = 'active', stripe_session_id = $1, stripe_payment_intent_id = $2
         WHERE id = $3`,
        [session.id, paymentIntentId, challengeId]
      );
      console.log(`Challenge ${challengeId} activated, payment intent: ${paymentIntentId}`);
    }
  }

  res.sendStatus(200);
});

// Success/cancel pages after Stripe checkout
router.get('/success', (req, res) => {
  res.send('<h2>Payment held! Your challenge is now active. Good luck 💪</h2>');
});

router.get('/cancel', (req, res) => {
  res.send('<h2>Challenge cancelled. No charge was made.</h2>');
});

// Resolve expired challenges — called by the daily checker
export async function resolveExpiredChallenges(syncTransactionsFn) {
  const { rows: expired } = await pool.query(
    `SELECT c.id, c.user_id, c.merchant_to_avoid, c.bet_amount, c.charity_slug,
            c.stripe_payment_intent_id, c.description, u.phone
     FROM challenges c JOIN users u ON u.id = c.user_id
     WHERE c.status = 'active' AND c.ends_at <= NOW()`
  );

  for (const challenge of expired) {
    try {
      const violated = await syncTransactionsFn(challenge.phone, challenge.merchant_to_avoid);

      if (violated) {
        await capturePayment(challenge.stripe_payment_intent_id);
        await donate({
          nonprofitSlug: challenge.charity_slug,
          amountCents: Math.round(challenge.bet_amount * 100),
          partnerDonationId: `challenge-${challenge.id}`,
          note: `Lost Money Coach challenge: ${challenge.description}`,
        });
        await pool.query(`UPDATE challenges SET status = 'lost' WHERE id = $1`, [challenge.id]);
        console.log(`Challenge ${challenge.id} LOST — $${challenge.bet_amount} donated to ${challenge.charity_slug}`);
      } else {
        await cancelPayment(challenge.stripe_payment_intent_id);
        await pool.query(`UPDATE challenges SET status = 'won' WHERE id = $1`, [challenge.id]);
        console.log(`Challenge ${challenge.id} WON — payment released`);
      }
    } catch (err) {
      console.error(`Error resolving challenge ${challenge.id}:`, err.message);
    }
  }

  return expired.length;
}

export default router;
