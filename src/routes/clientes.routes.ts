import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

const router = Router();
router.use(requireAuth);

router.get('/', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
  const clientes = await prisma.cliente.findMany({
    include: { _count: { select: { vehiculos: true } } },
    orderBy: { nombre: 'asc' },
  });
  res.json(clientes);
});

const clienteSchema = z.object({
  nombre: z.string().min(1),
  celular: z.string().optional(),
  correo: z.string().email().optional().or(z.literal('')),
  activo: z.boolean().optional(),
});

router.post('/', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
  const parsed = clienteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const cliente = await prisma.cliente.create({ data: parsed.data });
  res.status(201).json(cliente);
});

router.put('/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
  const parsed = clienteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const cliente = await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(cliente);
});

router.delete('/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
  const enUso = await prisma.vehiculo.count({ where: { clienteId: Number(req.params.id) } });
  if (enUso > 0) {
    return res.status(409).json({ error: `No se puede eliminar: hay ${enUso} vehiculo(s) asociado(s) a este cliente` });
  }
  await prisma.cliente.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;