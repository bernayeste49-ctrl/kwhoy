// Utilidades de precios PVPC (datos de Red Eléctrica, €/MWh → €/kWh)
import raw from '../data/prices.json';

export const TZ = 'Europe/Madrid';

// Festivos nacionales en los que todo el día es periodo valle (peaje 2.0TD).
// Revisar cada año con el calendario oficial del BOE.
export const FESTIVOS = new Set([
  '2026-01-01', '2026-01-06', '2026-04-03', '2026-05-01', '2026-08-15', '2026-10-12',
  '2026-11-01', '2026-12-06', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-01-06', '2027-03-26', '2027-05-01', '2027-08-15', '2027-10-12',
  '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25',
]);

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fecha YYYY-MM-DD en hora peninsular española */
export function madridDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "martes, 17 de noviembre de 2026" */
export function longDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
/** "17 de noviembre" */
export function shortDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}
export function weekday(iso) {
  return DIAS[new Date(iso + 'T12:00:00Z').getUTCDay()];
}

export function isFestivoOFinde(iso) {
  const wd = new Date(iso + 'T12:00:00Z').getUTCDay();
  return wd === 0 || wd === 6 || FESTIVOS.has(iso);
}

/** Periodo tarifario 2.0TD para una hora (0-23) */
export function periodo(iso, hour) {
  if (isFestivoOFinde(iso)) return 'valle';
  if (hour < 8) return 'valle';
  if ((hour >= 10 && hour < 14) || (hour >= 18 && hour < 22)) return 'punta';
  return 'llano';
}

export function fmtPrice(eurKwh, decimals = 4) {
  return eurKwh.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Lista de fechas disponibles, de más reciente a más antigua */
export function availableDates() {
  return Object.keys(raw).sort().reverse();
}

/** Datos de un día ya procesados, o null si no hay */
export function getDay(iso) {
  const rows = raw[iso];
  if (!rows || !rows.length) return null;
  const seen = {};
  const hours = rows.map(([h, mwh]) => {
    const hour = Number(h);
    seen[h] = (seen[h] || 0) + 1;
    const label = `${h}:00 - ${String((hour + 1) % 24).padStart(2, '0')}:00` + (seen[h] > 1 ? ' (2ª)' : '');
    return { hour, label, price: mwh / 1000, periodo: periodo(iso, hour) };
  });
  const prices = hours.map((x) => x.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const t1 = sorted[Math.floor(sorted.length / 3)];
  const t2 = sorted[Math.floor((2 * sorted.length) / 3)];
  for (const x of hours) x.nivel = x.price < t1 ? 'barata' : x.price < t2 ? 'media' : 'cara';
  const cheapest = hours.find((x) => x.price === min);
  const priciest = hours.find((x) => x.price === max);
  const cheap3 = [...hours].sort((a, b) => a.price - b.price).slice(0, 3).sort((a, b) => a.hour - b.hour);
  return { iso, hours, min, max, avg, cheapest, priciest, cheap3, findeOFestivo: isFestivoOFinde(iso) };
}

/** Ventana de N horas consecutivas más barata del día */
export function bestWindow(day, n) {
  let best = null;
  for (let i = 0; i + n <= day.hours.length; i++) {
    const slice = day.hours.slice(i, i + n);
    const avg = slice.reduce((s, x) => s + x.price, 0) / n;
    if (!best || avg < best.avg) best = { start: slice[0], end: slice[n - 1], avg };
  }
  return best;
}

/** Comparación con el día anterior en % */
export function vsPrevious(day) {
  const prev = getDay(addDays(day.iso, -1));
  if (!prev) return null;
  return ((day.avg - prev.avg) / prev.avg) * 100;
}

/** Precio medio PVPC (€/kWh) de los últimos n días disponibles */
export function avgLastDays(n = 30) {
  const ds = availableDates().slice(0, n).map((iso) => getDay(iso));
  const avg = ds.reduce((s, d) => s + d.avg, 0) / ds.length;
  return { avg, dias: ds.length, desde: ds[ds.length - 1].iso, hasta: ds[0].iso };
}

/** Precio medio por hora del día (0-23) en los últimos n días, separando laborables y fines de semana/festivos */
export function hourlyProfile(n = 30) {
  const ds = availableDates().slice(0, n).map((iso) => getDay(iso));
  const acc = { lab: Array.from({ length: 24 }, () => []), fin: Array.from({ length: 24 }, () => []) };
  for (const d of ds) for (const h of d.hours) acc[d.findeOFestivo ? 'fin' : 'lab'][h.hour].push(h.price);
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  return {
    dias: ds.length, desde: ds[ds.length - 1].iso, hasta: ds[0].iso,
    lab: acc.lab.map(mean), fin: acc.fin.map(mean),
  };
}
