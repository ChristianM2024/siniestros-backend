import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

router.get('/', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const aseguradoras = await prisma.aseguradora.findMany({
    include: { _count: { select: { vehiculos: true } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(aseguradoras);
});

const aseguradoraSchema = z.object({
  nombre: z.string().min(1),
});

router.post('/', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = aseguradoraSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const aseguradora = await prisma.aseguradora.create({ data: parsed.data });
  res.status(201).json(aseguradora);
});

router.put('/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = aseguradoraSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const aseguradora = await prisma.aseguradora.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(aseguradora);
});

router.delete('/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.vehiculo.count({ where: { aseguradoraId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} vehiculo(s) asociado(s) a esta aseguradora` });
  }
  await prisma.aseguradora.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;