import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---------- Pantallas (una por cada hoja/vista del sistema original) ----------
  const pantallas = [
    { codigo: 'dashboard', nombre: 'Dashboard', ruta: '/', icono: 'LayoutDashboard', orden: 1 },
    { codigo: 'reportar_siniestro', nombre: 'Reportar Siniestro', ruta: '/siniestros/nuevo', icono: 'FilePlus', orden: 2 },
    { codigo: 'envio_formulario', nombre: 'Envío de Formulario', ruta: '/siniestros/envio-formulario', icono: 'Send', orden: 3 },
    { codigo: 'seguimiento', nombre: 'Seguimiento', ruta: '/siniestros/seguimiento', icono: 'Search', orden: 4 },
    { codigo: 'base_datos', nombre: 'Base de Datos', ruta: '/siniestros', icono: 'Database', orden: 5 },
    { codigo: 'vehiculos', nombre: 'Vehículos', ruta: '/vehiculos', icono: 'Car', orden: 6 },
    { codigo: 'mantenimiento', nombre: 'Mantenimiento', ruta: '/siniestros/mantenimiento', icono: 'Settings', orden: 7 },
    { codigo: 'usuarios', nombre: 'Usuarios y Roles', ruta: '/admin/usuarios', icono: 'Users', orden: 8 },
    { codigo: 'auditoria', nombre: 'Auditoría', ruta: '/admin/auditoria', icono: 'ScrollText', orden: 9 },
  ];

  const pantallaRecords: Record<string, number> = {};
  for (const p of pantallas) {
    const rec = await prisma.pantalla.upsert({
      where: { codigo: p.codigo },
      update: p,
      create: p,
    });
    pantallaRecords[p.codigo] = rec.id;
  }

  // ---------- Roles ----------
  const roles = [
    { nombre: 'Admin', descripcion: 'Acceso total al sistema' },
    { nombre: 'Supervisor', descripcion: 'Gestiona siniestros y vehiculos, no administra usuarios' },
    { nombre: 'Operador', descripcion: 'Reporta y da seguimiento a siniestros' },
    { nombre: 'Consulta', descripcion: 'Solo lectura de dashboard y base de datos' },
  ];

  const rolRecords: Record<string, number> = {};
  for (const r of roles) {
    const rec = await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: r,
      create: r,
    });
    rolRecords[r.nombre] = rec.id;
  }

  // ---------- Permisos por rol/pantalla ----------
  // Admin: todo (incluye "mantenimiento" automáticamente por estar en pantallaRecords)
  for (const codigo of Object.keys(pantallaRecords)) {
    await prisma.rolPantalla.upsert({
      where: { rolId_pantallaId: { rolId: rolRecords['Admin'], pantallaId: pantallaRecords[codigo] } },
      update: { puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true },
      create: {
        rolId: rolRecords['Admin'], pantallaId: pantallaRecords[codigo],
        puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: true,
      },
    });
  }

  // Supervisor: todo menos usuarios (incluye "mantenimiento" con ver+crear+editar automáticamente)
  for (const codigo of Object.keys(pantallaRecords).filter((c) => c !== 'usuarios')) {
    await prisma.rolPantalla.upsert({
      where: { rolId_pantallaId: { rolId: rolRecords['Supervisor'], pantallaId: pantallaRecords[codigo] } },
      update: { puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: codigo === 'vehiculos' },
      create: {
        rolId: rolRecords['Supervisor'], pantallaId: pantallaRecords[codigo],
        puedeVer: true, puedeCrear: true, puedeEditar: true, puedeEliminar: codigo === 'vehiculos',
      },
    });
  }

  // Operador: dashboard (ver), reportar (crear), envio_formulario (crear), seguimiento (editar), base_datos (ver)
  // "mantenimiento" NO está en esta lista a propósito -> Operador no tiene fila de permiso -> sin acceso
  const operadorPermisos: Record<string, { ver: boolean; crear: boolean; editar: boolean }> = {
    dashboard: { ver: true, crear: false, editar: false },
    reportar_siniestro: { ver: true, crear: true, editar: false },
    envio_formulario: { ver: true, crear: true, editar: false },
    seguimiento: { ver: true, crear: false, editar: true },
    base_datos: { ver: true, crear: false, editar: false },
  };
  for (const [codigo, perm] of Object.entries(operadorPermisos)) {
    await prisma.rolPantalla.upsert({
      where: { rolId_pantallaId: { rolId: rolRecords['Operador'], pantallaId: pantallaRecords[codigo] } },
      update: { puedeVer: perm.ver, puedeCrear: perm.crear, puedeEditar: perm.editar },
      create: {
        rolId: rolRecords['Operador'], pantallaId: pantallaRecords[codigo],
        puedeVer: perm.ver, puedeCrear: perm.crear, puedeEditar: perm.editar,
      },
    });
  }

  // Consulta: solo ver dashboard y base_datos ("mantenimiento" queda sin acceso)
  for (const codigo of ['dashboard', 'base_datos']) {
    await prisma.rolPantalla.upsert({
      where: { rolId_pantallaId: { rolId: rolRecords['Consulta'], pantallaId: pantallaRecords[codigo] } },
      update: { puedeVer: true },
      create: { rolId: rolRecords['Consulta'], pantallaId: pantallaRecords[codigo], puedeVer: true },
    });
  }

  // ---------- Usuario admin inicial ----------
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@renting.ec' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@renting.ec',
      passwordHash,
      rolId: rolRecords['Admin'],
    },
  });

  // ---------- Ciudades (de la hoja CIUDADES) ----------
  const ciudades = [
    'Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Durán', 'Manta',
    'Portoviejo', 'Loja', 'Ambato', 'Riobamba', 'Ibarra', 'Quevedo', 'Milagro',
    'Esmeraldas', 'Latacunga', 'Babahoyo', 'Tulcán', 'Nueva Loja', 'Puyo',
  ];
  for (const nombre of ciudades) {
    await prisma.ciudad.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  console.log('Seed completado. Usuario admin: admin@renting.ec / Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });