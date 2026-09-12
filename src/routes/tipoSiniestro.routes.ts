import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  estado: z.boolean().optional(),
});

router.get('/', requierePermiso('mantenimiento', 'ver'), async (_req, res) => {
  const items = await prisma.tipoSiniestro.findMany({
    include: { _count: { select: { siniestros: true } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(items);
});

router.post('/', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  try {
    const item = await prisma.tipoSiniestro.create({
      data: {
        codigo: parsed.data.codigo.trim().toUpperCase(),
        nombre: parsed.data.nombre.trim(),
        estado: parsed.data.estado ?? true,
      },
    });
    res.status(201).json(item);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un tipo de siniestro con ese código' });
    }
    throw err;
  }
});

router.put('/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const data: any = {};
  if (parsed.data.codigo !== undefined) data.codigo = parsed.data.codigo.trim().toUpperCase();
  if (parsed.data.nombre !== undefined) data.nombre = parsed.data.nombre.trim();
  if (parsed.data.estado !== undefined) data.estado = parsed.data.estado;

  try {
    const item = await prisma.tipoSiniestro.update({ where: { id: Number(req.params.id) }, data });
    res.json(item);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un tipo de siniestro con ese código' });
    }
    throw err;
  }
});

router.delete('/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.siniestro.count({ where: { tipoSiniestroId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} siniestro(s) con este tipo` });
  }
  await prisma.tipoSiniestro.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;