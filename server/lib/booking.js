// Meetings are booked on Calendly or Cal.com (shown inside the website). The dashboard
// lists upcoming appointments by reading them from that service with a server-side key
// (CALENDLY_TOKEN or CALCOM_API_KEY). Read-only: nothing is created, changed or cancelled here.

const TIMEOUT = 12000;

async function getJson(fetchImpl, url, headers) {
  let res;
  try {
    res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(TIMEOUT) });
  } catch (e) {
    const err = new Error(`unreachable (${e.name})`);
    err.code = 'UNREACHABLE';
    throw err;
  }
  if (res.status === 401 || res.status === 403) {
    const err = new Error('The access key was refused (expired, revoked or missing permissions).');
    err.code = 'AUTH';
    throw err;
  }
  if (res.status === 429) {
    const err = new Error('Too many requests — please try again in a minute.');
    err.code = 'RATE';
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`The booking service answered ${res.status}.`);
    err.code = 'HTTP';
    throw err;
  }
  return res.json();
}

export function createBookingService(cfg, fetchImpl = globalThis.fetch) {
  const status = (provider) => {
    const token = provider === 'cal' ? cfg.calcomApiKey : cfg.calendlyToken;
    return { provider, connected: !!token, envVar: provider === 'cal' ? 'CALCOM_API_KEY' : 'CALENDLY_TOKEN' };
  };

  async function calendly() {
    const h = { Authorization: `Bearer ${cfg.calendlyToken}`, 'Content-Type': 'application/json' };
    const me = await getJson(fetchImpl, 'https://api.calendly.com/users/me', h);
    const user = me && me.resource && me.resource.uri;
    const q = new URLSearchParams({ user, min_start_time: new Date().toISOString(), sort: 'start_time:asc', count: '50', status: 'active' });
    const list = await getJson(fetchImpl, `https://api.calendly.com/scheduled_events?${q}`, h);
    const events = (list && list.collection) || [];
    const out = [];
    for (const ev of events.slice(0, 50)) {
      let invitees = [];
      try {
        const uuid = String(ev.uri || '').split('/').pop();
        const inv = await getJson(fetchImpl, `https://api.calendly.com/scheduled_events/${encodeURIComponent(uuid)}/invitees?count=10`, h);
        invitees = ((inv && inv.collection) || []).map((i) => ({ name: i.name || '', email: i.email || '', cancelUrl: i.cancel_url || '', rescheduleUrl: i.reschedule_url || '' }));
      } catch {
        /* the event is still listed without invitee details */
      }
      out.push({ id: ev.uri, title: ev.name || '', start: ev.start_time, end: ev.end_time, status: ev.status || 'active', location: (ev.location && (ev.location.join_url || ev.location.location || ev.location.type)) || '', invitees });
    }
    return out;
  }

  async function cal() {
    const h = { Authorization: `Bearer ${cfg.calcomApiKey}`, 'cal-api-version': '2024-08-13' };
    const list = await getJson(fetchImpl, 'https://api.cal.com/v2/bookings?status=upcoming&take=50', h);
    const items = (list && list.data) || [];
    return items.map((b) => ({
      id: String(b.uid || b.id),
      title: b.title || '',
      start: b.start || b.startTime,
      end: b.end || b.endTime,
      status: b.status || '',
      location: b.meetingUrl || b.location || '',
      invitees: (b.attendees || []).map((a) => ({ name: a.name || '', email: a.email || '', cancelUrl: '', rescheduleUrl: '' })),
    }));
  }

  return {
    status,
    /** Upcoming appointments, or { connected: false } when no key is configured. */
    async upcoming(provider) {
      const s = status(provider);
      if (!s.connected) return { ...s, items: [] };
      try {
        const items = provider === 'cal' ? await cal() : await calendly();
        return { ...s, items, fetchedAt: new Date().toISOString() };
      } catch (e) {
        return { ...s, items: [], error: e.message, errorCode: e.code || 'ERROR' };
      }
    },
  };
}
