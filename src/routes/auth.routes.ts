import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { registrarAuditoria } from '../utils/auditoria'; // <-- NUEVO

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    include: { rol: true },
  });

  if (!usuario || !usuario.activo) {
    await registrarAuditoria({ req, accion: 'LOGIN_FALLIDO', detalle: { email, motivo: 'usuario_no_existe_o_inactivo' } }); // <-- NUEVO
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const passwordOk = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordOk) {
    await registrarAuditoria({ req, accion: 'LOGIN_FALLIDO', entidad: 'usuario', entidadId: usuario.id, detalle: { email } }); // <-- NUEVO
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const payload = {
    id: usuario.id,
    email: usuario.email,
    rolId: usuario.rolId,
    rolNombre: usuario.rol.nombre,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  } as jwt.SignOptions);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoLogin: new Date() },
  });

  await registrarAuditoria({ req: { ...req, user: payload } as any, accion: 'LOGIN_OK', entidad: 'usuario', entidadId: usuario.id }); // <-- NUEVO

  res.json({ token, usuario: payload });
});

// GET /api/auth/me  -> usuario actual + pantallas/permisos a las que tiene acceso
// El frontend usa esto para construir el menu dinamico segun el rol.
router.get('/me', requireAuth, async (req, res) => {
  const permisos = await prisma.rolPantalla.findMany({
    where: { rolId: req.user!.rolId, puedeVer: true },
    include: { pantalla: true },
    orderBy: { pantalla: { orden: 'asc' } },
  });

  res.json({
    usuario: req.user,
    pantallas: permisos.map((p: (typeof permisos)[number]) => ({
      codigo: p.pantalla.codigo,
      nombre: p.pantalla.nombre,
      ruta: p.pantalla.ruta,
      icono: p.pantalla.icono,
      puedeCrear: p.puedeCrear,
      puedeEditar: p.puedeEditar,
      puedeEliminar: p.puedeEliminar,
    })),
  });
});

export default router;