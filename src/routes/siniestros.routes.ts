import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';
import { calcularTiempos } from '../utils/tiempos';

const router = Router();
router.use(requireAuth);

// ---------- Helper: genera el siguiente numero de siniestro SIN-AAAA-NNN ----------
async function generarNumeroSiniestro(): Promise<string> {
  const anio = new Date().getFullYear();
  const prefijo = `SIN-${anio}-`;
  const ultimo = await prisma.siniestro.findFirst({
    where: { noSiniestro: { startsWith: prefijo } },
    orderBy: { noSiniestro: 'desc' },
  });
  const siguiente = ultimo ? parseInt(ultimo.noSiniestro.split('-')[2], 10) + 1 : 1;
  return `${prefijo}${String(siguiente).padStart(3, '0')}`;
}

// ---------- GET /api/siniestros  (hoja BASE DE DATOS) ----------
router.get('/', requierePermiso('base_datos', 'ver'), async (req, res) => {
  const { estado, ciudadId, placa } = req.query;

  const siniestros = await prisma.siniestro.findMany({
    where: {
      estado: estado ? (estado as any) : undefined,
      ciudadId: ciudadId ? Number(ciudadId) : undefined,
      vehiculo: placa ? { placa: { contains: String(placa), mode: 'insensitive' } } : undefined,
    },
    include: { vehiculo: true, ciudad: true, creadoPor: { select: { nombre: true } } },
    orderBy: { fechaSiniestro: 'desc' },
  });

  const conTiempos = siniestros.map((s: (typeof siniestros)[number]) => ({ ...s, tiempos: calcularTiempos(s) }));
  res.json(conTiempos);
});

// ---------- GET /api/siniestros/:id ----------
router.get('/:id', requierePermiso('base_datos', 'ver'), async (req, res) => {
  const siniestro = await prisma.siniestro.findUnique({
    where: { id: Number(req.params.id) },
    include: { vehiculo: true, ciudad: true, documentos: true, historialEstados: true },
  });
  if (!siniestro) return res.status(404).json({ error: 'Siniestro no encontrado' });
  res.json({ ...siniestro, tiempos: calcularTiempos(siniestro) });
});

// ---------- POST /api/siniestros  (hoja REPORTAR SINIESTRO) ----------
const reportarSchema = z.object({
  placa: z.string().min(1),
  fechaSiniestro: z.coerce.date(),
  conductor: z.string().min(1),
  cedulaConductor: z.string().optional(),
  telConductor: z.string().optional(),
  licenciaConductor: z.string().optional(),
  categoriaLicencia: z.string().optional(),
  vencimientoLicencia: z.coerce.date().optional(),
  lugarAccidente: z.string().min(1),
  ciudadId: z.number().optional(),
  descripcion: z.string().optional(),
  danosVehiculo: z.string().optional(),
  danosTerceros: z.string().optional(),
  intervinoPolicia: z.boolean().optional(),
  heridos: z.boolean().optional(),
});

router.post('/', requierePermiso('reportar_siniestro', 'crear'), async (req, res) => {
  const parsed = reportarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const data = parsed.data;

  const vehiculo = await prisma.vehiculo.findUnique({ where: { placa: data.placa } });
  if (!vehiculo) {
    return res.status(404).json({ error: `No existe un vehiculo registrado con placa ${data.placa}` });
  }

  const noSiniestro = await generarNumeroSiniestro();

  const siniestro = await prisma.siniestro.create({
    data: {
      noSiniestro,
      vehiculoId: vehiculo.id,
      fechaSiniestro: data.fechaSiniestro,
      conductor: data.conductor,
      cedulaConductor: data.cedulaConductor,
      telConductor: data.telConductor,
      licenciaConductor: data.licenciaConductor,
      categoriaLicencia: data.categoriaLicencia,
      vencimientoLicencia: data.vencimientoLicencia,
      lugarAccidente: data.lugarAccidente,
      ciudadId: data.ciudadId,
      descripcion: data.descripcion,
      danosVehiculo: data.danosVehiculo,
      danosTerceros: data.danosTerceros,
      intervinoPolicia: data.intervinoPolicia ?? false,
      heridos: data.heridos ?? false,
      creadoPorId: req.user!.id,
      historialEstados: {
        create: { estadoNuevo: 'Reportado', usuarioId: req.user!.id, nota: 'Siniestro creado' },
      },
    },
    include: { vehiculo: true },
  });

  res.status(201).json(siniestro);
});

