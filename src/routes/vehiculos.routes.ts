import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

router.get('/', requierePermiso('vehiculos', 'ver'), async (req, res) => {
  const vehiculos = await prisma.vehiculo.findMany({
    include: { ciudad: true, aseguradora: true, _count: { select: { siniestros: true } } },
    orderBy: { placa: 'asc' },
  });
  res.json(vehiculos);
});

// GET /api/vehiculos/buscar/:placa -> equivalente a la macro BuscarVehiculo del Excel
router.get('/buscar/:placa', requierePermiso('reportar_siniestro', 'ver'), async (req, res) => {
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { placa: req.params.placa.toUpperCase() },
    include: { ciudad: true, aseguradora: true },
  });
  if (!vehiculo) return res.status(404).json({ error: 'Vehiculo no encontrado' });
  res.json(vehiculo);
});

const vehiculoSchema = z.object({
  placa: z.string().min(1),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  anio: z.number().optional(),
  color: z.string().optional(),
  chasis: z.string().optional(),
  noMotor: z.string().optional(),
  cliente: z.string().min(1),
  noContrato: z.string().optional(),
  ciudadId: z.number().optional(),
  aseguradoraId: z.number().optional(),
  noPoliza: z.string().optional(),
  vencimientoPoliza: z.coerce.date().optional(),
});

router.post('/', requierePermiso('vehiculos', 'crear'), async (req, res) => {
  const parsed = vehiculoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const vehiculo = await prisma.vehiculo.create({
    data: { ...parsed.data, placa: parsed.data.placa.toUpperCase() },
  });
  res.status(201).json(vehiculo);
});

router.put('/:id', requierePermiso('vehiculos', 'editar'), async (req, res) => {
  const parsed = vehiculoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const vehiculo = await prisma.vehiculo.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(vehiculo);
});

router.delete('/:id', requierePermiso('vehiculos', 'eliminar'), async (req, res) => {
  await prisma.vehiculo.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
