import { Request, Response, NextFunction } from 'express';
import { registrarAuditoria } from '../utils/auditoria';

const accionPorMetodo: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * Middleware factory: autoAuditar('usuario')
 * Se coloca en la ruta despues de que el handler responde (usa res.on('finish'))
 * y solo registra si la respuesta fue exitosa (2xx).
 */
export function autoAuditar(entidad: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const accion = accionPorMetodo[req.method];
    if (!accion) return next();

    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entidadId = req.params.id ?? res.locals.entidadId;
        registrarAuditoria({
          req,
          accion,
          entidad,
          entidadId,
          detalle: { metodo: req.method, ruta: req.originalUrl },
        });
      }
    });
    next();
  };
}