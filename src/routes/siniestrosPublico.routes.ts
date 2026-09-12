import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { Resend } from 'resend';
import {
  generarNumeroSiniestro,
  idTipoSiniestroPorCodigo,
  TIPOS_DOCUMENTO,
  UPLOAD_DIR,
} from './siniestros.routes';

// IMPORTANTE: este router NO lleva requireAuth ni requierePermiso.
// Móntalo en tu app.ts / index.ts como un router separado, independiente
// del router de /api/siniestros que sí exige JWT.

const router = Router();

// Igual que en siniestros.routes.ts: si no hay API key todavía, no tumbamos
// el servidor al arrancar — se omite el envío de correo con un warning.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DESTINATARIOS = [
  process.env.CORREO_BROKER!,
  process.env.CORREO_ASISTENTE!,
  process.env.CORREO_JEFE!,
].filter(Boolean);

// ---------- GET /api/publico/siniestros/:token ----------
// El cliente abre el link. Validamos el token y devolvemos solo lo
// necesario para prellenar el formulario (placa del vehiculo).
router.get('/:token', async (req, res) => {
  const solicitud = await prisma.solicitudFormulario.findUnique({
    where: { token: req.params.token },
    include: { vehiculo: true },
  });

  if (!solicitud) return res.status(404).json({ error: 'Link no valido' });
  if (solicitud.estado === 'COMPLETADO') {
    return res.status(410).json({ error: 'Este formulario ya fue enviado' });
  }
  if (solicitud.expiraEn < new Date()) {
    return res.status(410).json({ error: 'Este link ha expirado' });
  }

  res.json({
    placa: solicitud.vehiculo.placa,
    marca: solicitud.vehiculo.marca,
    modelo: solicitud.vehiculo.modelo,
  });
});

// ---------- POST /api/publico/siniestros/:token ----------
const formularioPublicoSchema = z.object({
  nombreConductor: z.string().min(1),
  cedulaConductor: z.string().min(1),
  telConductor: z.string().min(1),
  correoConductor: z.string().email(),
  fechaSiniestro: z.coerce.date(),
  lugarAccidente: z.string().min(1),
  danosVehiculo: z.string().optional(),
  danosTerceros: z.string().optional(),
  descripcion: z.string().min(10),
  tieneParteP: z.enum(['si', 'no']),
});

// multer temporal para el formulario publico: primero creamos el siniestro
// (para obtener su id numerico), luego movemos los archivos a su carpeta,
// igual que en el flujo interno.
const uploadTemp = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!permitidos.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten imagenes (jpg, png, webp) o PDF'));
    }
    cb(null, true);
  },
});

router.post(
  '/:token',
  uploadTemp.fields([
    { name: 'evidencias', maxCount: 5 },
    { name: 'fotosLicenciaMatricula', maxCount: 2 },
    { name: 'partePolicial', maxCount: 1 },
  ]),
  async (req, res) => {
    const solicitud = await prisma.solicitudFormulario.findUnique({
      where: { token: req.params.token },
      include: { vehiculo: true },
    });

    if (!solicitud) return res.status(404).json({ error: 'Link no valido' });
    if (solicitud.estado === 'COMPLETADO') {
      return res.status(410).json({ error: 'Este formulario ya fue enviado' });
    }
    if (solicitud.expiraEn < new Date()) {
      return res.status(410).json({ error: 'Este link ha expirado' });
    }

    const parsed = formularioPublicoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.tieneParteP === 'si') {
      const files = req.files as Record<string, Express.Multer.File[]>;
      if (!files.partePolicial || files.partePolicial.length === 0) {
        return res.status(400).json({ error: 'Debe adjuntar el parte policial o denuncia' });
      }
    }

    const noSiniestro = await generarNumeroSiniestro();

    const siniestro = await prisma.siniestro.create({
      data: {
        noSiniestro,
        vehiculoId: solicitud.vehiculoId,
        fechaSiniestro: data.fechaSiniestro,
        conductor: data.nombreConductor,
        cedulaConductor: data.cedulaConductor,
        telConductor: data.telConductor,
        correoConductor: data.correoConductor,
        lugarAccidente: data.lugarAccidente,
        descripcion: data.descripcion,
        danosVehiculo: data.danosVehiculo,
        danosTerceros: data.danosTerceros,
        origen: 'PUBLICO',
        // Código '009' = "Por Ingresar" en el catálogo de Tipos de Siniestro.
        // Sin esto, los siniestros creados desde el formulario público quedan con tipoSiniestroId = NULL.
        tipoSiniestroId: await idTipoSiniestroPorCodigo('009'),
        historialEstados: {
          create: { estadoNuevo: 'Reportado', nota: 'Reportado por el cliente vía formulario público' },
        },
      },
      include: { vehiculo: true },
    });

    // Mover archivos de memoria a disco, en la carpeta del siniestro recien creado
    const files = req.files as Record<string, Express.Multer.File[]>;
    const carpeta = path.join(UPLOAD_DIR, String(siniestro.id));
    fs.mkdirSync(carpeta, { recursive: true });

    const guardarArchivos = (lista: Express.Multer.File[] | undefined, tipo: (typeof TIPOS_DOCUMENTO)[number]) => {
      if (!lista) return [] as Promise<any>[];
      return lista.map(file => {
        const nombre = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
        fs.writeFileSync(path.join(carpeta, nombre), file.buffer);
        const urlRelativa = `/uploads/siniestros/${siniestro.id}/${nombre}`;
        return prisma.siniestroDocumento.create({ data: { siniestroId: siniestro.id, tipo, url: urlRelativa } });
      });
    };

    await Promise.all([
      ...guardarArchivos(files.evidencias, 'foto_siniestro'),
      ...guardarArchivos(files.fotosLicenciaMatricula, 'foto_licencia'),
      ...guardarArchivos(files.partePolicial, 'acta_policial'),
    ]);

    await prisma.solicitudFormulario.update({
      where: { id: solicitud.id },
      data: { estado: 'COMPLETADO', siniestroId: siniestro.id },
    });

    try {
      if (!resend) {
        console.warn('RESEND_API_KEY no configurado — se omite la notificación por correo del siniestro público');
      } else if (DESTINATARIOS.length > 0) {
        await resend.emails.send({
          from: 'Siniestros Renting <notificaciones@tudominio.com>',
          to: DESTINATARIOS,
          subject: `Nuevo siniestro reportado por el cliente — ${noSiniestro} — Placa ${siniestro.vehiculo.placa}`,
          html: `
            <h2>Nuevo siniestro reportado (formulario público)</h2>
            <p><b>No. Siniestro:</b> ${noSiniestro}</p>
            <p><b>Placa:</b> ${siniestro.vehiculo.placa}</p>
            <p><b>Conductor:</b> ${data.nombreConductor} (${data.cedulaConductor})</p>
            <p><b>Contacto:</b> ${data.telConductor} — ${data.correoConductor}</p>
            <p><b>Fecha/hora:</b> ${data.fechaSiniestro}</p>
            <p><b>Lugar:</b> ${data.lugarAccidente}</p>
            <p><b>Descripción:</b> ${data.descripcion}</p>
            <p><b>Parte policial adjunto:</b> ${data.tieneParteP === 'si' ? 'Sí' : 'No'}</p>
          `,
        });
      }
    } catch (err) {
      console.error('Error enviando notificacion de siniestro publico:', err);
      // el siniestro ya quedo guardado; el correo es best-effort
    }

    res.status(201).json({ ok: true, noSiniestro });
  }
);

export default router;