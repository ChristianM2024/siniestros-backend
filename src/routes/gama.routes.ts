import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

router.get('/', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const gamas = await prisma.gama.findMany({
    include: { clase: true, _count: { select: { vehiculos: true } } },
    orderBy: [{ clase: { nombre: 'asc' } }, { nombre: 'asc' }],
  });
  res.json(gamas);
});

const gamaSchema = z.object({
  nombre: z.string().min(1),
  claseId: z.coerce.number().int(),
});

router.post('/', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = gamaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const gama = await prisma.gama.create({
    data: { nombre: parsed.data.nombre.trim(), claseId: parsed.data.claseId },
  });
  res.status(201).json(gama);
});

router.put('/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = gamaSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const data = { ...parsed.data, nombre: parsed.data.nombre?.trim() };
  const gama = await prisma.gama.update({ where: { id: Number(req.params.id) }, data });
  res.json(gama);
});

router.delete('/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.vehiculo.count({ where: { gamaId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} vehiculo(s) asociado(s) a esta gama` });
  }
  await prisma.gama.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
