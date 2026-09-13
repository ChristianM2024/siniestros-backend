import { crearRouterCatalogoSimple } from './catalogoGenerico.routes';

export const administradoresRouter   = crearRouterCatalogoSimple('administrador', 'este administrador');
export const gerentesCuentaRouter    = crearRouterCatalogoSimple('gerenteCuenta', 'este gerente de cuenta');
export const tiposActivoRouter       = crearRouterCatalogoSimple('tipoActivo', 'este tipo de activo');
export const tiposCombustibleRouter  = crearRouterCatalogoSimple('tipoCombustible', 'este tipo de combustible');
export const clasesRouter            = crearRouterCatalogoSimple('clase', 'esta clase');
export const proveedoresCompraRouter = crearRouterCatalogoSimple('proveedorCompra', 'este proveedor de compra');
export const tiposOperacionRouter    = crearRouterCatalogoSimple('tipoOperacion', 'este tipo de operación');
export const nivelesBlindajeRouter   = crearRouterCatalogoSimple('nivelBlindaje', 'este nivel de blindaje');
export const transmisionesRouter     = crearRouterCatalogoSimple('transmision', 'esta transmisión'); // <-- nueva// -----

// Registra esto en tu archivo principal de rutas (routes/index.ts
// o donde montes /clientes y /aseguradoras hoy), por ejemplo:
//
// import {
//   administradoresRouter, gerentesCuentaRouter, tiposActivoRouter,
//   tiposCombustibleRouter, clasesRouter, proveedoresCompraRouter,
//   tiposOperacionRouter, nivelesBlindajeRouter,
// } from './catalogos';
// import gamaRouter from './gama';
//
// router.use('/administradores', administradoresRouter);
// router.use('/gerentes-cuenta', gerentesCuentaRouter);
// router.use('/tipos-activo', tiposActivoRouter);
// router.use('/tipos-combustible', tiposCombustibleRouter);
// router.use('/clases', clasesRouter);
// router.use('/gamas', gamaRouter);
// router.use('/proveedores-compra', proveedoresCompraRouter);
// router.use('/tipos-operacion', tiposOperacionRouter);
// router.use('/niveles-blindaje', nivelesBlindajeRouter);
// ------------------------------------------------------------
