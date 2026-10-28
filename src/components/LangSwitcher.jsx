// EN · FR · ع — switches the whole interface instantly (no page reload) and remembers the choice.
import { LANGS, useI18n } from '../i18n/index.jsx';

export default function LangSwitcher({ className = '', onChange }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang ${className}`.trim()} role="group" aria-label={t('lang.choose')}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={`lang__btn${lang === l.code ? ' is-on' : ''}`}
          aria-pressed={lang === l.code}
          aria-label={l.label}
          title={l.label}
          onClick={() => {
            setLang(l.code);
            if (onChange) onChange(l.code);
          }}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
