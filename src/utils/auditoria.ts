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

// ============================================================
// AGREGAR a src/utils/auditoria.ts (no reemplaza nada, solo se suma
// a lo que ya tienes ahí junto a registrarAuditoria).
// ============================================================

export type CampoCambiado = { campo: string; antes: unknown; despues: unknown };

/**
 * Compara el registro "antes" (tal cual viene de la BD) contra el `payload`
 * que se va a aplicar, y devuelve solo los campos que realmente cambiaron.
 * Solo revisa las claves presentes en `payload` (no todo el registro),
 * e ignora las claves con valor `undefined` (campos que no se enviaron).
 */
export function calcularDiff(
  antes: Record<string, any>,
  payload: Record<string, any>,
): CampoCambiado[] {
  const cambios: CampoCambiado[] = [];
  for (const campo of Object.keys(payload)) {
    if (payload[campo] === undefined) continue;

    const valorAntes = antes?.[campo] ?? null;
    const valorDespues = payload[campo] ?? null;

    // Normaliza fechas a ISO string para que la comparación Date vs string no de falso positivo
    const na = valorAntes instanceof Date ? valorAntes.toISOString() : valorAntes;
    const nd = valorDespues instanceof Date ? valorDespues.toISOString() : valorDespues;

    if (JSON.stringify(na) !== JSON.stringify(nd)) {
      cambios.push({ campo, antes: valorAntes, despues: valorDespues });
    }
  }
  return cambios;
}
