const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const IST_OFFSET_MIN = 330;

/** Shift a date into IST wall-clock (no Intl dependency — Hermes-safe). */
function ist(iso: string | Date): Date {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Date(d.getTime() + (IST_OFFSET_MIN + d.getTimezoneOffset()) * 60000);
}
const pad = (n: number) => String(n).padStart(2, '0');

/** 27 Sep */
export const fmtDay = (iso: string) => {
  const d = ist(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
/** 27 Sep 2026 */
export const fmtDate = (iso: string) => {
  const d = ist(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
/** 27 Sep, 11:42 */
export const fmtDateTime = (iso: string) => {
  const d = ist(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** Tuesday, 29 Sep */
export const fmtWeekday = (iso: string) => {
  const d = ist(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
/** Tue, 29 Sep */
export const fmtShortWeekday = (iso: string) => {
  const d = ist(iso);
  return `${DAYS[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
