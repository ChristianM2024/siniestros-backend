import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

const schemaNombre = z.object({ nombre: z.string().min(1) });

// ============================================================
// 1. ESTATUS DE COBRO AL CLIENTE (catálogo simple, relacionado a Siniestro)
// ============================================================

router.get('/estatus-cobro-cliente', requierePermiso('mantenimiento', 'ver'), async (_req, res) => {
  const items = await prisma.estatusCobroCliente.findMany({
    include: { _count: { select: { siniestros: true } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(items);
});

router.post('/estatus-cobro-cliente', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schemaNombre.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const item = await prisma.estatusCobroCliente.create({ data: { nombre: parsed.data.nombre.trim() } });
  res.status(201).json(item);
});

router.put('/estatus-cobro-cliente/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = schemaNombre.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const data = parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre.trim() } : {};
  const item = await prisma.estatusCobroCliente.update({ where: { id: Number(req.params.id) }, data });
  res.json(item);
});

router.delete('/estatus-cobro-cliente/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.siniestro.count({ where: { estatusCobroClienteId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) con este estatus de cobro` });
  }
  await prisma.estatusCobroCliente.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

// ============================================================
// 2. TALLER (catálogo simple, pero con sub-recurso de ciudades)
// ============================================================

router.get('/talleres', requierePermiso('mantenimiento', 'ver'), async (_req, res) => {
  const talleres = await prisma.taller.findMany({
    include: { ciudades: { include: { ciudad: true, _count: { select: { puntosAtencion: true } } } } },
    orderBy: { nombre: 'asc' },
  });

  // Taller no tiene relación directa a Siniestro (pasa por TallerCiudad),
  // así que el conteo se calcula aparte para cada taller.
  const items = await Promise.all(
    talleres.map(async (t) => {
      const totalSiniestros = await prisma.siniestro.count({
        where: { tallerCiudad: { tallerId: t.id } },
      });
      return { ...t, _count: { siniestros: totalSiniestros } };
    })
  );

  res.json(items);
});

router.post('/talleres', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schemaNombre.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const item = await prisma.taller.create({ data: { nombre: parsed.data.nombre.trim() } });
  res.status(201).json(item);
});

router.put('/talleres/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = schemaNombre.partial().extend({ activo: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const item = await prisma.taller.update({ where: { id: Number(req.params.id) }, data: parsed.data });
  res.json(item);
});

router.delete('/talleres/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.siniestro.count({ where: { tallerCiudad: { tallerId: Number(req.params.id) } } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) asociado(s) a este taller` });
  }
  await prisma.taller.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

// ---- Ciudades donde atiende un Taller (para el combo en cascada) ----

// GET /talleres/:id/ciudades -> lista las ciudades ya asignadas a ese taller
router.get('/talleres/:id/ciudades', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const items = await prisma.tallerCiudad.findMany({
    where: { tallerId: Number(req.params.id) },
    include: { ciudad: true, _count: { select: { puntosAtencion: true } } },
    orderBy: { ciudad: { nombre: 'asc' } },
  });
  res.json(items);
});

const schemaTallerCiudad = z.object({ ciudadId: z.number() });

// POST /talleres/:id/ciudades -> asigna una ciudad nueva a este taller
router.post('/talleres/:id/ciudades', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schemaTallerCiudad.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  try {
    const item = await prisma.tallerCiudad.create({
      data: { tallerId: Number(req.params.id), ciudadId: parsed.data.ciudadId },
      include: { ciudad: true },
    });
    res.status(201).json(item);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este taller ya está asignado a esa ciudad' });
    }
    throw err;
  }
});

// DELETE /taller-ciudades/:id -> quita una ciudad de un taller
router.delete('/taller-ciudades/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const id = Number(req.params.id);
  const enUso = await prisma.siniestro.count({ where: { tallerCiudadId: id } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) asociado(s) a esta ciudad del taller` });
  }
  const puntosEnUso = await prisma.puntoAtencionTaller.count({ where: { tallerCiudadId: id } });
  if (puntosEnUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${puntosEnUso} punto(s) de atención definidos en esta ciudad` });
  }
  await prisma.tallerCiudad.delete({ where: { id } });
  res.status(204).send();
});

// ============================================================
// 3. PUNTO DE ATENCIÓN TALLER (depende de una TallerCiudad)
// ============================================================

// GET /taller-ciudades/:id/puntos-atencion -> combo en cascada, 3er nivel
router.get('/taller-ciudades/:id/puntos-atencion', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const items = await prisma.puntoAtencionTaller.findMany({
    where: { tallerCiudadId: Number(req.params.id) },
    orderBy: { nombre: 'asc' },
  });
  res.json(items);
});

router.post('/taller-ciudades/:id/puntos-atencion', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schemaNombre.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  try {
    const item = await prisma.puntoAtencionTaller.create({
      data: { tallerCiudadId: Number(req.params.id), nombre: parsed.data.nombre.trim() },
    });
    res.status(201).json(item);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un punto de atención con ese nombre en esta ciudad del taller' });
    }
    throw err;
  }
});

router.put('/puntos-atencion-taller/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = schemaNombre.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const data = parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre.trim() } : {};
  const item = await prisma.puntoAtencionTaller.update({ where: { id: Number(req.params.id) }, data });
  res.json(item);
});

router.delete('/puntos-atencion-taller/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.siniestro.count({ where: { puntoAtencionTallerId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) asociado(s) a este punto de atención` });
  }
  await prisma.puntoAtencionTaller.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

// ============================================================
// 4. ESTATUS DE SINIESTRO (depende de un TipoSiniestro, con orden)
// ============================================================

// GET /estatus-siniestro?tipoSiniestroId=X -> filtrado, lo usa Seguimiento.tsx
router.get('/estatus-siniestro', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const { tipoSiniestroId } = req.query;
  const items = await prisma.estatusSiniestro.findMany({
    where: {
      activo: true,
      tipoSiniestroId: tipoSiniestroId ? Number(tipoSiniestroId) : undefined,
    },
    include: { _count: { select: { siniestros: true } } },
    orderBy: { orden: 'asc' },
  });
  res.json(items);
});

const schemaEstatusSiniestro = schemaNombre.extend({
  tipoSiniestroId: z.number(),
  orden: z.number().optional(),
});

router.post('/estatus-siniestro', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schemaEstatusSiniestro.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  try {
    const item = await prisma.estatusSiniestro.create({
      data: {
        nombre: parsed.data.nombre.trim(),
        tipoSiniestroId: parsed.data.tipoSiniestroId,
        orden: parsed.data.orden ?? 0,
      },
    });
    res.status(201).json(item);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un estatus con ese nombre para este tipo de siniestro' });
    }
    throw err;
  }
});

router.put('/estatus-siniestro/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = schemaEstatusSiniestro.partial().extend({ activo: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  const { nombre, ...resto } = parsed.data;
  const item = await prisma.estatusSiniestro.update({
    where: { id: Number(req.params.id) },
    data: { ...resto, nombre: nombre !== undefined ? nombre.trim() : undefined },
  });
  res.json(item);
});

router.delete('/estatus-siniestro/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.siniestro.count({ where: { estatusSiniestroId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) con este estatus` });
  }
  await prisma.estatusSiniestro.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;