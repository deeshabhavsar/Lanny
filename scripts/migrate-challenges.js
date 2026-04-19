import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Safe to run multiple times — IF NOT EXISTS means it won't break if already created
await client.query(`
  CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    merchant_to_avoid VARCHAR(255) NOT NULL,
    bet_amount DECIMAL(10, 2) NOT NULL,
    charity_slug VARCHAR(255) NOT NULL DEFAULT 'feeding-america',
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    starts_at TIMESTAMP DEFAULT NOW(),
    ends_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_payment'
      CHECK (status IN ('pending_payment', 'active', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS idx_challenges_active
  ON challenges(user_id, status, ends_at)
  WHERE status = 'active';
`);

console.log('Migration complete: challenges table ready.');
await client.end();
