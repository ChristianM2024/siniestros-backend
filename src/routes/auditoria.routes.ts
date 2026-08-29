import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// Por ahora restringido a Admin (agrega una pantalla "auditoria" en el seed
// si luego quieres controlarlo con permisos finos como el resto del sistema).
router.get('/', async (req, res) => {
  if (req.user?.rolNombre !== 'Admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { usuarioId, desde, hasta, entidad } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: {
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      entidad: entidad ? String(entidad) : undefined,
      creadoEn: {
        gte: desde ? new Date(String(desde)) : undefined,
        lte: hasta ? new Date(String(hasta)) : undefined,
      },
    },
    orderBy: { creadoEn: 'desc' },
    take: 200,
  });
  res.json(logs);
});

export default router;