// ---------- PATCH /api/siniestros/:id/seguimiento  (hoja SEGUIMIENTO) ----------
const seguimientoSchema = z.object({
  fechaNotifAseg: z.coerce.date().optional(),
  fechaIngresoTaller: z.coerce.date().optional(),
  fechaProforma: z.coerce.date().optional(),
  fechaAutorizacion: z.coerce.date().optional(),
  fechaEntrega: z.coerce.date().optional(),
  estado: z.enum(['Reportado', 'En_Peritaje', 'En_Reparacion', 'Entregado', 'Cerrado']).optional(),
  notas: z.string().optional(),
});

router.patch('/:id/seguimiento', requierePermiso('seguimiento', 'editar'), async (req, res) => {
  const parsed = seguimientoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }

  const id = Number(req.params.id);
  const existente = await prisma.siniestro.findUnique({ where: { id } });
  if (!existente) return res.status(404).json({ error: 'Siniestro no encontrado' });

  const actualizado = await prisma.siniestro.update({
    where: { id },
    data: {
      ...parsed.data,
      historialEstados: parsed.data.estado
        ? {
            create: {
              estadoAnterior: existente.estado,
              estadoNuevo: parsed.data.estado,
              usuarioId: req.user!.id,
              nota: parsed.data.notas,
            },
          }
        : undefined,
    },
    include: { vehiculo: true },
  });

  res.json({ ...actualizado, tiempos: calcularTiempos(actualizado) });
});

// ============================================================
// SECCION 5 DEL EXCEL: "DOCUMENTOS REQUERIDOS"
// Fotos y PDF asociados a un siniestro (foto siniestro, foto
// vehiculo, foto doc. conductor, foto licencia, croquis, acta policial)
// ============================================================

const TIPOS_DOCUMENTO = [
  'foto_siniestro',
  'foto_vehiculo',
  'foto_conductor',
  'foto_licencia',
  'croquis',
  'acta_policial',
] as const;

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'siniestros');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const carpeta = path.join(UPLOAD_DIR, req.params.id);
    fs.mkdirSync(carpeta, { recursive: true });
    cb(null, carpeta);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imagenes (jpg, png, webp) o PDF'));
    }
    cb(null, true);
  },
});

// GET /api/siniestros/:id/documentos -> lista los documentos de un siniestro
router.get('/:id/documentos', requierePermiso('reportar_siniestro', 'ver'), async (req, res) => {
  const documentos = await prisma.siniestroDocumento.findMany({
    where: { siniestroId: Number(req.params.id) },
    orderBy: { subidoEn: 'desc' },
  });
  res.json(documentos);
});

// POST /api/siniestros/:id/documentos -> sube un archivo
// body: multipart/form-data con campo "archivo" y campo "tipo" (uno de TIPOS_DOCUMENTO)
router.post(
  '/:id/documentos',
  requierePermiso('reportar_siniestro', 'crear'),
  upload.single('archivo'),
  async (req, res) => {
    const siniestroId = Number(req.params.id);
    const { tipo } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibio ningun archivo' });
    }
    if (!TIPOS_DOCUMENTO.includes(tipo)) {
      return res.status(400).json({ error: `Tipo de documento invalido. Use uno de: ${TIPOS_DOCUMENTO.join(', ')}` });
    }

    const siniestro = await prisma.siniestro.findUnique({ where: { id: siniestroId } });
    if (!siniestro) {
      return res.status(404).json({ error: 'Siniestro no encontrado' });
    }

    // Ruta publica del archivo (servida como estatica desde index.ts: /uploads)
    const urlRelativa = `/uploads/siniestros/${siniestroId}/${req.file.filename}`;

    const documento = await prisma.siniestroDocumento.create({
      data: { siniestroId, tipo, url: urlRelativa },
    });

    res.status(201).json(documento);
  }
);

// DELETE /api/siniestros/:id/documentos/:docId -> elimina un documento (registro + archivo fisico)
router.delete(
  '/:id/documentos/:docId',
  requierePermiso('reportar_siniestro', 'eliminar'),
  async (req, res) => {
    const documento = await prisma.siniestroDocumento.findUnique({
      where: { id: Number(req.params.docId) },
    });
    if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

    const rutaFisica = path.join(__dirname, '..', '..', documento.url.replace(/^\/uploads/, 'uploads'));
    fs.existsSync(rutaFisica) && fs.unlinkSync(rutaFisica);

    await prisma.siniestroDocumento.delete({ where: { id: documento.id } });
    res.status(204).send();
  }
);

export default router;
