/**
 * Diccionario de productos conocidos por código de barras.
 * Al escanear un código, el sistema busca aquí primero para
 * auto-completar nombre, gramaje e imagen del producto.
 */
export interface ProductoConocido {
  nombre: string;
  gramaje: string;
  imagen: string;
}

const productosConocidos: Record<string, ProductoConocido> = {
  // ── Chocolatinas Jet ──────────────────────────────────────
  '7702007080476': {
    nombre: 'Chocolatina Jet Leche',
    gramaje: '11g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0804/76/1.jpg'
  },
  '7702007001822': {
    nombre: 'Chocolatina Jet Blanca',
    gramaje: '24g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0018/22/1.jpg'
  },
  '7102007218303': {
    nombre: 'Chocolatina Jet Regala una Jet',
    gramaje: '45g',
    imagen: 'https://images.openfoodfacts.org/images/products/710/2007/2183/03/1.jpg'
  },
  '7702007048421': {
    nombre: 'Wafer Jet Surtida Display',
    gramaje: '24 x 25g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0484/21/1.jpg'
  },

  // ── Productos adicionales comunes ──────────────────────────
  '7702007009774': {
    nombre: 'Chocolatina Jet Leche',
    gramaje: '24g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0097/74/1.jpg'
  },
  '7702007001808': {
    nombre: 'Chocolatina Jet Oscura',
    gramaje: '24g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0018/08/1.jpg'
  },
  '7702007001815': {
    nombre: 'Chocolatina Jet Maní',
    gramaje: '28g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0018/15/1.jpg'
  },

  // ── Wafer Jet ──────────────────────────────────────────────
  '7702007048056': {
    nombre: 'Wafer Jet Leche',
    gramaje: '25g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0480/56/1.jpg'
  },
  '7702007048070': {
    nombre: 'Wafer Jet Arequipe',
    gramaje: '25g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0480/70/1.jpg'
  },
  '7702007048018': {
    nombre: 'Wafer Jet Surtido',
    gramaje: '25g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0480/18/1.jpg'
  },

  // ── Productos de consumo básico ────────────────────────────
  '7707362000530': {
    nombre: 'Arroz Diana',
    gramaje: '500g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/7362/0005/30/1.jpg'
  },
  '7702007001068': {
    nombre: 'Gaseosa Colombiana',
    gramaje: '1.5L',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0010/68/1.jpg'
  },
  '7702007000412': {
    nombre: 'Gaseosa Colombiana',
    gramaje: '400ml',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0004/12/1.jpg'
  },
  '7702007010444': {
    nombre: 'Galleta Saltín Noel',
    gramaje: '265g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0104/44/1.jpg'
  },
  '7702007076998': {
    nombre: 'Galleta Festival Doble Relleno',
    gramaje: '150g',
    imagen: 'https://images.openfoodfacts.org/images/products/770/2007/0769/98/1.jpg'
  }
};

/**
 * Busca un producto en el diccionario por código de barras.
 * Retorna null si no se encuentra.
 */
export function buscarProductoPorCodigo(codigo: string): ProductoConocido | null {
  const codigoNormalizado = codigo?.trim() || '';
  return productosConocidos[codigoNormalizado] || null;
}

/**
 * Retorna el diccionario completo de productos conocidos.
 */
export function obtenerTodosProductosConocidos(): Record<string, ProductoConocido> {
  return { ...productosConocidos };
}
