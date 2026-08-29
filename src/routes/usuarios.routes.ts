import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';
import { autoAuditar } from '../middleware/auditoria';

const router = Router();
router.use(requireAuth);
router.use(autoAuditar('usuario')); // en siniestros.routes.ts: 'siniestro' | en vehiculos.routes.ts: 'vehiculo'


router.get('/', requierePermiso('usuarios', 'ver'), async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, activo: true, ultimoLogin: true, rol: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
});

router.get('/roles', requierePermiso('usuarios', 'ver'), async (_req, res) => {
  const roles = await prisma.rol.findMany({
    include: { permisos: { include: { pantalla: true } } },
  });
  res.json(roles);
});

const crearUsuarioSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  rolId: z.number(),
});

router.post('/', requierePermiso('usuarios', 'crear'), async (req, res) => {
  const parsed = crearUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const { nombre, email, password, rolId } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, passwordHash, rolId },
    select: { id: true, nombre: true, email: true, rolId: true },
  });
  res.status(201).json(usuario);
});

const actualizarPermisoSchema = z.object({
  puedeVer: z.boolean().optional(),
  puedeCrear: z.boolean().optional(),
  puedeEditar: z.boolean().optional(),
  puedeEliminar: z.boolean().optional(),
});

// PATCH /api/usuarios/roles/:rolId/pantallas/:pantallaId
// Permite reconfigurar en caliente que puede ver/hacer cada rol (esto es lo que
// pediste: "roles para asignar a los usuarios que pantalla pueden ver").
router.patch(
  '/roles/:rolId/pantallas/:pantallaId',
  requierePermiso('usuarios', 'editar'),
  async (req, res) => {
    const parsed = actualizarPermisoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
    }
    const rolId = Number(req.params.rolId);
    const pantallaId = Number(req.params.pantallaId);

    const permiso = await prisma.rolPantalla.upsert({
      where: { rolId_pantallaId: { rolId, pantallaId } },
      update: parsed.data,
      create: { rolId, pantallaId, ...parsed.data },
    });
    res.json(permiso);
  }
);

export default router;
