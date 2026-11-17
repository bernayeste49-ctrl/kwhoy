// Descarga el PVPC de Red Eléctrica (ayer, hoy y mañana) y lo añade a src/data/prices.json
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/data/prices.json', import.meta.url);
const madrid = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shift = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const today = madrid(new Date());
const start = shift(today, -1);
const end = shift(today, 1);
const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${start}T00:00&end_date=${end}T23:59&time_trunc=hour`;

const res = await fetch(url, { headers: { Accept: 'application/json' } });
if (!res.ok) throw new Error(`REE respondió ${res.status}`);
const json = await res.json();
const pvpc = json.included?.find((x) => x.type === 'PVPC');
if (!pvpc) throw new Error('La respuesta no trae la serie PVPC');

const fresh = {};
for (const v of pvpc.attributes.values) {
  const iso = v.datetime.slice(0, 10);
  (fresh[iso] ??= []).push([v.datetime.slice(11, 13), v.value]);
}

const data = JSON.parse(await readFile(FILE, 'utf8'));
let changed = 0;
for (const [iso, rows] of Object.entries(fresh)) {
  if (rows.length < 23) continue; // día incompleto: lo ignoramos
  if (JSON.stringify(data[iso]) !== JSON.stringify(rows)) { data[iso] = rows; changed++; }
}
const sorted = Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(FILE, JSON.stringify(sorted) + '\n');
console.log(`Días actualizados: ${changed}. Días publicados: ${Object.keys(fresh).join(', ')}`);
