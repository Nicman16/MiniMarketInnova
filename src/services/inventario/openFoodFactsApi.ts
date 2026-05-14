/**
 * Servicio para consultar Open Food Facts API
 * 
 * API pública gratuita que retorna informacion de productos
 * a partir de su codigo de barras.
 * Documentacion: https://world.openfoodfacts.org/files/api-documentation.html
 * 
 * Ejemplo:
 *   GET https://world.openfoodfacts.org/api/v2/product/7702007080476.json
 */

export interface OpenFoodFactsProduct {
  /** Codigo de barras del producto */
  code: string;
  /** Nombre del producto */
  product_name: string;
  /** Nombre en español */
  product_name_es?: string;
  /** Marca */
  brands?: string;
  /** Cantidad / peso (ej: "11g", "500ml", "1kg") */
  quantity?: string;
  /** URL de la imagen delantera del producto */
  image_url?: string;
  /** URL de la imagen frontal pequena (thumbnail) */
  image_small_url?: string;
  /** Categoria del producto */
  categories?: string;
  /** Categoria en español */
  categories_es?: string;
  /** Nutriscore (a, b, c, d, e) */
  nutriscore_grade?: string;
  /** Lista de ingredientes */
  ingredients_text?: string;
}

export interface OpenFoodFactsResponse {
  /** Codigo de estado: 1 = producto encontrado, 0 = no encontrado */
  status: number;
  /** Mensaje de estado */
  status_verbose: string;
  /** Datos del producto (si existe) */
  product?: OpenFoodFactsProduct;
  /** Codigo de barras consultado */
  code: string;
}

/**
 * Consulta Open Food Facts API por codigo de barras.
 * Retorna null si no encuentra el producto.
 */
export async function buscarProductoEnOpenFoodFacts(
  codigoBarras: string
): Promise<OpenFoodFactsProduct | null> {
  const codigo = codigoBarras.trim();
  if (!codigo) return null;

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${codigo}.json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`Open Food Facts respondio con status ${response.status}`);
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return data.product;
  } catch (error) {
    console.warn('Error consultando Open Food Facts:', error);
    return null;
  }
}