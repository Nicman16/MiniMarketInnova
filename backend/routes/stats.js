const express = require('express');
const mongoose = require('mongoose');
const Deuda = require('../models/Deuda');
const { getVentasEntreFechas, resumirVentas, buildDayRange } = require('../utils/ventasHelper');
const state = require('../state');

const router = express.Router();

// GET /api/stats
router.get('/', (req, res) => {
  res.json({ productos: state.productos.length, dispositivos: state.dispositivosConectados.length, estadisticas: state.estadisticas });
});

// GET /api/stats/advanced
router.get('/advanced', (req, res) => {
  try {
    const { periodo = '30d' } = req.query;
    const dias = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;

    const ventasData = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const esFindeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
      const ventasBase = 15 * (esFindeSemana ? 1.3 : 1) * (0.7 + Math.random() * 0.6);
      ventasData.push({ fecha: fecha.toISOString().split('T')[0], ventas: Math.round(ventasBase), ingresos: Math.round(ventasBase * 8000 + Math.random() * 8000) });
    }

    const totalVentas = ventasData.reduce((sum, d) => sum + d.ventas, 0);
    const totalIngresos = ventasData.reduce((sum, d) => sum + d.ingresos, 0);
    const promedioDiario = totalVentas / ventasData.length;
    const mitad = Math.floor(ventasData.length / 2);
    const primeraMitad = ventasData.slice(0, mitad).reduce((sum, d) => sum + d.ventas, 0) / mitad;
    const segundaMitad = ventasData.slice(mitad).reduce((sum, d) => sum + d.ventas, 0) / (ventasData.length - mitad);
    const tendencia = ((segundaMitad - primeraMitad) / primeraMitad * 100).toFixed(2);

    res.json({ periodo, ventasData, resumen: { totalVentas, totalIngresos, promedioDiario: promedioDiario.toFixed(2), tendencia: parseFloat(tendencia), periodoVentas: dias } });
  } catch (error) {
    console.error('Error /api/stats/advanced:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas avanzadas' });
  }
});

// GET /api/stats/productos-vendidos
router.get('/productos-vendidos', (req, res) => {
  try {
    const { limite = 10 } = req.query;
    const productosMasVendidos = [
      { nombre: 'Arroz Diana Premium 500g', cantidad: 45, ingresos: 112500, categoria: 'Granos', margen: 30 },
      { nombre: 'Aceite Gourmet 1L', cantidad: 32, ingresos: 144000, categoria: 'Aceites', margen: 35 },
      { nombre: 'Azúcar Incauca 1kg', cantidad: 28, ingresos: 89600, categoria: 'Endulzantes', margen: 28 },
      { nombre: 'Leche Alpina 1L', cantidad: 52, ingresos: 156000, categoria: 'Lácteos', margen: 25 },
      { nombre: 'Pan Bimbo Integral', cantidad: 38, ingresos: 76000, categoria: 'Panadería', margen: 20 },
      { nombre: 'Huevos AA x30', cantidad: 25, ingresos: 87500, categoria: 'Proteínas', margen: 22 },
      { nombre: 'Pollo Pechuga kg', cantidad: 18, ingresos: 270000, categoria: 'Carnes', margen: 40 },
      { nombre: 'Coca Cola 2L', cantidad: 41, ingresos: 164000, categoria: 'Bebidas', margen: 32 },
      { nombre: 'Café Pasilla x500g', cantidad: 22, ingresos: 110000, categoria: 'Bebidas', margen: 38 },
      { nombre: 'Atún lata 170g', cantidad: 35, ingresos: 70000, categoria: 'Conservas', margen: 29 }
    ].slice(0, parseInt(limite));
    res.json(productosMasVendidos);
  } catch (error) {
    console.error('Error /api/stats/productos-vendidos:', error);
    res.status(500).json({ error: 'Error al obtener productos vendidos' });
  }
});

// GET /api/stats/deudas
router.get('/deudas', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const deudas = await Deuda.find();
      const totalDeuda = deudas.reduce((sum, d) => sum + d.saldo, 0);
      return res.json({
        totalDeuda, totalRegistros: deudas.length,
        porTipo: {
          clientes: deudas.filter((d) => d.tipo === 'cliente').reduce((sum, d) => sum + d.saldo, 0),
          empleados: deudas.filter((d) => d.tipo === 'empleado').reduce((sum, d) => sum + d.saldo, 0)
        },
        porEstado: {
          pendiente: deudas.filter((d) => d.estado === 'pendiente').length,
          parcial: deudas.filter((d) => d.estado === 'parcial').length,
          pagada: deudas.filter((d) => d.estado === 'pagada').length
        },
        deudas: deudas.slice(0, 5).map((d) => ({ nombrePersona: d.nombrePersona, monto: d.monto, saldo: d.saldo, estado: d.estado, tipo: d.tipo, fecha: d.fecha }))
      });
    }
    res.json({ totalDeuda: 0, totalRegistros: 0, porTipo: { clientes: 0, empleados: 0 }, porEstado: { pendiente: 0, parcial: 0, pagada: 0 }, deudas: [] });
  } catch (error) {
    console.error('Error /api/stats/deudas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de deudas' });
  }
});

// GET /api/stats/margenes
router.get('/margenes', (req, res) => {
  res.json({
    promedio: 30,
    categorias: {
      'Carnes': { margen: 40, ventas: 18 }, 'Bebidas': { margen: 32, ventas: 73 },
      'Lácteos': { margen: 25, ventas: 52 }, 'Granos': { margen: 30, ventas: 45 },
      'Aceites': { margen: 35, ventas: 32 }, 'Panadería': { margen: 20, ventas: 38 },
      'Proteínas': { margen: 22, ventas: 25 }, 'Conservas': { margen: 29, ventas: 35 }
    }
  });
});

// GET /api/stats/resumen
router.get('/resumen', async (req, res) => {
  try {
    let deudaTotal = 0;
    let registrosDeuda = 0;
    if (mongoose.connection.readyState === 1) {
      const deudas = await Deuda.find();
      deudaTotal = deudas.reduce((sum, d) => sum + d.saldo, 0);
      registrosDeuda = deudas.length;
    }
    res.json({
      fecha: new Date().toISOString(),
      sistema: { productosTotal: state.productos.length, dispositivosConectados: state.dispositivosConectados.length, usuariosActivos: 2 },
      ventas: { hoy: Math.round(15 * (0.7 + Math.random() * 0.6)), promedioDiario: 15, tendencia: (Math.random() * 40 - 20).toFixed(2) },
      deudas: { totalPendiente: deudaTotal, registros: registrosDeuda, tasaPago: 85 },
      salud: { stockBajo: Math.floor(Math.random() * 5), alertas: Math.floor(Math.random() * 3) }
    });
  } catch (error) {
    console.error('Error /api/stats/resumen:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

module.exports = router;
