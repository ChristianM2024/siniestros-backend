import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';
import { calcularTiempos } from '../utils/tiempos';

const router = Router();
router.use(requireAuth);

router.get('/', requierePermiso('dashboard', 'ver'), async (_req, res) => {
  const [total, pendientes, enProceso, solucionados, vehiculosEnFlota, todos] = await Promise.all([
    prisma.siniestro.count(),
    // "Pendiente" = sin estatus asignado todavía, o explícitamente "Reportado"
    prisma.siniestro.count({
      where: {
        OR: [
          { estatusSiniestroId: null },
          { estatusSiniestro: { nombre: 'Reportado' } },
        ],
      },
    }),
    prisma.siniestro.count({
      where: { estatusSiniestro: { nombre: { in: ['En Peritaje', 'En Reparacion'] } } },
    }),
    prisma.siniestro.count({
      where: { estatusSiniestro: { nombre: { in: ['Entregado', 'Cerrado'] } } },
    }),
    prisma.vehiculo.count({ where: { estado: 'Activo' } }),
    prisma.siniestro.findMany({ where: { fechaEntrega: { not: null } } }),
  ]);

  const tiemposTotales = todos
    .map((s: (typeof todos)[number]) => calcularTiempos(s).tiempoTotal)
    .filter((t: number | null): t is number => t !== null);

  const tiempoPromedio =
    tiemposTotales.length > 0
      ? Math.round(tiemposTotales.reduce((a: number, b: number) => a + b, 0) / tiemposTotales.length)
      : 0;

  res.json({
    totalSiniestros: total,
    pendientes,
    enProceso,
    solucionados,
    vehiculosEnFlota,
    tiempoPromedioDias: tiempoPromedio,
  });
});

export default router;
