// Valores regulados para estimar facturas (peaje 2.0TD, península).
// Revisar cada enero y cuando cambien impuestos. Fuentes en la página de cada herramienta.
export const REGULADO = {
  actualizado: '2026-11-17',
  // Término de potencia PVPC: peajes + cargos (BOE/CNMC 2026) + margen de comercialización (3,113 €/kW·año)
  potenciaPuntaEurKwDia: 0.0738 + 3.113 / 365,
  potenciaValleEurKwDia: 0.0019,
  margenComercializacionEurKwAno: 3.113,
  alquilerContadorEurMes: 0.81, // contador inteligente monofásico
  bonoSocialEurDia: 0.0247, // financiación del bono social (aprox., varía por comercializadora)
  impuestoElectrico: 0.0511269632, // IEE 5,11269632 %
  iva: 0.21,
};

export const POTENCIAS_NORMALIZADAS = [2.3, 3.45, 4.6, 5.75, 6.9, 8.05, 9.2, 10.35];

/** Factura mensual estimada con los conceptos habituales */
export function factura({ kw, kwh, dias = 30, precioEnergia, potenciaPunta, potenciaValle, r = REGULADO }) {
  const potencia = kw * dias * (potenciaPunta + potenciaValle);
  const energia = kwh * precioEnergia;
  const bono = r.bonoSocialEurDia * dias;
  const iee = (potencia + energia + bono) * r.impuestoElectrico;
  const contador = r.alquilerContadorEurMes * (dias / 30);
  const base = potencia + energia + bono + iee + contador;
  const iva = base * r.iva;
  return { potencia, energia, bono, iee, contador, iva, total: base + iva };
}
