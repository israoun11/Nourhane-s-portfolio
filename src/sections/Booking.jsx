// Built-in meeting calendar: meeting type → day → time → name & email → confirmation.
// Only times computed by the server from the owner's availability are shown, and a
// meeting is shown as booked only after the server has saved it.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useContent } from '../content/ContentProvider.jsx';
import { Button } from '../components/ui.jsx';
import { useI18n } from '../i18n/index.jsx';
import { getSource } from '../lib/source.js';

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"'.]+(\.[^\s@<>"'.]+)+$/;
export const localeOf = (lang) => (lang === 'ar' ? 'ar-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-GB');
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const visitorTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

/** .ics file so the visitor can add the meeting to their own calendar. */
function icsHref(b, title) {
  const f = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => String(s).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nourhane//booking//EN', 'BEGIN:VEVENT', `UID:${b.id}@booking`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(b.start)}`, `DTEND:${f(b.end)}`, `SUMMARY:${esc(title)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export function BookingSummary({ b, lang, name }) {
  const { t } = useI18n();
  const loc = localeOf(lang);
  const start = new Date(b.start);
  return (
    <dl className="bk-sum">
      <div><dt>{t('bk.type')}</dt><dd>{b.type} · {t('booking.minutes', { n: b.duration })}</dd></div>
      <div><dt>{t('bk.date')}</dt><dd>{start.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
      <div><dt>{t('bk.time')}</dt><dd dir="ltr">{start.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })} – {new Date(b.end).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}</dd></div>
      <div><dt>{t('bk.tz')}</dt><dd dir="ltr">{visitorTz()}</dd></div>
      {name && <div><dt>{t('lead.name')}</dt><dd>{name}</dd></div>}
    </dl>
  );
}

