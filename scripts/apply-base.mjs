// Si la web se publica en una subcarpeta (p. ej. usuario.github.io/kwhoy/ mientras
// no hay dominio propio), reescribe los enlaces absolutos de dist/ para añadirle el prefijo.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.SITE_BASE || '').replace(/\/$/, '');
if (!base) { console.log('Sin SITE_BASE: enlaces sin cambios'); process.exit(0); }
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const f of walk('dist').filter((f) => f.endsWith('.html'))) {
  const h = readFileSync(f, 'utf8');
  const out = h.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);
  if (out !== h) { writeFileSync(f, out); n++; }
}
console.log(`Prefijo ${base} aplicado en ${n} páginas`);
