export { formatINR, percentOff, formatPhone, maskPhone } from '@unibody/shared';

const IST = 'Asia/Kolkata';
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
export const fmtDateShort = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST });
export const fmtWeekday = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: IST });
