import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Resend } from 'resend';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middleware/auth';
import { requierePermiso } from '../middleware/permisos';
import { calcularTiempos } from '../utils/tiempos';

const router = Router();
router.use(requireAuth);

// Si RESEND_API_KEY no está configurada (ej. todavía no creaste la cuenta),
// no tumbamos el servidor: dejamos resend en null y se omite el envío de correo
// con un warning, en vez de un throw al arrancar.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ---------- Helper: genera el siguiente numero de siniestro SIN-NNN ----------
// EXPORTADO: lo reutiliza siniestrosPublico.routes.ts al crear un siniestro desde el formulario público
// Nota: antes el formato incluía el año (SIN-AAAA-NNN). Los 2 registros existentes
// con ese formato se renombraron a SIN-NNN con el script de migración aparte.
export async function generarNumeroSiniestro(): Promise<string> {
  const prefijo = 'SIN-';
  const ultimo = await prisma.siniestro.findFirst({
    where: { noSiniestro: { startsWith: prefijo } },
    orderBy: { noSiniestro: 'desc' },
  });
  const siguiente = ultimo ? parseInt(ultimo.noSiniestro.split('-')[1], 10) + 1 : 1;
  return `${prefijo}${String(siguiente).padStart(3, '0')}`;
}

// EXPORTADO: siniestrosPublico.routes.ts reusa este mismo helper para
// resolver el tipo "Por Ingresar" (código '009') al crear desde el formulario público
export async function idTipoSiniestroPorCodigo(codigo: string): Promise<number | undefined> {
  const tipo = await prisma.tipoSiniestro.findUnique({ where: { codigo } });
  return tipo?.id;
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
    include: { vehiculo: true, ciudad: true, creadoPor: { select: { nombre: true } }, tipoSiniestro: true },
    orderBy: { fechaSiniestro: 'desc' }, 
  });

  const conTiempos = siniestros.map((s: (typeof siniestros)[number]) => ({ ...s, tiempos: calcularTiempos(s) }));
  res.json(conTiempos);
});

// ---------- GET /api/siniestros/:id ----------
router.get('/:id', requierePermiso('base_datos', 'ver'), async (req, res) => {
  const siniestro = await prisma.siniestro.findUnique({
    where: { id: Number(req.params.id) },
    include: { vehiculo: true, ciudad: true, documentos: true, historialEstados: true, tipoSiniestro: true },
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
      origen: 'INTERNO',
      // Antes: idTipoSiniestroPorCodigo('SIMPLE') — el código real en la BD es '001', no 'SIMPLE'.
      // Con el código anterior esto siempre devolvía undefined y el siniestro quedaba con tipoSiniestroId = NULL.
      tipoSiniestroId: await idTipoSiniestroPorCodigo('001'),
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
  // Permite reasignar el tipo de siniestro desde el panel de Seguimiento
  tipoSiniestroId: z.coerce.number().optional(),
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
    include: { vehiculo: true, tipoSiniestro: true },
  });

  res.json({ ...actualizado, tiempos: calcularTiempos(actualizado) });
});

// ============================================================
// NUEVO: pestaña "Envío de Formulario" — el staff busca la placa
// y dispara el link público al cliente por correo y/o WhatsApp
// ============================================================

const enviarFormularioSchema = z.object({
  vehiculoId: z.number(),
  correoCliente: z.string().email().optional(),
  telefonoCliente: z.string().optional(),
  canal: z.enum(['CORREO', 'WHATSAPP', 'AMBOS']),
});

router.post('/solicitudes-formulario', requierePermiso('reportar_siniestro', 'crear'), async (req, res) => {
  const parsed = enviarFormularioSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
  }
  const { vehiculoId, correoCliente, telefonoCliente, canal } = parsed.data;

  if ((canal === 'CORREO' || canal === 'AMBOS') && !correoCliente) {
    return res.status(400).json({ error: 'Se requiere correoCliente para el canal seleccionado' });
  }
  if ((canal === 'WHATSAPP' || canal === 'AMBOS') && !telefonoCliente) {
    return res.status(400).json({ error: 'Se requiere telefonoCliente para el canal seleccionado' });
  }

  const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId } });
  if (!vehiculo) return res.status(404).json({ error: 'Vehiculo no encontrado' });

  const solicitud = await prisma.solicitudFormulario.create({
    data: {
      vehiculoId,
      enviadoPorId: req.user!.id,
      correoCliente,
      telefonoCliente,
      canal,
      expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    },
  });

  const link = `${process.env.FRONTEND_URL}/reportar-siniestro/${solicitud.token}`;
  let correoEnviado = false;

  try {
    if ((canal === 'CORREO' || canal === 'AMBOS') && correoCliente) {
      if (!resend) {
        console.warn('RESEND_API_KEY no configurado — se omite el envío de correo de la solicitud de formulario');
      } else {
        await resend.emails.send({
          from: 'Siniestros Renting <notificaciones@tudominio.com>',
          to: correoCliente,
          subject: `Reporte de siniestro — Vehiculo ${vehiculo.placa}`,
          html: `<p>Por favor completa el siguiente formulario con los detalles del siniestro:</p>
                 <p><a href="${link}">${link}</a></p>
                 <p>Este link expira en 7 dias.</p>`,
        });
        correoEnviado = true;
      }
    }
  } catch (err) {
    console.error('Error enviando correo de solicitud de formulario:', err);
    // no se aborta la solicitud por esto: el registro y el link ya existen,
    // el staff puede reenviar o pasar el link manualmente
  }

  let whatsappUrl: string | null = null;
  if ((canal === 'WHATSAPP' || canal === 'AMBOS') && telefonoCliente) {
    const telLimpio = telefonoCliente.replace(/\D/g, '');
    const mensaje = encodeURIComponent(`Hola, por favor completa el reporte de tu siniestro aqui: ${link}`);
    whatsappUrl = `https://wa.me/${telLimpio}?text=${mensaje}`;
  }

  res.status(201).json({ ok: true, token: solicitud.token, correoEnviado, whatsappUrl });
});

// ============================================================
// SECCION 5 DEL EXCEL: "DOCUMENTOS REQUERIDOS"
// Fotos y PDF asociados a un siniestro (foto siniestro, foto
// vehiculo, foto doc. conductor, foto licencia, croquis, acta policial)
// ============================================================

// EXPORTADO: siniestrosPublico.routes.ts reusa esta misma lista de tipos
export const TIPOS_DOCUMENTO = [
  'foto_siniestro',
  'foto_vehiculo',
  'foto_conductor',
  'foto_licencia',
  'foto_matricula',
  'croquis',
  'acta_policial',
] as const;

// EXPORTADO
export const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'siniestros');

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