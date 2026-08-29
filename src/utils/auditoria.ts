import { Request } from 'express';
import { prisma } from '../config/prisma';

interface RegistrarAuditoriaOpts {
  req: Request;
  accion: string;
  entidad?: string;
  entidadId?: string | number;
  detalle?: Record<string, unknown>;
}

// Nunca debe tumbar la request principal: si falla el log, solo lo reportamos por consola.
export async function registrarAuditoria(opts: RegistrarAuditoriaOpts) {
  const { req, accion, entidad, entidadId, detalle } = opts;
  try {
    await prisma.auditLog.create({
      data: {
        usuarioId: req.user?.id,
        usuarioEmail: req.user?.email,
        accion,
        entidad,
        entidadId: entidadId !== undefined ? String(entidadId) : undefined,
        detalle: detalle as any,
        ip: req.ip,
      },
    });
  } catch (err) {
    console.error('[auditoria] no se pudo registrar el log:', err);
  }
}