import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';

// Los 8 catálogos "simples": solo tienen `nombre` y una relación a Vehiculo[].
// Gama queda afuera porque además depende de Clase (ver routes/gama.ts).
export type ModeloCatalogoSimple =
  | 'administrador'
  | 'gerenteCuenta'
  | 'tipoActivo'
  | 'tipoCombustible'
  | 'clase'
  | 'proveedorCompra'
  | 'tipoOperacion'
  | 'nivelBlindaje';

// Nombre del campo FK en Vehiculo, para poder validar "en uso" antes de borrar.
const campoEnVehiculo: Record<ModeloCatalogoSimple, string> = {
  administrador: 'administradorId',
  gerenteCuenta: 'gerenteCuentaId',
  tipoActivo: 'tipoActivoId',
  tipoCombustible: 'tipoCombustibleId',
  clase: 'claseId',
  proveedorCompra: 'proveedorCompraId',
  tipoOperacion: 'tipoOperacionId',
  nivelBlindaje: 'nivelBlindajeId',
};

const schema = z.object({ nombre: z.string().min(1) });

/**
 * Crea un router CRUD completo para un catálogo simple (id + nombre),
 * siguiendo exactamente el mismo patrón que aseguradoras.ts.
 *
 * @param modelo   nombre del modelo en prisma.<modelo> (camelCase)
 * @param etiqueta texto legible usado en el mensaje de error al borrar
 */
export function crearRouterCatalogoSimple(modelo: ModeloCatalogoSimple, etiqueta: string) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requierePermiso('mantenimiento', 'ver'), async (req, res) => {
    const items = await (prisma[modelo] as any).findMany({
      include: { _count: { select: { vehiculos: true } } },
      orderBy: { nombre: 'asc' },
    });
    res.json(items);
  });

  router.post('/', requierePermiso('mantenimiento', 'crear'), async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
    }
    const item = await (prisma[modelo] as any).create({
      data: { nombre: parsed.data.nombre.trim() },
    });
    res.status(201).json(item);
  });

  router.put('/:id', requierePermiso('mantenimiento', 'editar'), async (req, res) => {
    const parsed = schema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
    }
    const data = parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre.trim() } : {};
    const item = await (prisma[modelo] as any).update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
  });

  router.delete('/:id', requierePermiso('mantenimiento', 'eliminar'), async (req, res) => {
    const campo = campoEnVehiculo[modelo];
    const enUso = await prisma.vehiculo.count({ where: { [campo]: Number(req.params.id) } as any });
    if (enUso > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: hay ${enUso} vehiculo(s) asociado(s) a ${etiqueta}`,
      });
    }
    // Nota: si el modelo es "clase", también hay que revisar que no tenga
    // Gamas asociadas (la relación Gama -> Clase es onDelete: Restrict,
    // así que Prisma rechazará el delete solo; este mensaje es más claro).
    if (modelo === 'clase') {
      const gamasEnUso = await prisma.gama.count({ where: { claseId: Number(req.params.id) } });
      if (gamasEnUso > 0) {
        return res.status(409).json({
          error: `No se puede eliminar: hay ${gamasEnUso} gama(s) definidas dentro de esta clase`,
        });
      }
    }
    await (prisma[modelo] as any).delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  });

  return router;
}
