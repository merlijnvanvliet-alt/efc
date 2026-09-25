// Shared HubSpot helpers for the Future Routes API routes.
// Files starting with "_" are not exposed as routes by Vercel.

const FORM_ID = process.env.HUBSPOT_FORM_ID || '62c142a2-4fc1-4182-821d-de28dd85a315';
const CAP = parseInt(process.env.REGISTRATION_CAP, 10) || 70;
const FORCE = (process.env.REGISTRATION_FORCE || '').toLowerCase();

// All submissions of the form, newest first, as { submittedAt, values: {name: value} }.
async function fetchSubmissions(token) {
  const all = [];
  let after;
  // Pages of 50; the loop limit guards against a paging bug running forever.
  for (let page = 0; page < 100; page++) {
    const url = new URL(`https://api.hubapi.com/form-integrations/v1/submissions/forms/${FORM_ID}`);
    url.searchParams.set('limit', '50');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HubSpot responded ${res.status}`);
    const data = await res.json();

    for (const s of data.results || []) {
      const values = {};
      for (const v of s.values || []) {
        // Multi-select fields arrive as one entry per option; join them.
        values[v.name] = values[v.name] ? values[v.name] + ';' + v.value : v.value;
      }
      all.push({ submittedAt: s.submittedAt, values });
    }

    after = data.paging && data.paging.next && data.paging.next.after;
    if (!after) break;
  }
  return all;
}

// One registration per email address; the latest submission wins.
function uniqueRegistrations(submissions) {
  const byEmail = new Map();
  const anonymous = [];
  for (const s of submissions) {
    const email = (s.values.email || '').trim().toLowerCase();
    if (!email) { anonymous.push(s); continue; }
    const prev = byEmail.get(email);
    if (!prev || s.submittedAt > prev.submittedAt) byEmail.set(email, s);
  }
  return [...byEmail.values(), ...anonymous];
}

module.exports = { FORM_ID, CAP, FORCE, fetchSubmissions, uniqueRegistrations };
