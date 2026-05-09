const { getDb } = require('../config/firebase');
const state = require('../state');

const buildDayRange = (fecha) => ({
  inicio: new Date(`${fecha}T00:00:00.000Z`),
  fin: new Date(`${fecha}T23:59:59.999Z`)
});

const getVentasEntreFechas = async (inicio, fin) => {
  const db = getDb();
  if (db) {
    const snapshot = await db.collection('ventas')
      .where('fecha', '>=', inicio)
      .where('fecha', '<=', fin)
      .get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return state.ventasRegistradas.filter((v) => {
    const f = new Date(v.fecha);
    return f >= inicio && f <= fin;
  });
};

const resumirVentas = (ventas) =>
  ventas.reduce((acc, venta) => {
    const total = Number(venta.total || 0);
    const items = (venta.items || []).reduce((s, i) => s + Number(i.cantidad || 0), 0);
    acc.totalVentas += total;
    acc.cantidadVentas += 1;
    acc.productosVendidos += items;
    if (venta.metodoPago === 'efectivo') acc.ventasEfectivo += total;
    else if (venta.metodoPago === 'tarjeta') acc.ventasTarjeta += total;
    else if (venta.metodoPago === 'transferencia') acc.ventasTransferencia += total;
    return acc;
  }, { totalVentas: 0, cantidadVentas: 0, productosVendidos: 0, ventasEfectivo: 0, ventasTarjeta: 0, ventasTransferencia: 0 });

module.exports = { buildDayRange, getVentasEntreFechas, resumirVentas };
