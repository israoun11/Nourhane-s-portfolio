import { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { Button } from '../components/ui.jsx';
import { useMeta } from '../hooks/motion.js';
import { useI18n } from '../i18n/index.jsx';
import { BookingSummary } from '../sections/Booking.jsx';

/** Private page from the confirmation: see the meeting and cancel it. */
export default function BookingManage() {
  const { t, lang } = useI18n();
  useMeta(t('bk.manageTitle'));
  const q = new URLSearchParams(window.location.search);
  const id = q.get('id');
  const token = q.get('t');
  const [b, setB] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | missing | error | sure | cancelling
  useEffect(() => {
    fetch(`/api/booking/${encodeURIComponent(id || '')}?t=${encodeURIComponent(token || '')}`)
      .then(async (r) => {
        if (r.status === 404) return setState('missing');
        if (!r.ok) return setState('error');
        setB((await r.json()).booking);
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [id, token]);
  const cancel = async () => {
    setState('cancelling');
    try {
      const r = await fetch(`/api/booking/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token }) });
      if (r.ok) setB((x) => ({ ...x, status: 'cancelled' }));
      setState(r.ok ? 'ok' : 'error');
    } catch {
      setState('error');
    }
  };
  return (
    <>
      <Header />
      <main id="main" className="prodpage">
        <div className="prodpage__wrap bk-manage">
          <h1 className="prodpage__title">{t('bk.manageTitle')}</h1>
          {state === 'loading' && <p role="status">{t('bk.loading')}</p>}
          {state === 'missing' && <p className="form__msg form__msg--err" role="alert">{t('bk.notFound')}</p>}
          {state === 'error' && <p className="form__msg form__msg--err" role="alert">{t('bk.failed')}</p>}
          {b && (
            <div className="booking">
              <p className={`form__msg${b.status === 'cancelled' ? ' form__msg--err' : ' form__msg--ok'}`} role="status">
                {b.status === 'cancelled' ? t('bk.isCancelled') : b.status === 'done' ? t('bk.isDone') : t('bk.isConfirmed')}
              </p>
              <BookingSummary b={b} lang={lang} />
              {b.status === 'confirmed' && new Date(b.start) > new Date() && (
                state === 'sure' ? (
                  <div className="bk-row">
                    <Button type="button" variant="ink" onClick={cancel}>{t('bk.cancelYes')}</Button>
                    <button type="button" className="ulink" onClick={() => setState('ok')}>{t('bk.keep')}</button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setState('sure')} disabled={state === 'cancelling'}>{t('bk.cancel')}</Button>
                )
              )}
            </div>
          )}
          <p><a className="ulink" href="/#contact">{t('bk.backContact')}</a></p>
        </div>
      </main>
      <Footer />
    </>
  );
}