export function BuiltinBooking({ onMessage }) {
  const { booking = {}, site } = useContent();
  const { t, lang } = useI18n();
  const loc = localeOf(lang);
  const types = booking.types || [];
  const [type, setType] = useState(0);
  const [data, setData] = useState(null); // { open, days } | { error }
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [err, setErr] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | taken | error | offline | rate
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    try {
      const r = await fetch(`/api/booking/slots?type=${type}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
    } catch {
      setData({ error: true });
    }
  }, [type]);
  useEffect(() => {
    load();
    setDay('');
    setSlot('');
  }, [load]);

  // free times grouped by the visitor's own calendar day
  const byDay = useMemo(() => {
    const m = new Map();
    for (const d of (data && data.days) || []) {
      for (const iso of d.slots) {
        const k = dayKey(new Date(iso));
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(iso);
      }
    }
    return m;
  }, [data]);
  const keys = [...byDay.keys()].sort();
  const months = [...new Set(keys.map((k) => k.slice(0, 7)))];
  const curMonth = months[Math.min(month, months.length - 1)];

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const f = e.currentTarget.elements;
    const v = { type, start: slot, name: f.name.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), lang, company: f.company.value, source: getSource() };
    const next = {};
    if (!v.name) next.name = 'required';
    if (!EMAIL_RE.test(v.email)) next.email = 'invalid';
    setErr(next);
    if (Object.keys(next).length) return (next.name ? f.name : f.email).focus();
    setStatus('sending');
    let r;
    try {
      r = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(v) });
    } catch {
      return setStatus('offline');
    }
    let body = {};
    try {
      body = await r.json();
    } catch {
      /* not JSON */
    }
    if (r.status === 201 && body.ok) {
      setDone({ ...body, name: v.name });
      setStatus('idle');
      return;
    }
    if (r.status === 422 && body.fields) {
      setErr(body.fields);
      return setStatus('idle');
    }
    if (r.status === 409) {
      setSlot('');
      load();
      return setStatus(body.code === 'CLOSED' ? 'error' : 'taken');
    }
    setStatus(r.status === 429 ? 'rate' : 'error');
  };

  if (done) {
    const manage = `${window.location.origin}${done.manage}`;
    return (
      <div className="booking bk-done" role="status">
        <p className="lead__ok">{t('bk.confirmed')}</p>
        <BookingSummary b={done.booking} lang={lang} name={done.name} />
        <div className="bk-row">
          <a className="btn btn--blue btn--md" href={icsHref(done.booking, `${done.booking.type} — ${site.name}`)} download="meeting.ics">{t('bk.addCal')} <span className="ar" aria-hidden="true">↓</span></a>
          <a className="ulink" href={done.manage}>{t('bk.manage')}</a>
        </div>
        <p className="lead__small">{t('bk.keepLink')} <span className="bk-link" dir="ltr">{manage}</span></p>
      </div>
    );
  }

  if (data && data.open === false) {
    return (
      <div className="booking booking--empty" role="status">
        <p>{t('booking.notSet')}</p>
        <Button type="button" variant="outline" onClick={onMessage}>{t('booking.sendMessage')}</Button>
      </div>
    );
  }

  const monthDays = (() => {
    if (!curMonth) return [];
    const [y, m] = curMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const lead = (first.getDay() + 6) % 7; // weeks start on Monday
    const n = new Date(y, m, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => new Date(y, m - 1, i + 1))];
  })();
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: 'short' }));

  return (
    <div className="booking bk">
      {booking.note && <p className="booking__note">{booking.note}</p>}
      {types.length > 1 && (
        <div className="booking__types" role="radiogroup" aria-label={t('booking.types')}>
          {types.map((x, i) => (
            <button key={i} type="button" role="radio" aria-checked={i === type} className={`chip${i === type ? ' chip--blue' : ' chip--line'}`} onClick={() => setType(i)}>
              {x.name} · {t('booking.minutes', { n: x.duration })}
            </button>
          ))}
        </div>
      )}
      {types.length === 1 && <p className="bk-type">{types[0].name} · {t('booking.minutes', { n: types[0].duration })}</p>}

      {!data && <p className="lead__small" role="status">{t('bk.loading')}</p>}
      {data && data.error && (
        <p className="form__msg form__msg--err" role="alert">
          {t('bk.loadError')} <button type="button" className="ulink" onClick={load}>{t('bk.retry')}</button>
        </p>
      )}
      {data && data.open && keys.length === 0 && (
        <div className="booking--empty">
          <p>{t('bk.noTimes')}</p>
          <Button type="button" variant="outline" onClick={onMessage}>{t('booking.sendMessage')}</Button>
        </div>
      )}

      {data && data.open && keys.length > 0 && (
        <div className="bk-grid">
          <div className="bk-cal">
            <div className="bk-cal__head">
              <button type="button" className="bk-nav" onClick={() => setMonth((x) => Math.max(0, x - 1))} disabled={month <= 0} aria-label={t('bk.prevMonth')}><span aria-hidden="true">←</span></button>
              <b>{new Date(`${curMonth}-01T12:00:00`).toLocaleDateString(loc, { month: 'long', year: 'numeric' })}</b>
              <button type="button" className="bk-nav" onClick={() => setMonth((x) => Math.min(months.length - 1, x + 1))} disabled={month >= months.length - 1} aria-label={t('bk.nextMonth')}><span aria-hidden="true">→</span></button>
            </div>
            <div className="bk-cal__grid" role="grid" aria-label={t('bk.pickDay')}>
              {weekdays.map((w) => <span key={w} className="bk-cal__wd" aria-hidden="true">{w}</span>)}
              {monthDays.map((d, i) => {
                if (!d) return <span key={i} />;
                const k = dayKey(d);
                const free = byDay.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`bk-day${free ? ' is-free' : ''}${day === k ? ' is-on' : ''}`}
                    disabled={!free}
                    aria-pressed={day === k}
                    aria-label={`${d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}${free ? ` — ${t('bk.free', { n: byDay.get(k).length })}` : ''}`}
                    onClick={() => {
                      setDay(k);
                      setSlot('');
                    }}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <p className="lead__small">{t('bk.yourTz', { tz: visitorTz() })}</p>
          </div>

          <div className="bk-side">
            {!day && <p className="bk-hint">{t('bk.pickDay')}</p>}
            {day && (
              <>
                <p className="bk-side__t">{new Date(`${day}T12:00:00`).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <div className="bk-times" role="radiogroup" aria-label={t('bk.pickTime')}>
                  {byDay.get(day).map((iso) => (
                    <button key={iso} type="button" role="radio" aria-checked={slot === iso} className={`bk-time${slot === iso ? ' is-on' : ''}`} onClick={() => setSlot(iso)} dir="ltr">
                      {new Date(iso).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              </>
            )}
            {status === 'taken' && <p role="alert" className="form__msg form__msg--err">{t('bk.taken')}</p>}
            {slot && (
              <form className="bk-form" noValidate onSubmit={submit} aria-label={t('bk.form')}>
                <label className="field">
                  {t('lead.name')}
                  <input name="name" autoComplete="name" maxLength={120} aria-invalid={!!err.name} className={err.name ? 'is-invalid' : ''} />
                  {err.name && <span role="alert" className="field__err">{t('lead.err.name')}</span>}
                </label>
                <label className="field">
                  {t('lead.email')}
                  <input name="email" type="email" dir="ltr" autoComplete="email" aria-invalid={!!err.email} className={err.email ? 'is-invalid' : ''} />
                  {err.email && <span role="alert" className="field__err">{t('lead.err.email')}</span>}
                </label>
                <label className="field">
                  {t('bk.message')}
                  <textarea name="message" rows={3} maxLength={2000} />
                </label>
                <label className="sr-only" aria-hidden="true">
                  {t('contact.company')}
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
                <Button type="submit" arrow disabled={status === 'sending'} aria-busy={status === 'sending'}>
                  {status === 'sending' ? t('bk.sending') : t('bk.confirm')}
                </Button>
                {status === 'error' && <p role="alert" className="form__msg form__msg--err">{t('bk.failed')}</p>}
                {status === 'offline' && <p role="alert" className="form__msg form__msg--err">{t('contact.offline')}</p>}
                {status === 'rate' && <p role="alert" className="form__msg form__msg--err">{t('contact.rate')}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
