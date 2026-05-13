const express = require('express');
const { getDb, firestoreDocs } = require('../config/firebase');
const { getVentasEntreFechas } = require('../utils/ventasHelper');
const state = require('../state');

const router = express.Router();

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
};

const buildSalesSeries = async (dias) => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - (dias - 1));
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  const ventas = await getVentasEntreFechas(start, end);
  const byDay = new Map();

  for (let i = 0; i < dias; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const key = toDateKey(day);
    byDay.set(key, { fecha: key, ventas: 0, ingresos: 0, productos: 0 });
  }

  ventas.forEach((venta) => {
    const key = toDateKey(venta.fecha || new Date());
    const entry = byDay.get(key);
    if (!entry) return;

    const total = Number(venta.total || 0);
    const cantidadProductos = (venta.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    entry.ventas += 1;
    entry.ingresos += total;
    entry.productos += cantidadProductos;
  });

  return Array.from(byDay.values());
};

const getProductos = async () => {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('productos').get();
    return firestoreDocs(snapshot);
  }
  return state.productos || [];
};

router.get('/', async (req, res) => {
  try {
    const productos = await getProductos();
    res.json({
      productos: productos.length,
      dispositivos: state.dispositivosConectados.length,
      estadisticas: state.estadisticas
    });
  } catch (error) {
    console.error('Error /api/stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas generales' });
  }
});

router.get('/advanced', async (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;

    const ventasData = await buildSalesSeries(dias);
    const totalVentas = ventasData.reduce((sum, day) => sum + day.ventas, 0);
    const totalIngresos = ventasData.reduce((sum, day) => sum + day.ingresos, 0);
    const totalProductos = ventasData.reduce((sum, day) => sum + day.productos, 0);
    const promedioDiario = dias > 0 ? totalVentas / dias : 0;

    const mitad = Math.floor(dias / 2) || 1;
    const primeraMitad = ventasData.slice(0, mitad);
    const segundaMitad = ventasData.slice(mitad);

    const promedioPrimera = primeraMitad.length
      ? primeraMitad.reduce((sum, d) => sum + d.ventas, 0) / primeraMitad.length
      : 0;
    const promedioSegunda = segundaMitad.length
      ? segundaMitad.reduce((sum, d) => sum + d.ventas, 0) / segundaMitad.length
      : 0;

    const tendencia = promedioPrimera > 0
      ? Number((((promedioSegunda - promedioPrimera) / promedioPrimera) * 100).toFixed(2))
      : 0;

    res.json({
      periodo,
      ventasData,
      resumen: {
        totalVentas,
        totalIngresos,
        totalProductos,
        promedioDiario: Number(promedioDiario.toFixed(2)),
        tendencia,
        periodoVentas: dias
      }
    });
  } catch (error) {
    console.error('Error /api/stats/advanced:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas avanzadas' });
  }
});

router.get('/productos-vendidos', async (req, res) => {
  try {
    const limite = Math.max(1, Number(req.query.limite || 10));

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 30);
    start.setUTCHours(0, 0, 0, 0);

    const ventas = await getVentasEntreFechas(start, end);
    const ranking = new Map();

    ventas.forEach((venta) => {
      (venta.items || []).forEach((item) => {
        const key = String(item.productoId || item.nombre || 'producto');
        const actual = ranking.get(key) || {
          id: key,
          nombre: item.nombre || 'Producto sin nombre',
          cantidad: 0,
          ingresos: 0,
          categoria: item.categoria || 'Sin categoría',
          margen: Number(item.margen || 0)
        };

        actual.cantidad += Number(item.cantidad || 0);
        actual.ingresos += Number(item.subtotal || item.total || 0);
        ranking.set(key, actual);
      });
    });

    const productosMasVendidos = Array.from(ranking.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, limite);

    res.json(productosMasVendidos);
  } catch (error) {
    console.error('Error /api/stats/productos-vendidos:', error);
    res.status(500).json({ error: 'Error al obtener productos vendidos' });
  }
});

