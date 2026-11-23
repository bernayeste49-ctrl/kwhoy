// Publica en el canal de Telegram el precio de la luz de mañana, una sola vez al día.
// Necesita el secreto TELEGRAM_BOT_TOKEN y la variable TELEGRAM_CHAT (p. ej. @kwhoy).
import { readFile, writeFile } from 'node:fs/promises';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT;
const DRY = process.argv.includes('--dry');
if (!DRY && (!TOKEN || !CHAT)) { console.log('Telegram sin configurar: no se publica.'); process.exit(0); }

const PRICES = new URL('../src/data/prices.json', import.meta.url);
const STATE = new URL('../src/data/telegram.json', import.meta.url);
const madrid = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shift = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const tomorrow = shift(process.env.KWH_TODAY || madrid(new Date()), 1);
const data = JSON.parse(await readFile(PRICES, 'utf8'));
const state = JSON.parse(await readFile(STATE, 'utf8').catch(() => '{}'));
const rows = data[tomorrow];
if (!rows || rows.length < 23) { console.log(`Aún no hay precios de ${tomorrow}.`); process.exit(0); }
if (state.lastSent === tomorrow && !DRY) { console.log(`Ya publicado ${tomorrow}.`); process.exit(0); }

// Horas únicas (el día del cambio de hora puede repetir una)
const seen = new Set();
const hours = rows.filter(([h]) => !seen.has(h) && seen.add(h)).map(([h, mwh]) => ({ h: +h, p: mwh / 1000 }));
const fmt = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const hh = (h) => String(h % 24).padStart(2, '0') + ':00';
const avg = hours.reduce((s, x) => s + x.p, 0) / hours.length;
const sorted = [...hours].sort((a, b) => a.p - b.p);
const min = sorted[0], max = sorted[sorted.length - 1];
const t1 = sorted[Math.floor(hours.length / 3)].p, t2 = sorted[Math.floor((2 * hours.length) / 3)].p;
const dot = (p) => (p < t1 ? '🟢' : p < t2 ? '🟡' : '🔴');

// Mejor franja seguida de 3 horas (lavadora, lavavajillas)
let best = null;
for (let i = 0; i + 3 <= hours.length; i++) {
  const m = (hours[i].p + hours[i + 1].p + hours[i + 2].p) / 3;
  if (!best || m < best.m) best = { i, m };
}
const bh = hours[best.i].h;

const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const d = new Date(tomorrow + 'T12:00:00Z');
const fecha = `${dias[d.getUTCDay()]} ${d.getUTCDate()} de ${meses[d.getUTCMonth()]}`;

// Comparación con hoy
const today = data[shift(tomorrow, -1)];
let cmp = '';
if (today?.length >= 23) {
  const a0 = today.reduce((s, [, v]) => s + v / 1000, 0) / today.length;
  const pct = Math.round(((avg - a0) / a0) * 100);
  cmp = pct === 0 ? ' (igual que hoy)' : ` (${pct > 0 ? '+' : ''}${pct} % que hoy)`;
}

const grid = [0, 6, 12, 18].map((s) => hours.slice(s, s + 6).map((x) => `${hh(x.h).slice(0, 2)}h ${dot(x.p)}`).join('  ')).join('\n');

const text = [
  `⚡ <b>Precio de la luz mañana, ${fecha}</b>`,
  '',
  `Media: <b>${fmt(avg)} €/kWh</b>${cmp}`,
  `🟢 Más barata: ${hh(min.h)} a ${hh(min.h + 1)}, ${fmt(min.p)} €/kWh`,
  `🔴 Más cara: ${hh(max.h)} a ${hh(max.h + 1)}, ${fmt(max.p)} €/kWh`,
  '',
  `🧺 Mejor franja de 3 horas para lavadora o lavavajillas: <b>${hh(bh)} a ${hh(bh + 3)}</b> (${fmt(best.m)} €/kWh de media)`,
  '',
  `<code>${grid}</code>`,
  '',
  `Hora a hora: https://kwhoy.es/precio-luz/${tomorrow}/`,
  '<i>PVPC de Red Eléctrica, sin impuestos.</i>',
].join('\n');

if (DRY) { console.log(text); process.exit(0); }

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
});
const out = await res.json();
if (!out.ok) throw new Error(`Telegram respondió: ${out.description}`);
await writeFile(STATE, JSON.stringify({ lastSent: tomorrow }, null, 2) + '\n');
console.log(`Publicado ${tomorrow} en ${CHAT}.`);
