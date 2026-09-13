import 'dotenv/config';
import 'express-async-errors'; // <-- sin esto, un error async en una ruta no llega al manejador de errores
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth.routes';
import siniestrosRoutes from './routes/siniestros.routes';
import siniestrosPublicoRoutes from './routes/siniestrosPublico.routes'; // sin auth

import vehiculosRoutes from './routes/vehiculos.routes';
import dashboardRoutes from './routes/dashboard.routes';
import usuariosRoutes from './routes/usuarios.routes';
import ciudadesRoutes from './routes/ciudades.routes';
import auditoriaRoutes from './routes/auditoria.routes';
import clientesRouter from './routes/clientes.routes';
import aseguradorasRouter from './routes/aseguradoras.routes';
import tipoSiniestroRouter from './routes/tipoSiniestro.routes';
import catalogosSiniestroRoutes from './routes/catalogosSiniestro.routes';

// NUEVO: catálogos de Vehículo/Contrato
import {
  administradoresRouter,
  gerentesCuentaRouter,
  tiposActivoRouter,
  tiposCombustibleRouter,
  clasesRouter,
  proveedoresCompraRouter,
  tiposOperacionRouter,
  nivelesBlindajeRouter,
  transmisionesRouter, // <-- nuevo
} from './routes/catalogos.routes';
import gamaRouter from './routes/gama.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Sirve las fotos/PDF subidos (seccion 5 "Documentos Requeridos") como archivos estaticos.
// Ej: http://localhost:4000/uploads/siniestros/12/1723750000000.jpg
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API REST versionada -> facil de consumir desde otras aplicaciones
app.use('/api/auth', authRoutes);
app.use('/api/siniestros', siniestrosRoutes);
app.use('/api/publico/siniestros', siniestrosPublicoRoutes); // fuera de cualquier guard JWT
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/ciudades', ciudadesRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/clientes', clientesRouter);
app.use('/api/aseguradoras', aseguradorasRouter);

// NUEVO: catálogos de Vehículo/Contrato
app.use('/api/administradores', administradoresRouter);
app.use('/api/gerentes-cuenta', gerentesCuentaRouter);
app.use('/api/tipos-activo', tiposActivoRouter);
app.use('/api/tipos-combustible', tiposCombustibleRouter);
app.use('/api/clases', clasesRouter);
app.use('/api/gamas', gamaRouter);
app.use('/api/proveedores-compra', proveedoresCompraRouter);
app.use('/api/tipos-operacion', tiposOperacionRouter);
app.use('/api/niveles-blindaje', nivelesBlindajeRouter);
app.use('/api/transmisiones', transmisionesRouter); // <-- nuevo
app.use('/api/tipos-siniestro', tipoSiniestroRouter);
app.use('/api', catalogosSiniestroRoutes);   // <-- AGREGAR ESTA LÍNEA

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Manejador de errores mejorado: distingue codigo de estado y deja rastro claro en logs
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message || 'Error',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Siniestros escuchando en http://localhost:${PORT}`);
});