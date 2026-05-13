const express = require('express');
const { getDb, firestoreDocs } = require('../config/firebase');
const { getVentasEntreFechas } = require('../utils/ventasHelper');

const router = express.Router();

// GET /api/reportes/ventas
router.get('/ventas', async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const ventas = await getVentasEntreFechas(fechaInicio, new Date(`${fin}T23:59:59.999Z`));
    const ventasPorDia = new Map();

    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      ventasPorDia.set(fecha, { fecha, cantidad: 0, ingresos: 0, ticket_promedio: 0, productos_vendidos: 0, efectivo: 0, tarjeta: 0, transferencia: 0 });
    }

    ventas.forEach((venta) => {
      const fecha = new Date(venta.fecha).toISOString().split('T')[0];
      const actual = ventasPorDia.get(fecha);
      if (!actual) return;
      actual.cantidad += 1;
      actual.ingresos += Number(venta.total || 0);
      actual.productos_vendidos += (venta.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
      if (venta.metodoPago === 'efectivo') actual.efectivo += Number(venta.total || 0);
      else if (venta.metodoPago === 'tarjeta') actual.tarjeta += Number(venta.total || 0);
      else if (venta.metodoPago === 'transferencia') actual.transferencia += Number(venta.total || 0);
    });

    const reportes = Array.from(ventasPorDia.values()).map((dia) => ({ ...dia, ticket_promedio: dia.cantidad > 0 ? Math.round(dia.ingresos / dia.cantidad) : 0 }));
    res.json(reportes);
  } catch (error) {
    console.error('Error /api/reportes/ventas:', error);
    res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
});

// GET /api/reportes/productos
router.get('/productos', async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });

    const ventas = await getVentasEntreFechas(new Date(inicio), new Date(`${fin}T23:59:59.999Z`));
    const productosVendidos = new Map();

    ventas.forEach((venta) => {
      (venta.items || []).forEach((item) => {
        const key = String(item.productoId || item.nombre);
        const actual = productosVendidos.get(key) || { id: key, nombre: item.nombre, cantidad: 0, ingresos: 0, categoria: item.categoria || 'Sin categoría' };
        actual.cantidad += Number(item.cantidad || 0);
        actual.ingresos += Number(item.subtotal || 0);
        productosVendidos.set(key, actual);
      });
    });

    res.json(Array.from(productosVendidos.values()).sort((a, b) => b.ingresos - a.ingresos));
  } catch (error) {
    console.error('Error /api/reportes/productos:', error);
    res.status(500).json({ error: 'Error al obtener reporte de productos' });
  }
});

// GET /api/reportes/empleados
router.get('/empleados', async (req, res) => {
  try {
    const { inicio, fin } = req.query;
    if (!inicio || !fin) return res.status(400).json({ error: 'Se requieren fechas inicio y fin' });

    const ventas = await getVentasEntreFechas(new Date(inicio), new Date(`${fin}T23:59:59.999Z`));
    const empleados = new Map();

    ventas.forEach((venta) => {
      const key = String(venta.vendedorId || venta.vendedorNombre);
      const actual = empleados.get(key) || { id: key, nombre: venta.vendedorNombre, ventas: 0, ingresos: 0 };
      actual.ventas += 1;
      actual.ingresos += Number(venta.total || 0);
      empleados.set(key, actual);
    });

    res.json(Array.from(empleados.values()).sort((a, b) => b.ingresos - a.ingresos));
  } catch (error) {
    console.error('Error /api/reportes/empleados:', error);
    res.status(500).json({ error: 'Error al obtener reporte de empleados' });
  }
});

// GET /api/reportes/stock-bajo
router.get('/stock-bajo', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.json([]);

    const snapshot = await db.collection('productos').get();
    const productos = firestoreDocs(snapshot);

    const stockBajo = productos
      .map((p) => ({
        id: p.id,
        nombre: p.nombre || 'Producto sin nombre',
        codigoBarras: p.codigoBarras || 'N/D',
        cantidad: Number(p.cantidad || p.stock || 0),
        nivel_minimo: Number(p.stockMinimo || 0),
        dias_sin_stock: Number(p.diasSinStock || 0)
      }))
      .filter((p) => p.cantidad <= p.nivel_minimo)
      .sort((a, b) => a.cantidad - b.cantidad);

    res.json(stockBajo);
  } catch (error) {
    console.error('Error /api/reportes/stock-bajo:', error);
    res.status(500).json({ error: 'Error al obtener stock bajo' });
  }
});

module.exports = router;
