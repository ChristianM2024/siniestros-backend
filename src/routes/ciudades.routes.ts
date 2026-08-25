import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/ciudades -> catalogo de ciudades (para selects en Reportar Siniestro, Vehiculos, etc.)
// No requiere permiso especifico de pantalla: es un catalogo de solo lectura que
// cualquier usuario autenticado necesita para llenar formularios.
router.get('/', async (_req, res) => {
  const ciudades = await prisma.ciudad.findMany({
    orderBy: { nombre: 'asc' },
  });
  res.json(ciudades);
});

export default router;