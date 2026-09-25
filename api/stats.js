// Vercel serverless function: GET /api/stats
// Aggregate registration stats for the event team's /stats page.
// The password is checked here, server side, against the STATS_PASSWORD
// environment variable (never in the repo — it is public). Only aggregates and
// company names are returned; names and email addresses stay in HubSpot.

const crypto = require('crypto');
const { CAP, FORCE, fetchSubmissions, uniqueRegistrations } = require('./_hubspot');

function passwordOk(given) {
  const expected = process.env.STATS_PASSWORD;
  if (!expected || !given) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

const amsterdamDay = ts => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(ts));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.STATS_PASSWORD) return res.status(503).json({ error: 'not configured' });
  if (!passwordOk(req.headers['x-stats-password'])) return res.status(401).json({ error: 'wrong password' });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(503).json({ error: 'HUBSPOT_TOKEN is not set' });

  try {
    const submissions = await fetchSubmissions(token);
    const regs = uniqueRegistrations(submissions);

    // Registrations per day, by the date of each person's first submission.
    const firstSeen = new Map();
    for (const s of submissions) {
      const key = (s.values.email || '').trim().toLowerCase() || Symbol();
      if (!firstSeen.has(key) || s.submittedAt < firstSeen.get(key)) firstSeen.set(key, s.submittedAt);
    }
    const perDayMap = {};
    for (const ts of firstSeen.values()) {
      if (!Number.isFinite(ts)) continue;
      const d = amsterdamDay(ts);
      perDayMap[d] = (perDayMap[d] || 0) + 1;
    }
    const perDay = Object.keys(perDayMap).sort().map(date => ({ date, count: perDayMap[date] }));

    // "I'm an EFC member" answers — the field name is set in HubSpot, so match loosely.
    const members = {};
    for (const r of regs) {
      const field = Object.keys(r.values).find(k => /member/i.test(k));
      const answers = field ? r.values[field].split(';').map(a => a.trim()).filter(Boolean) : [];
      if (!answers.length) answers.push('Not answered');
      for (const a of answers) members[a] = (members[a] || 0) + 1;
    }

    const companies = {};
    for (const r of regs) {
      const c = (r.values.company || '').trim();
      if (c) companies[c] = (companies[c] || 0) + 1;
    }

    const count = regs.length;
    return res.status(200).json({
      cap: CAP,
      count,
      remaining: Math.max(0, CAP - count),
      full: FORCE === 'full' || (FORCE !== 'open' && count >= CAP),
      forced: FORCE === 'open' || FORCE === 'full' ? FORCE : null,
      submissions: submissions.length,
      latest: submissions.reduce((m, s) => Math.max(m, s.submittedAt || 0), 0) || null,
      perDay,
      members: Object.entries(members).map(([answer, n]) => ({ answer, count: n })).sort((a, b) => b.count - a.count),
      companies: Object.entries(companies).map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      updated: Date.now()
    });
  } catch (err) {
    return res.status(502).json({ error: 'HubSpot lookup failed' });
  }
};
