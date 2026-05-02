// Estado compartido en memoria (fallback cuando MongoDB no está disponible)
const state = {
  productos: [],
  ventasRegistradas: [],
  dispositivosConectados: [],
  estadisticas: {
    productosAgregados: 0,
    productosActualizados: 0,
    escaneos: 0,
    inicioServidor: new Date().toISOString()
  }
};

module.exports = state;
