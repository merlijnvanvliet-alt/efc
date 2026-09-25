// Vercel serverless function: GET /api/registrations
// Counts unique registrations (by email) for the Future Routes HubSpot form,
// so the event page can close the form once the cap is reached.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   HUBSPOT_TOKEN       HubSpot private app token with the `forms` scope (required)
//   REGISTRATION_CAP    number of seats, default 70
//   REGISTRATION_FORCE  optional manual override: "open" or "full"
//   HUBSPOT_FORM_ID     optional, defaults to the Future Routes form

const { CAP, FORCE, fetchSubmissions, uniqueRegistrations } = require('./_hubspot');

module.exports = async (req, res) => {
  // Cache at Vercel's edge for 30s so a busy page does not hit HubSpot per visitor.
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

  if (FORCE === 'open' || FORCE === 'full') {
    return res.status(200).json({ cap: CAP, count: null, full: FORCE === 'full', forced: true });
  }

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    // Fail open: without a token the page simply keeps the form.
    return res.status(200).json({ cap: CAP, count: null, full: false, error: 'not configured' });
  }

  try {
    const count = uniqueRegistrations(await fetchSubmissions(token)).length;
    return res.status(200).json({ cap: CAP, count, remaining: Math.max(0, CAP - count), full: count >= CAP });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ cap: CAP, count: null, full: false, error: 'lookup failed' });
  }
};
