import 'dotenv/config';
import 'express-async-errors'; // <-- NUEVO: sin esto, un error async en una ruta no llega al manejador de errores
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth.routes';
import siniestrosRoutes from './routes/siniestros.routes';
import vehiculosRoutes from './routes/vehiculos.routes';
import dashboardRoutes from './routes/dashboard.routes';
import usuariosRoutes from './routes/usuarios.routes';
import ciudadesRoutes from './routes/ciudades.routes';
import auditoriaRoutes from './routes/auditoria.routes'; // <-- NUEVO

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
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/ciudades', ciudadesRoutes);
app.use('/api/auditoria', auditoriaRoutes); // <-- NUEVO

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Manejador de errores mejorado: distingue codigo de estado y deja rastro claro en logs
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err); // <-- mejorado: antes solo "console.error(err)"
  const status = err.status || err.statusCode || 500; // <-- NUEVO
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message || 'Error',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Siniestros escuchando en http://localhost:${PORT}`);
});