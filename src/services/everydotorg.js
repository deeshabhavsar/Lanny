import axios from 'axios';

export async function donate({ nonprofitSlug, amountCents, partnerDonationId, note }) {
  const response = await axios.post(
    `https://api.every.org/v0.2/donate`,
    {
      amount: amountCents,
      currency: 'USD',
      partnerDonationId,
      partnerMetadata: { note },
    },
    {
      params: { nonprofitSlug },
      headers: {
        Authorization: `Bearer ${process.env.EVERY_ORG_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}