router.get('/deudas', async (req, res) => {
  try {
    const db = getDb();
    if (db) {
      const snap = await db.collection('deudas').get();
      const deudas = firestoreDocs(snap);
      const totalDeuda = deudas.reduce((sum, d) => sum + Number(d.saldo || 0), 0);
      return res.json({
        totalDeuda,
        totalRegistros: deudas.length,
        porTipo: {
          clientes: deudas.filter((d) => d.tipo === 'cliente').reduce((sum, d) => sum + Number(d.saldo || 0), 0),
          empleados: deudas.filter((d) => d.tipo === 'empleado').reduce((sum, d) => sum + Number(d.saldo || 0), 0)
        },
        porEstado: {
          pendiente: deudas.filter((d) => d.estado === 'pendiente').length,
          parcial: deudas.filter((d) => d.estado === 'parcial').length,
          pagada: deudas.filter((d) => d.estado === 'pagada').length
        },
        deudas: deudas.slice(0, 5).map((d) => ({
          nombrePersona: d.nombrePersona,
          monto: Number(d.monto || 0),
          saldo: Number(d.saldo || 0),
          estado: d.estado,
          tipo: d.tipo,
          fecha: d.fecha
        }))
      });
    }

    res.json({
      totalDeuda: 0,
      totalRegistros: 0,
      porTipo: { clientes: 0, empleados: 0 },
      porEstado: { pendiente: 0, parcial: 0, pagada: 0 },
      deudas: []
    });
  } catch (error) {
    console.error('Error /api/stats/deudas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de deudas' });
  }
});

router.get('/margenes', async (req, res) => {
  try {
    const productos = await getProductos();
    if (!productos.length) {
      return res.json({ promedio: 0, categorias: {} });
    }

    const categorias = {};
    let sumaMargen = 0;

    productos.forEach((producto) => {
      const categoria = producto.categoria || 'Sin categoría';
      const precioCompra = Number(producto.precioCompra || producto.precio || 0);
      const precioVenta = Number(producto.precioVenta || producto.precio || 0);
      const margen = Number(producto.margen || (precioCompra > 0 ? ((precioVenta - precioCompra) / precioCompra) * 100 : 0));

      if (!categorias[categoria]) {
        categorias[categoria] = { margenTotal: 0, productos: 0 };
      }

      categorias[categoria].margenTotal += margen;
      categorias[categoria].productos += 1;
      sumaMargen += margen;
    });

    const categoriasFinal = Object.fromEntries(
      Object.entries(categorias).map(([categoria, data]) => [
        categoria,
        {
          margen: Number((data.margenTotal / data.productos).toFixed(2)),
          ventas: data.productos
        }
      ])
    );

    res.json({
      promedio: Number((sumaMargen / productos.length).toFixed(2)),
      categorias: categoriasFinal
    });
  } catch (error) {
    console.error('Error /api/stats/margenes:', error);
    res.status(500).json({ error: 'Error al obtener márgenes' });
  }
});

router.get('/resumen', async (req, res) => {
  try {
    const productos = await getProductos();

    let deudaTotal = 0;
    let registrosDeuda = 0;
    const db = getDb();
    if (db) {
      const snap = await db.collection('deudas').get();
      const deudas = firestoreDocs(snap);
      deudaTotal = deudas.reduce((sum, d) => sum + Number(d.saldo || 0), 0);
      registrosDeuda = snap.size;
    }

    const ventasHoy = await buildSalesSeries(1);
    const ventasSemana = await buildSalesSeries(7);
    const totalSemana = ventasSemana.reduce((sum, d) => sum + d.ventas, 0);
    const promedioSemana = ventasSemana.length ? totalSemana / ventasSemana.length : 0;

    res.json({
      fecha: new Date().toISOString(),
      sistema: {
        productosTotal: productos.length,
        dispositivosConectados: state.dispositivosConectados.length,
        usuariosActivos: 1
      },
      ventas: {
        hoy: ventasHoy[0]?.ventas || 0,
        promedioDiario: Number(promedioSemana.toFixed(2)),
        tendencia: 0
      },
      deudas: {
        totalPendiente: deudaTotal,
        registros: registrosDeuda,
        tasaPago: 0
      },
      salud: {
        stockBajo: productos.filter((p) => Number(p.cantidad || p.stock || 0) <= Number(p.stockMinimo || 0)).length,
        alertas: 0
      }
    });
  } catch (error) {
    console.error('Error /api/stats/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;