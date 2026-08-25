import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

type Accion = 'ver' | 'crear' | 'editar' | 'eliminar';

const columnaPorAccion: Record<Accion, 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeEliminar'> = {
  ver: 'puedeVer',
  crear: 'puedeCrear',
  editar: 'puedeEditar',
  eliminar: 'puedeEliminar',
};

/**
 * Middleware factory: requierePermiso('reportar_siniestro', 'crear')
 * Verifica en la tabla rol_pantalla si el rol del usuario autenticado
 * tiene la accion solicitada habilitada para esa pantalla/codigo.
 * Debe usarse DESPUES de requireAuth.
 */
export function requierePermiso(codigoPantalla: string, accion: Accion = 'ver') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    const permiso = await prisma.rolPantalla.findFirst({
      where: {
        rolId: req.user.rolId,
        pantalla: { codigo: codigoPantalla },
      },
    });

    const columna = columnaPorAccion[accion];
    if (!permiso || !permiso[columna]) {
      return res.status(403).json({
        error: `No tiene permiso de "${accion}" en la pantalla "${codigoPantalla}"`,
      });
    }

    next();
  };
}
