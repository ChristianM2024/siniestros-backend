// Replica la logica de la hoja SEGUIMIENTO:
// Tiempo A = Fecha Notif. Aseguradora - Fecha Siniestro
// Tiempo B = Fecha Ingreso Taller - Fecha Notif. Aseguradora
// Tiempo C = Fecha Entrega - Fecha Ingreso Taller
// Tiempo Total = Fecha Entrega - Fecha Siniestro

function diffDias(desde?: Date | null, hasta?: Date | null): number | null {
  if (!desde || !hasta) return null;
  const ms = hasta.getTime() - desde.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function calcularTiempos(siniestro: {
  fechaSiniestro: Date;
  fechaNotifAseg?: Date | null;
  fechaIngresoTaller?: Date | null;
  fechaEntrega?: Date | null;
}) {
  const tiempoA = diffDias(siniestro.fechaSiniestro, siniestro.fechaNotifAseg);
  const tiempoB = diffDias(siniestro.fechaNotifAseg, siniestro.fechaIngresoTaller);
  const tiempoC = diffDias(siniestro.fechaIngresoTaller, siniestro.fechaEntrega);
  const tiempoTotal = diffDias(siniestro.fechaSiniestro, siniestro.fechaEntrega);

  return { tiempoA, tiempoB, tiempoC, tiempoTotal };
}
