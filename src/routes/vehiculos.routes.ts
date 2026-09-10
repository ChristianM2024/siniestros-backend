import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

// Incluye usado en GET / y GET /buscar/:placa — trae todos los catálogos
// nuevos ya resueltos (no solo el id) para que el frontend pinte nombres.
const includeCompleto = {
  ciudad: true,
  aseguradora: true,
  cliente: true,
  administrador: true,
  gerenteCuenta: true,
  tipoActivo: true,
  tipoCombustible: true,
  clase: true,
  gama: true,
  proveedorCompra: true,
  tipoOperacion: true,
  nivelBlindaje: true,
};

router.get('/', requierePermiso('vehiculos', 'ver'), async (req, res) => {
  const vehiculos = await prisma.vehiculo.findMany({
    include: { ...includeCompleto, _count: { select: { siniestros: true } } },
    orderBy: { placa: 'asc' },
  });
  res.json(vehiculos);
});

// GET /api/vehiculos/buscar/:placa -> equivalente a la macro BuscarVehiculo del Excel
router.get('/buscar/:placa', requierePermiso('reportar_siniestro', 'ver'), async (req, res) => {
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { placa: req.params.placa.toUpperCase() },
    include: includeCompleto,
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
  clienteId: z.number(),
  noContrato: z.string().optional(),
  ciudadId: z.number().optional(),
  aseguradoraId: z.number().optional(),
  noPoliza: z.string().optional(),
  vencimientoPoliza: z.coerce.date().optional(),

  // --- NUEVO: datos de contrato/cotización ---
  noAnexo: z.string().optional(),
  noCotizacion: z.string().optional(),
  noFactura: z.string().optional(),
  fechaInicioContrato: z.coerce.date().optional(),
  fechaFinContrato: z.coerce.date().optional(),
  kmAnualContratado: z.number().optional(),

  // --- NUEVO: catálogos (todos opcionales, ids de las tablas nuevas) ---
  administradorId: z.number().optional(),
  gerenteCuentaId: z.number().optional(),
  tipoActivoId: z.number().optional(),
  tipoCombustibleId: z.number().optional(),
  claseId: z.number().optional(),
  gamaId: z.number().optional(),
  proveedorCompraId: z.number().optional(),
  tipoOperacionId: z.number().optional(),
  nivelBlindajeId: z.number().optional(),

  // --- NUEVO: banderas ---
  blindaje: z.boolean().optional(),
  sustituto: z.boolean().optional(),
});

router.post('/', requierePermiso('vehiculos', 'crear'), async (req, res) => {
  const parsed = vehiculoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const vehiculo = await prisma.vehiculo.create({
    data: { ...parsed.data, placa: parsed.data.placa.toUpperCase() },
    include: includeCompleto,
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
    include: includeCompleto,
  });
  res.json(vehiculo);
});

router.delete('/:id', requierePermiso('vehiculos', 'eliminar'), async (req, res) => {
  await prisma.vehiculo.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;