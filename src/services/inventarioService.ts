// src/services/inventarioService.ts
export const obtenerProductos = async () => {
  // Simulación de llamada a API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          nombre: 'Arroz Diana Premium 500g',
          codigoBarras: '7702001001234',
          categoria: 'Granos y Cereales',
          stock: 45,
          stockMinimo: 10,
          precioCompra: 1800,
          precioVenta: 2500,
          margen: 38.9,
          proveedor: 'Distribuidora Central',
          proveedorId: 1,
          ubicacion: 'Pasillo A - Estante 1',
          imagen: 'https://via.placeholder.com/300x200/667eea/white?text=ARROZ',
          descripcion: 'Arroz premium de grano largo',
          estado: 'activo',
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString()
        },
        // ... más productos
      ]);
    }, 500);
  });
};