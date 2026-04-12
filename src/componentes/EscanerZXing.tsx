import React, { useRef, useEffect, useState } from "react";
import { BrowserMultiFormatReader, Result } from "@zxing/library";
import axios from "axios";
import { Producto } from "../types/pos.types";
import "../styles/EscanerZXing.css";

interface EscanerProps {
  onScan: (codigo: string) => void;
  onProductoEncontrado?: (producto: Producto) => void;
  onProductoNoEncontrado?: (codigo: string) => void;
  productos: Producto[];
  isActive: boolean;
}

function EscanerZXing({
  onScan,
  onProductoEncontrado,
  onProductoNoEncontrado,
  productos,
  isActive,
}: EscanerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(
    null
  );
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([]);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState<string>(
    ""
  );
  const [escaneoActivo, setEscaneoActivo] = useState(false);
  const [error, setError] = useState<string>("");
  const [permisosCamara, setPermisosCamara] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<string>("");
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(
    null
  );
  const [cargandoAPI, setCargandoAPI] = useState(false);

  // Base de datos de códigos de barras conocidos
  const baseDatosCodigosBarras = {
    // Tus códigos existentes
    "7702001001234": {
      nombre: "Arroz Diana Premium 500g",
      categoria: "Granos y Cereales",
      precioCompra: 1800,
      precioVenta: 2500,
      stockMinimo: 10,
      proveedor: "Distribuidora Central",
      ubicacion: "Pasillo A - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/667eea/white?text=ARROZ+DIANA",
      descripcion:
        "Arroz premium de grano largo, ideal para toda ocasión",
    },
    "7702002001235": {
      nombre: "Aceite Gourmet Girasol 1L",
      categoria: "Aceites y Vinagres",
      precioCompra: 3200,
      precioVenta: 4500,
      stockMinimo: 5,
      proveedor: "Distribuidora Central",
      ubicacion: "Pasillo B - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/28a745/white?text=ACEITE+GOURMET",
      descripcion:
        "Aceite de girasol 100% puro, ideal para freír y cocinar",
    },
    "7702003001236": {
      nombre: "Azúcar Incauca Refinada 1kg",
      categoria: "Endulzantes",
      precioCompra: 2100,
      precioVenta: 3200,
      stockMinimo: 15,
      proveedor: "Distribuidora Central",
      ubicacion: "Pasillo A - Estante 3",
      imagen:
        "https://via.placeholder.com/300x200/ffc107/white?text=AZUCAR+INCAUCA",
      descripcion: "Azúcar refinada de alta calidad",
    },
    // Códigos adicionales comunes
    "7894900011517": {
      nombre: "Coca Cola Original 2L",
      categoria: "Bebidas Gaseosas",
      precioCompra: 2800,
      precioVenta: 4000,
      stockMinimo: 8,
      proveedor: "Coca Cola Company",
      ubicacion: "Nevera - Sección Bebidas",
      imagen:
        "https://via.placeholder.com/300x200/dc3545/white?text=COCA+COLA",
      descripcion: "Bebida gaseosa sabor original",
    },
    "7891000100103": {
      nombre: "Leche Alpina Entera 1L",
      categoria: "Lácteos",
      precioCompra: 2200,
      precioVenta: 3000,
      stockMinimo: 12,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Nevera - Sección Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/007bff/white?text=LECHE+ALPINA",
      descripcion: "Leche entera pasteurizada",
    },
    "7702001234567": {
      nombre: "Pan Bimbo Blanco Grande",
      categoria: "Panadería y Repostería",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 6,
      proveedor: "Grupo Bimbo",
      ubicacion: "Estante Panadería",
      imagen:
        "https://via.placeholder.com/300x200/ffc107/white?text=PAN+BIMBO",
      descripcion: "Pan de molde blanco grande",
    },
    // Más productos colombianos comunes
    "7702004001237": {
      nombre: "Café Juan Valdez 500g",
      categoria: "Café e Infusiones",
      precioCompra: 8500,
      precioVenta: 12000,
      stockMinimo: 3,
      proveedor: "Juan Valdez Café",
      ubicacion: "Pasillo C - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CAFE+JUAN+VALDEZ",
      descripcion: "Café colombiano 100% arábica, tueste medio",
    },
    "7702005001238": {
      nombre: "Atún Van Camps en Agua 170g",
      categoria: "Enlatados y Conservas",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 8,
      proveedor: "Starkist",
      ubicacion: "Pasillo D - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/4682b4/white?text=ATUN+VAN+CAMPS",
      descripcion: "Atún en agua, bajo en sodio",
    },
    "7702006001239": {
      nombre: "Yogurt Alpina Fresa 125g",
      categoria: "Lácteos",
      precioCompra: 1200,
      precioVenta: 1800,
      stockMinimo: 15,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Nevera - Yogurt",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=YOGURT+ALPINA",
      descripcion: "Yogurt natural con sabor a fresa",
    },
    "7702007001240": {
      nombre: "Pasta Doria Spaghetti 500g",
      categoria: "Pastas y Salsas",
      precioCompra: 1800,
      precioVenta: 2600,
      stockMinimo: 10,
      proveedor: "Pasta Doria",
      ubicacion: "Pasillo E - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=PASTA+DORIA",
      descripcion: "Pasta spaghetti de trigo durum",
    },
    "7702008001241": {
      nombre: "Jabón Rey Limón 125g",
      categoria: "Cuidado Personal",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 12,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo F - Estante 3",
      imagen:
        "https://via.placeholder.com/300x200/32cd32/white?text=JABON+REY",
      descripcion: "Jabón en barra con aroma a limón",
    },
    "7702009001242": {
      nombre: "Shampoo Sedal Ceramide 400ml",
      categoria: "Cuidado Personal",
      precioCompra: 5200,
      precioVenta: 7800,
      stockMinimo: 5,
      proveedor: "Unilever",
      ubicacion: "Pasillo F - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=SHAMPOO+SEDAL",
      descripcion: "Shampoo fortalecedor con ceramidas",
    },
    "7702010001243": {
      nombre: "Papel Higiénico Familia 12 rollos",
      categoria: "Hogar y Limpieza",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 4,
      proveedor: "Familia",
      ubicacion: "Pasillo G - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PAPEL+FAMILIA",
      descripcion: "Papel higiénico suave y resistente",
    },
    "7702011001244": {
      nombre: "Detergente Ariel 3kg",
      categoria: "Hogar y Limpieza",
      precioCompra: 18500,
      precioVenta: 26500,
      stockMinimo: 3,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo G - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/00bfff/white?text=DETERGENTE+ARIEL",
      descripcion: "Detergente líquido para ropa",
    },
    "7702012001245": {
      nombre: "Gaseosa Postobón Manzana 1.5L",
      categoria: "Bebidas Gaseosas",
      precioCompra: 2400,
      precioVenta: 3500,
      stockMinimo: 10,
      proveedor: "Postobón",
      ubicacion: "Nevera - Bebidas Nacionales",
      imagen:
        "https://via.placeholder.com/300x200/ff4500/white?text=POSTOBON+MANZANA",
      descripcion: "Gaseosa sabor manzana, 1.5 litros",
    },
    "7702013001246": {
      nombre: "Chocolatina Jet 26g",
      categoria: "Chocolates y Dulces",
      precioCompra: 800,
      precioVenta: 1200,
      stockMinimo: 20,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CHOCOLATINA+JET",
      descripcion: "Chocolatina con leche y avellanas",
    },
    "7702014001247": {
      nombre: "Galletas Saltín Noel 135g",
      categoria: "Chocolates y Dulces",
      precioCompra: 2200,
      precioVenta: 3200,
      stockMinimo: 8,
      proveedor: "Noel",
      ubicacion: "Pasillo H - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=GALLETAS+SALTIN",
      descripcion: "Galletas saladas crackers",
    },
    "7702015001248": {
      nombre: "Salsa de Tomate Fruco 200g",
      categoria: "Pastas y Salsas",
      precioCompra: 1800,
      precioVenta: 2600,
      stockMinimo: 12,
      proveedor: "Fruco",
      ubicacion: "Pasillo E - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/dc143c/white?text=SALSA+FRUCO",
      descripcion: "Salsa de tomate natural",
    },
    "7702016001249": {
      nombre: "Manzanas Rojas por kg",
      categoria: "Frutas y Verduras",
      precioCompra: 3500,
      precioVenta: 5500,
      stockMinimo: 5,
      proveedor: "Mercado Local",
      ubicacion: "Frutas y Verduras",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=MANZANAS+ROJAS",
      descripcion: "Manzanas rojas frescas, precio por kilogramo",
    },
    "7702017001250": {
      nombre: "Pollo Entero Fresco por kg",
      categoria: "Carnes y Pollo",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 3,
      proveedor: "Avícola Nacional",
      ubicacion: "Nevera Carnes",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=POLLO+ENTERO",
      descripcion: "Pollo entero fresco, precio por kilogramo",
    },
    "7702018001251": {
      nombre: "Arroz Roa Premium 2kg",
      categoria: "Granos y Cereales",
      precioCompra: 7200,
      precioVenta: 10500,
      stockMinimo: 6,
      proveedor: "Arroz Roa",
      ubicacion: "Pasillo A - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=ARROZ+ROA",
      descripcion: "Arroz blanco premium, grano largo",
    },
    "7702019001252": {
      nombre: "Lentejas La Esperanza 500g",
      categoria: "Granos y Cereales",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 10,
      proveedor: "La Esperanza",
      ubicacion: "Pasillo A - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=LENTEJAS",
      descripcion: "Lentejas secas de alta calidad",
    },
    "7702020001253": {
      nombre: "Frijoles Cargamanto 500g",
      categoria: "Granos y Cereales",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 8,
      proveedor: "Cargamanto",
      ubicacion: "Pasillo A - Estante 5",
      imagen:
        "https://via.placeholder.com/300x200/654321/white?text=FRIJOLES",
      descripcion: "Frijoles rojos secos",
    },
    "7702021001254": {
      nombre: "Aceite de Oliva Extra Virgen 500ml",
      categoria: "Aceites y Vinagres",
      precioCompra: 18500,
      precioVenta: 26500,
      stockMinimo: 4,
      proveedor: "Importadora Gourmet",
      ubicacion: "Pasillo B - Estante 3",
      imagen:
        "https://via.placeholder.com/300x200/228b22/white?text=ACEITE+OLIVA",
      descripcion: "Aceite de oliva extra virgen español",
    },
    "7702022001255": {
      nombre: "Vinagre de Manzana 500ml",
      categoria: "Aceites y Vinagres",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 6,
      proveedor: "Distribuidora Gourmet",
      ubicacion: "Pasillo B - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/f0f8ff/white?text=VINAGRE+MANZANA",
      descripcion: "Vinagre de manzana orgánico",
    },
    "7702023001256": {
      nombre: "Miel de Abeja 500g",
      categoria: "Endulzantes",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 5,
      proveedor: "Apicultores Unidos",
      ubicacion: "Pasillo A - Estante 6",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=MIEL+ABEJA",
      descripcion: "Miel de abeja pura colombiana",
    },
    "7702024001257": {
      nombre: "Panela en Bloque 500g",
      categoria: "Endulzantes",
      precioCompra: 2200,
      precioVenta: 3500,
      stockMinimo: 8,
      proveedor: "Paneleros del Valle",
      ubicacion: "Pasillo A - Estante 7",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=PANELA",
      descripcion: "Panela orgánica en bloque",
    },
    "7702025001258": {
      nombre: "Sal Refinada 500g",
      categoria: "Condimentos y Especias",
      precioCompra: 1200,
      precioVenta: 1800,
      stockMinimo: 15,
      proveedor: "Salinas del Caribe",
      ubicacion: "Pasillo I - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/f5f5f5/white?text=SAL+REFINADA",
      descripcion: "Sal marina refinada yodada",
    },
    "7702026001259": {
      nombre: "Pimienta Negra Molida 50g",
      categoria: "Condimentos y Especias",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 10,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PIMIENTA+NEGRA",
      descripcion: "Pimienta negra molida fresca",
    },
    "7702027001260": {
      nombre: "Cúrcuma en Polvo 100g",
      categoria: "Condimentos y Especias",
      precioCompra: 5200,
      precioVenta: 7800,
      stockMinimo: 8,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 3",
      imagen:
        "https://via.placeholder.com/300x200/ffa500/white?text=CURCUMA",
      descripcion: "Cúrcuma orgánica en polvo",
    },
    "7702028001261": {
      nombre: "Ajo en Polvo 100g",
      categoria: "Condimentos y Especias",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 12,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=AJO+POLVO",
      descripcion: "Ajo deshidratado en polvo",
    },
    "7702029001262": {
      nombre: "Canela en Rama 50g",
      categoria: "Condimentos y Especias",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 10,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 5",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CANELA+RAMA",
      descripcion: "Canela ceilan en rama",
    },
    "7702030001263": {
      nombre: "Comino en Polvo 50g",
      categoria: "Condimentos y Especias",
      precioCompra: 3600,
      precioVenta: 5400,
      stockMinimo: 12,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 6",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=COMINO+POLVO",
      descripcion: "Comino molido premium",
    },
    "7702031001264": {
      nombre: "Orégano Seco 30g",
      categoria: "Condimentos y Especias",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 15,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 7",
      imagen:
        "https://via.placeholder.com/300x200/228b22/white?text=OREGANO+SECO",
      descripcion: "Orégano mediterráneo seco",
    },
    "7702032001265": {
      nombre: "Laurel en Hojas 10g",
      categoria: "Condimentos y Especias",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 18,
      proveedor: "Especias del Mundo",
      ubicacion: "Pasillo I - Estante 8",
      imagen:
        "https://via.placeholder.com/300x200/32cd32/white?text=LAUREL+HOJAS",
      descripcion: "Hojas de laurel secas",
    },
    "7702033001266": {
      nombre: "Tomate Maduro por kg",
      categoria: "Frutas y Verduras",
      precioCompra: 2500,
      precioVenta: 4000,
      stockMinimo: 8,
      proveedor: "Mercado Local",
      ubicacion: "Frutas y Verduras",
      imagen:
        "https://via.placeholder.com/300x200/ff6347/white?text=TOMATE+MADURO",
      descripcion: "Tomates maduros frescos, precio por kilogramo",
    },
    "7702034001267": {
      nombre: "Cebolla Cabezona por kg",
      categoria: "Frutas y Verduras",
      precioCompra: 1800,
      precioVenta: 2800,
      stockMinimo: 10,
      proveedor: "Mercado Local",
      ubicacion: "Frutas y Verduras",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=CEBOLLA+CABEZONA",
      descripcion: "Cebolla cabezona fresca, precio por kilogramo",
    },
    "7702035001268": {
      nombre: "Papa Pastusa por kg",
      categoria: "Frutas y Verduras",
      precioCompra: 1600,
      precioVenta: 2500,
      stockMinimo: 12,
      proveedor: "Mercado Local",
      ubicacion: "Frutas y Verduras",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=PAPA+PASTUSA",
      descripcion: "Papa pastusa fresca, precio por kilogramo",
    },
    "7702036001269": {
      nombre: "Zanahoria por kg",
      categoria: "Frutas y Verduras",
      precioCompra: 2000,
      precioVenta: 3200,
      stockMinimo: 8,
      proveedor: "Mercado Local",
      ubicacion: "Frutas y Verduras",
      imagen:
        "https://via.placeholder.com/300x200/ffa500/white?text=ZANAHORIA",
      descripcion: "Zanahorias frescas, precio por kilogramo",
    },
    "7702037001270": {
      nombre: "Res Carne Molida por kg",
      categoria: "Carnes y Pollo",
      precioCompra: 18500,
      precioVenta: 26500,
      stockMinimo: 4,
      proveedor: "Cárnicos Premium",
      ubicacion: "Nevera Carnes",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CARNE+MOLIDA",
      descripcion: "Carne de res molida magra, precio por kilogramo",
    },
    "7702038001271": {
      nombre: "Cerdo Costilla por kg",
      categoria: "Carnes y Pollo",
      precioCompra: 16500,
      precioVenta: 23500,
      stockMinimo: 3,
      proveedor: "Cárnicos Premium",
      ubicacion: "Nevera Carnes",
      imagen:
        "https://via.placeholder.com/300x200/cd853f/white?text=COSTILLA+CERDO",
      descripcion: "Costilla de cerdo fresca, precio por kilogramo",
    },
    "7702039001272": {
      nombre: "Pescado Mojarra por kg",
      categoria: "Pescados y Mariscos",
      precioCompra: 22000,
      precioVenta: 32000,
      stockMinimo: 2,
      proveedor: "Pescadería Marina",
      ubicacion: "Nevera Pescados",
      imagen:
        "https://via.placeholder.com/300x200/4682b4/white?text=MOJARRA",
      descripcion: "Mojarra fresca del río, precio por kilogramo",
    },
    "7702040001273": {
      nombre: "Queso Doble Crema 500g",
      categoria: "Lácteos",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 6,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Quesos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=QUESO+DOBLE+CREMA",
      descripcion: "Queso doble crema colombiano",
    },
    "7702041001274": {
      nombre: "Mantequilla con Sal 250g",
      categoria: "Lácteos",
      precioCompra: 5200,
      precioVenta: 7800,
      stockMinimo: 8,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Mantequilla",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=MANTEQUILLA",
      descripcion: "Mantequilla con sal pasteurizada",
    },
    "7702042001275": {
      nombre: "Huevos AA por 30 unidades",
      categoria: "Lácteos",
      precioCompra: 18500,
      precioVenta: 26500,
      stockMinimo: 3,
      proveedor: "Avícola Nacional",
      ubicacion: "Nevera Huevos",
      imagen:
        "https://via.placeholder.com/300x200/f5f5dc/white?text=HUEVOS+AA",
      descripcion: "Huevos tamaño AA, caja de 30 unidades",
    },
    "7702043001276": {
      nombre: "Pan Integral Bimbo Grande",
      categoria: "Panadería y Repostería",
      precioCompra: 1800,
      precioVenta: 2600,
      stockMinimo: 8,
      proveedor: "Grupo Bimbo",
      ubicacion: "Estante Pan Integral",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=PAN+INTEGRAL",
      descripcion: "Pan integral de trigo entero",
    },
    "7702044001277": {
      nombre: "Torta María Noel 135g",
      categoria: "Chocolates y Dulces",
      precioCompra: 1800,
      precioVenta: 2600,
      stockMinimo: 12,
      proveedor: "Noel",
      ubicacion: "Mostrador Galletas",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=TORTA+MARIA",
      descripcion: "Galletas María clásicas",
    },
    "7702045001278": {
      nombre: "Chocolatina Gol 24g",
      categoria: "Chocolates y Dulces",
      precioCompra: 700,
      precioVenta: 1100,
      stockMinimo: 25,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=CHOCOLATINA+GOL",
      descripcion: "Chocolatina con leche",
    },
    "7702046001279": {
      nombre: "Bombón Jet 12g",
      categoria: "Chocolates y Dulces",
      precioCompra: 400,
      precioVenta: 700,
      stockMinimo: 40,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=BOMBON+JET",
      descripcion: "Bombón de chocolate con leche",
    },
    "7702047001280": {
      nombre: "Helado Popsy 110ml",
      categoria: "Helados y Postres",
      precioCompra: 1200,
      precioVenta: 1800,
      stockMinimo: 20,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Congelador Helados",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=HELADO+POPSY",
      descripcion: "Helado de vainilla en pote pequeño",
    },
    "7702048001281": {
      nombre: "Agua Cristal sin Gas 600ml",
      categoria: "Bebidas",
      precioCompra: 800,
      precioVenta: 1200,
      stockMinimo: 24,
      proveedor: "Postobón",
      ubicacion: "Nevera Aguas",
      imagen:
        "https://via.placeholder.com/300x200/e0ffff/white?text=AGUA+CRISTAL",
      descripcion: "Agua purificada sin gas",
    },
    "7702049001282": {
      nombre: "Jugo Hit Mora 250ml",
      categoria: "Bebidas",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 15,
      proveedor: "Postobón",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/8a2be2/white?text=JUGO+HIT+MORA",
      descripcion: "Jugo de mora 100% natural",
    },
    "7702050001283": {
      nombre: "Cerveza Águila Light 330ml",
      categoria: "Cervezas",
      precioCompra: 2200,
      precioVenta: 3200,
      stockMinimo: 12,
      proveedor: "Bavaria",
      ubicacion: "Nevera Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=CERVEZA+AGUILA",
      descripcion: "Cerveza light colombiana",
    },
    "7702051001284": {
      nombre: "Vino Tinto Cabernet Sauvignon 750ml",
      categoria: "Vinos",
      precioCompra: 25000,
      precioVenta: 38000,
      stockMinimo: 4,
      proveedor: "Importadora Vinos",
      ubicacion: "Estante Vinos",
      imagen:
        "https://via.placeholder.com/300x200/800080/white?text=VINO+TINTO",
      descripcion: "Vino tinto Cabernet Sauvignon chileno",
    },
    "7702052001285": {
      nombre: "Whisky Old Parr 750ml",
      categoria: "Licores",
      precioCompra: 95000,
      precioVenta: 145000,
      stockMinimo: 2,
      proveedor: "Importadora Licores",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=WHISKY+OLD+PARR",
      descripcion: "Whisky escocés 12 años",
    },
    "7702053001286": {
      nombre: "Cigarrillos Marlboro Red 20 unidades",
      categoria: "Tabaco",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 5,
      proveedor: "Tabacalera Nacional",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=MARLBORO+RED",
      descripcion: "Cigarrillos Marlboro sabor original",
    },
    "7702054001287": {
      nombre: "Pañales Huggies XXG 48 unidades",
      categoria: "Bebés",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 3,
      proveedor: "Kimberly-Clark",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ffb6c1/white?text=PANALES+HUGGIES",
      descripcion: "Pañales desechables talla XXG",
    },
    "7702055001288": {
      nombre: "Leche en Polvo Nan 400g",
      categoria: "Bebés",
      precioCompra: 28500,
      precioVenta: 42500,
      stockMinimo: 4,
      proveedor: "Nestlé",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=LECHE+NAN",
      descripcion: "Fórmula láctea para bebés 0-6 meses",
    },
    "7702056001289": {
      nombre: "Shampoo Johnson's Baby 200ml",
      categoria: "Bebés",
      precioCompra: 8500,
      precioVenta: 12500,
      stockMinimo: 6,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=SHAMPOO+BABY",
      descripcion: "Shampoo suave para cabello de bebé",
    },
    "7702057001290": {
      nombre: "Crema Dental Colgate Total 75ml",
      categoria: "Cuidado Personal",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 10,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/00ffff/white?text=CREMA+DENTAL",
      descripcion: "Crema dental con flúor para adultos",
    },
    "7702058001291": {
      nombre: "Desodorante Rexona Men 150ml",
      categoria: "Cuidado Personal",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 8,
      proveedor: "Unilever",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/32cd32/white?text=DESODORANTE+REXONA",
      descripcion: "Desodorante en aerosol para hombres",
    },
    "7702059001292": {
      nombre: "Talco Johnson's Baby 200g",
      categoria: "Cuidado Personal",
      precioCompra: 7200,
      precioVenta: 10800,
      stockMinimo: 7,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=TALCO+BABY",
      descripcion: "Talco para bebés suave y delicado",
    },
    "7702060001293": {
      nombre: "Papel Toalla Familia Jumbo",
      categoria: "Hogar y Limpieza",
      precioCompra: 12500,
      precioVenta: 18500,
      stockMinimo: 4,
      proveedor: "Familia",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/f5f5f5/white?text=PAPEL+TOALLA",
      descripcion: "Papel toalla absorbente jumbo",
    },
    "7702061001294": {
      nombre: "Limpiador Mr. Músculo Lavanda 1L",
      categoria: "Hogar y Limpieza",
      precioCompra: 4800,
      precioVenta: 7200,
      stockMinimo: 6,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/dda0dd/white?text=MR+MUSCULO",
      descripcion: "Limpiador multiusos aroma lavanda",
    },
    "7702062001295": {
      nombre: "Jabón en Polvo Fab 3kg",
      categoria: "Hogar y Limpieza",
      precioCompra: 16800,
      precioVenta: 25200,
      stockMinimo: 3,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=JABON+FAB",
      descripcion: "Jabón en polvo para lavar ropa",
    },
    "7702063001296": {
      nombre: "Cloro Desinfectante 1L",
      categoria: "Hogar y Limpieza",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 10,
      proveedor: "Química Nacional",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/00ff00/white?text=CLORO",
      descripcion: "Cloro desinfectante concentrado",
    },
    "7702064001297": {
      nombre: "Ambientador Glade Lavanda 300ml",
      categoria: "Hogar y Limpieza",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 5,
      proveedor: "SC Johnson",
      ubicacion: "Pasillo Ambientadores",
      imagen:
        "https://via.placeholder.com/300x200/dda0dd/white?text=AMBIENTADOR+GLADE",
      descripcion: "Ambientador en aerosol aroma lavanda",
    },
    "7702065001298": {
      nombre: "Velas Aromáticas 3 unidades",
      categoria: "Hogar y Limpieza",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 8,
      proveedor: "Artesanías Colombianas",
      ubicacion: "Pasillo Ambientadores",
      imagen:
        "https://via.placeholder.com/300x200/ffff99/white?text=VELAS+AROMATICAS",
      descripcion: "Velas aromáticas con esencia de vainilla",
    },
    "7702066001299": {
      nombre: "Baterías AA Alcalinas 4 unidades",
      categoria: "Electrónicos",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 12,
      proveedor: "Electrónica Nacional",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=BATERIAS+AA",
      descripcion: "Baterías alcalinas tamaño AA",
    },
    "7702067001300": {
      nombre: "Bombillos LED 9W E27 Blanco",
      categoria: "Electrónicos",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 15,
      proveedor: "Electrónica Nacional",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=BOMBILLO+LED",
      descripcion: "Bombillo LED blanco frío 9W",
    },
    "7702068001301": {
      nombre: "Extension Eléctrica 5m 3 tomas",
      categoria: "Electrónicos",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 6,
      proveedor: "Electrónica Nacional",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=EXTENSION+ELECTRICA",
      descripcion: "Extensión eléctrica con 3 tomas y protector",
    },
    "7702069001302": {
      nombre: "Audífonos Bluetooth Xiaomi",
      categoria: "Electrónicos",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 3,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=AUDIFONOS+BLUETOOTH",
      descripcion: "Audífonos inalámbricos con micrófono",
    },
    "7702070001303": {
      nombre: "Mouse Óptico USB",
      categoria: "Electrónicos",
      precioCompra: 12000,
      precioVenta: 18000,
      stockMinimo: 8,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/808080/white?text=MOUSE+OPTICO",
      descripcion: "Mouse óptico USB para computadora",
    },
    "7702071001304": {
      nombre: "Teclado USB Español",
      categoria: "Electrónicos",
      precioCompra: 25000,
      precioVenta: 37500,
      stockMinimo: 4,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/808080/white?text=TECLADO+USB",
      descripcion: "Teclado USB con distribución española",
    },
    "7702072001305": {
      nombre: "Memoria USB 32GB",
      categoria: "Electrónicos",
      precioCompra: 22000,
      precioVenta: 33000,
      stockMinimo: 5,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000080/white?text=MEMORIA+USB",
      descripcion: "Memoria USB 3.0 de 32GB",
    },
    "7702073001306": {
      nombre: "Cargador iPhone 20W",
      categoria: "Electrónicos",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 3,
      proveedor: "Apple Store Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CARGADOR+IPHONE",
      descripcion: "Cargador rápido USB-C para iPhone",
    },
    "7702074001307": {
      nombre: "Funda iPhone 13 Pro",
      categoria: "Electrónicos",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 4,
      proveedor: "Apple Store Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=FUNDA+IPHONE",
      descripcion: "Funda de silicona para iPhone 13 Pro",
    },
    "7702075001308": {
      nombre: "Cable USB-C 2m",
      categoria: "Electrónicos",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=CABLE+USB+C",
      descripcion: "Cable USB-C a USB-C de 2 metros",
    },
    "7702076001309": {
      nombre: "Power Bank 10000mAh",
      categoria: "Electrónicos",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 5,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=POWER+BANK",
      descripcion: "Batería externa 10000mAh con carga rápida",
    },
    "7702077001310": {
      nombre: "Auriculares Inalámbricos Sony",
      categoria: "Electrónicos",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 2,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=AURICULARES+SONY",
      descripcion: "Auriculares inalámbricos con cancelación de ruido",
    },
    "7702078001311": {
      nombre: "Smartwatch Xiaomi Mi Band 7",
      categoria: "Electrónicos",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=SMARTWATCH+XIAOMI",
      descripcion: "Smartwatch con monitor de frecuencia cardíaca",
    },
    "7702079001312": {
      nombre: "Tablet Samsung Galaxy Tab A7",
      categoria: "Electrónicos",
      precioCompra: 350000,
      precioVenta: 525000,
      stockMinimo: 1,
      proveedor: "Samsung Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=TABLET+SAMSUNG",
      descripcion: "Tablet Android 10.4 pulgadas",
    },
    "7702080001313": {
      nombre: "Laptop HP 14 pulgadas",
      categoria: "Electrónicos",
      precioCompra: 850000,
      precioVenta: 1280000,
      stockMinimo: 1,
      proveedor: "HP Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=LAPTOP+HP",
      descripcion: "Laptop HP con procesador Intel Core i3",
    },
    "7702081001314": {
      nombre: "Monitor LG 24 pulgadas",
      categoria: "Electrónicos",
      precioCompra: 280000,
      precioVenta: 420000,
      stockMinimo: 1,
      proveedor: "LG Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=MONITOR+LG",
      descripcion: "Monitor LED Full HD 24 pulgadas",
    },
    "7702082001315": {
      nombre: "Impresora Epson EcoTank",
      categoria: "Electrónicos",
      precioCompra: 450000,
      precioVenta: 680000,
      stockMinimo: 1,
      proveedor: "Epson Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=IMPRESORA+EPSON",
      descripcion: "Impresora multifunción con tanque de tinta",
    },
    "7702083001316": {
      nombre: "Router TP-Link AC1200",
      categoria: "Electrónicos",
      precioCompra: 95000,
      precioVenta: 143000,
      stockMinimo: 2,
      proveedor: "TP-Link Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000080/white?text=ROUTER+TP+LINK",
      descripcion: "Router WiFi AC1200 de doble banda",
    },
    "7702084001317": {
      nombre: "Disco Duro Externo 1TB",
      categoria: "Electrónicos",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 3,
      proveedor: "Western Digital",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/808080/white?text=DISCO+DURO",
      descripcion: "Disco duro externo USB 3.0 de 1TB",
    },
    "7702085001318": {
      nombre: "Tarjeta de Memoria MicroSD 64GB",
      categoria: "Electrónicos",
      precioCompra: 25000,
      precioVenta: 37500,
      stockMinimo: 6,
      proveedor: "SanDisk",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=TARJETA+MICROSD",
      descripcion: "Tarjeta de memoria MicroSD Class 10 de 64GB",
    },
    "7702086001319": {
      nombre: "Webcam Logitech HD",
      categoria: "Electrónicos",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Logitech Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=WEBCAM+LOGITECH",
      descripcion: "Webcam HD 1080p con micrófono integrado",
    },
    "7702087001320": {
      nombre: "Parlante Bluetooth JBL Go 3",
      categoria: "Electrónicos",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 4,
      proveedor: "JBL Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=PARLANTE+JBL",
      descripcion: "Parlante portátil Bluetooth con batería de 5 horas",
    },
    "7702088001321": {
      nombre: "Proyector Epson 3000 lúmenes",
      categoria: "Electrónicos",
      precioCompra: 650000,
      precioVenta: 980000,
      stockMinimo: 1,
      proveedor: "Epson Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PROYECTOR+EPSON",
      descripcion: "Proyector LED Full HD 3000 lúmenes",
    },
    "7702089001322": {
      nombre: "Consola Nintendo Switch OLED",
      categoria: "Videojuegos",
      precioCompra: 1200000,
      precioVenta: 1800000,
      stockMinimo: 1,
      proveedor: "Nintendo Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=NINTENDO+SWITCH",
      descripcion: "Consola Nintendo Switch modelo OLED",
    },
    "7702090001323": {
      nombre: "Juego FIFA 23 PS5",
      categoria: "Videojuegos",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "EA Sports",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=JUEGO+FIFA+23",
      descripcion: "Videojuego FIFA 23 para PlayStation 5",
    },
    "7702091001324": {
      nombre: "Control Xbox Wireless",
      categoria: "Videojuegos",
      precioCompra: 150000,
      precioVenta: 225000,
      stockMinimo: 3,
      proveedor: "Microsoft Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/008000/white?text=CONTROL+XBOX",
      descripcion: "Control inalámbrico para Xbox Series X/S",
    },
    "7702092001325": {
      nombre: "Audífonos Gamer HyperX",
      categoria: "Videojuegos",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "HyperX Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=AUDIFONOS+HYPERX",
      descripcion: "Audífonos gamer con micrófono y sonido surround",
    },
    "7702093001326": {
      nombre: "Mouse Gamer Logitech G305",
      categoria: "Videojuegos",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 4,
      proveedor: "Logitech Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=MOUSE+GAMER",
      descripcion: "Mouse gaming inalámbrico ligero",
    },
    "7702094001327": {
      nombre: "Teclado Mecánico RGB",
      categoria: "Videojuegos",
      precioCompra: 250000,
      precioVenta: 375000,
      stockMinimo: 2,
      proveedor: "Razer Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=TECLADO+MECANICO",
      descripcion: "Teclado mecánico gaming con iluminación RGB",
    },
    "7702095001328": {
      nombre: "Silla Gamer Ergonomica",
      categoria: "Videojuegos",
      precioCompra: 650000,
      precioVenta: 980000,
      stockMinimo: 1,
      proveedor: "Importadora Gaming",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=SILLA+GAMER",
      descripcion: "Silla gamer ergonómica con soporte lumbar",
    },
    "7702096001329": {
      nombre: "Monitor Gaming 144Hz",
      categoria: "Videojuegos",
      precioCompra: 450000,
      precioVenta: 680000,
      stockMinimo: 1,
      proveedor: "ASUS Colombia",
      ubicacion: "Mostrador Videojuegos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=MONITOR+GAMING",
      descripcion: "Monitor gaming 27 pulgadas 144Hz QHD",
    },
    "7702097001330": {
      nombre: "Placa de Video RTX 3060",
      categoria: "Computadores",
      precioCompra: 1200000,
      precioVenta: 1800000,
      stockMinimo: 1,
      proveedor: "NVIDIA Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/008000/white?text=RTX+3060",
      descripcion: "Tarjeta gráfica NVIDIA RTX 3060 12GB",
    },
    "7702098001331": {
      nombre: "Procesador AMD Ryzen 5 5600X",
      categoria: "Computadores",
      precioCompra: 350000,
      precioVenta: 525000,
      stockMinimo: 2,
      proveedor: "AMD Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=RYZEN+5+5600X",
      descripcion: "Procesador AMD Ryzen 5 5600X de 6 núcleos",
    },
    "7702099001332": {
      nombre: "Memoria RAM DDR4 16GB",
      categoria: "Computadores",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 3,
      proveedor: "Corsair Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=RAM+DDR4+16GB",
      descripcion: "Módulo de memoria RAM DDR4 3200MHz 16GB",
    },
    "7702100001333": {
      nombre: "SSD NVMe 500GB",
      categoria: "Computadores",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "Samsung Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=SSD+NVME+500GB",
      descripcion: "Disco sólido NVMe de 500GB de lectura rápida",
    },
    "7702101001334": {
      nombre: "Fuente de Poder 650W 80+ Bronze",
      categoria: "Computadores",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 3,
      proveedor: "Corsair Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/808080/white?text=FUENTE+PODER+650W",
      descripcion: "Fuente de poder modular 650W certificación 80+ Bronze",
    },
    "7702102001335": {
      nombre: "Gabinete Gaming RGB",
      categoria: "Computadores",
      precioCompra: 150000,
      precioVenta: 225000,
      stockMinimo: 2,
      proveedor: "Cooler Master",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=GABINETE+GAMING",
      descripcion: "Gabinete gaming mid-tower con iluminación RGB",
    },
    "7702103001336": {
      nombre: "Refrigeración Líquida 240mm",
      categoria: "Computadores",
      precioCompra: 220000,
      precioVenta: 330000,
      stockMinimo: 2,
      proveedor: "Corsair Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=REFRIGERACION+LIQUIDA",
      descripcion: "Sistema de refrigeración líquida 240mm RGB",
    },
    "7702104001337": {
      nombre: "Placa Madre AM4",
      categoria: "Computadores",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "ASUS Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PLACA+MARE+AM4",
      descripcion: "Placa madre AM4 con chipset B450",
    },
    "7702105001338": {
      nombre: "Kit Teclado Mouse Inalámbrico",
      categoria: "Computadores",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 5,
      proveedor: "Logitech Colombia",
      ubicacion: "Mostrador Computadores",
      imagen:
        "https://via.placeholder.com/300x200/808080/white?text=KIT+TECLADO+MOUSE",
      descripcion: "Combo teclado y mouse inalámbrico USB",
    },
    "7702106001339": {
      nombre: "Impresora Láser Monocromática",
      categoria: "Oficina",
      precioCompra: 350000,
      precioVenta: 525000,
      stockMinimo: 1,
      proveedor: "HP Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=IMPRESORA+LASER",
      descripcion: "Impresora láser monocromática para oficina",
    },
    "7702107001340": {
      nombre: "Multifuncional Inkjet",
      categoria: "Oficina",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "Epson Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=MULTIFUNCIONAL",
      descripcion: "Impresora multifuncional inkjet color",
    },
    "7702108001341": {
      nombre: "Papel Bond 75g A4 500 hojas",
      categoria: "Oficina",
      precioCompra: 25000,
      precioVenta: 37500,
      stockMinimo: 6,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PAPEL+BOND+A4",
      descripcion: "Papel bond blanco 75g tamaño carta",
    },
    "7702109001342": {
      nombre: "Archivador Oficio 4 gavetas",
      categoria: "Oficina",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Muebles Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=ARCHIVADOR",
      descripcion: "Archivador metálico 4 gavetas tamaño oficio",
    },
    "7702110001343": {
      nombre: "Silla Ejecutiva Ergonómica",
      categoria: "Oficina",
      precioCompra: 280000,
      precioVenta: 420000,
      stockMinimo: 2,
      proveedor: "Muebles Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=SILLA+EROGONOMICA",
      descripcion: "Silla ejecutiva ergonómica con soporte lumbar",
    },
    "7702111001344": {
      nombre: "Escritorio Ejecutivo 160cm",
      categoria: "Oficina",
      precioCompra: 450000,
      precioVenta: 680000,
      stockMinimo: 1,
      proveedor: "Muebles Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=ESCRITORIO+160CM",
      descripcion: "Escritorio ejecutivo de madera 160cm ancho",
    },
    "7702112001345": {
      nombre: "Cafetera Industrial 12 tazas",
      categoria: "Oficina",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 2,
      proveedor: "Electrodomésticos Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=CAFETERA+INDUSTRIAL",
      descripcion: "Cafetera industrial para oficina 12 tazas",
    },
    "7702113001346": {
      nombre: "Enmicadora Eléctrica",
      categoria: "Oficina",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 4,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=ENMICADORA",
      descripcion: "Enmicadora eléctrica para documentos",
    },
    "7702114001347": {
      nombre: "Perforadora Metálica",
      categoria: "Oficina",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 6,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=PERFORADORA",
      descripcion: "Perforadora metálica para 2-3 hojas",
    },
    "7702115001348": {
      nombre: "Grapadora Eléctrica",
      categoria: "Oficina",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 5,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=GRAPADORA+ELECTRICA",
      descripcion: "Grapadora eléctrica para uso intensivo",
    },
    "7702116001349": {
      nombre: "Marcadores Permanentes Set x12",
      categoria: "Oficina",
      precioCompra: 12000,
      precioVenta: 18000,
      stockMinimo: 8,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=MARCADORES+PERMANENTES",
      descripcion: "Set de 12 marcadores permanentes de colores",
    },
    "7702117001350": {
      nombre: "Cuadernos Universitarios x5",
      categoria: "Oficina",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CUADERNOS+UNIVERSITARIOS",
      descripcion: "Paquete de 5 cuadernos universitarios rayados",
    },
    "7702118001351": {
      nombre: "Bolígrafos BIC Cristal x12",
      categoria: "Oficina",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 15,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=BOLIGRAFOS+BIC",
      descripcion: "Caja de 12 bolígrafos BIC cristal azul",
    },
    "7702119001352": {
      nombre: "Pegamento Barra x6",
      categoria: "Oficina",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 12,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PEGAMENTO+BARRA",
      descripcion: "Paquete de 6 barras de pegamento",
    },
    "7702120001353": {
      nombre: "Cinta Adhesiva Transparente",
      categoria: "Oficina",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 20,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CINTA+ADHESIVA",
      descripcion: "Cinta adhesiva transparente 19mm x 20m",
    },
    "7702121001354": {
      nombre: "Carpeta Archivadora Oficio",
      categoria: "Oficina",
      precioCompra: 1800,
      precioVenta: 2700,
      stockMinimo: 25,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=CARPETA+ARCHIVADORA",
      descripcion: "Carpeta archivadora tamaño oficio",
    },
    "7702122001355": {
      nombre: "Separadores de Colores x12",
      categoria: "Oficina",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 15,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=SEPARADORES+COLORES",
      descripcion: "Separadores de carpeta colores surtidos",
    },
    "7702123001356": {
      nombre: "Calculadora Científica Casio",
      categoria: "Oficina",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 3,
      proveedor: "Casio Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=CALCULADORA+CASIO",
      descripcion: "Calculadora científica Casio FX-991ES Plus",
    },
    "7702124001357": {
      nombre: "Reloj de Pared Digital",
      categoria: "Oficina",
      precioCompra: 25000,
      precioVenta: 37500,
      stockMinimo: 4,
      proveedor: "Relojes Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=RELOJ+PARED+DIGITAL",
      descripcion: "Reloj de pared digital con temperatura",
    },
    "7702125001358": {
      nombre: "Destructora de Papel Fellowes",
      categoria: "Oficina",
      precioCompra: 180000,
      precioVenta: 270000,
      stockMinimo: 2,
      proveedor: "Fellowes Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=DESTRUCTORA+PAPEL",
      descripcion: "Destructora de papel corte cruzado",
    },
    "7702126001359": {
      nombre: "Proyector de Escritorio",
      categoria: "Oficina",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 2,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PROYECTOR+ESCRITORIO",
      descripcion: "Proyector de documentos para escritorio",
    },
    "7702127001360": {
      nombre: "Lampara de Escritorio LED",
      categoria: "Oficina",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 5,
      proveedor: "Iluminación Nacional",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=LAMPARA+ESCRITORIO",
      descripcion: "Lámpara de escritorio LED regulable",
    },
    "7702128001361": {
      nombre: "Ventilador de Torre",
      categoria: "Oficina",
      precioCompra: 95000,
      precioVenta: 143000,
      stockMinimo: 3,
      proveedor: "Electrodomésticos Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=VENTILADOR+TORRE",
      descripcion: "Ventilador de torre silencioso 3 velocidades",
    },
    "7702129001362": {
      nombre: "Purificador de Aire",
      categoria: "Oficina",
      precioCompra: 220000,
      precioVenta: 330000,
      stockMinimo: 2,
      proveedor: "Electrodomésticos Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PURIFICADOR+AIRE",
      descripcion: "Purificador de aire con filtro HEPA",
    },
    "7702130001363": {
      nombre: "Café Molido 500g",
      categoria: "Café e Infusiones",
      precioCompra: 12500,
      precioVenta: 18700,
      stockMinimo: 8,
      proveedor: "Café de Colombia",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CAFE+MOLIDO",
      descripcion: "Café colombiano 100% arábica molido",
    },
    "7702131001364": {
      nombre: "Té Verde en Bolsas x25",
      categoria: "Café e Infusiones",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Tés Gourmet",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/90ee90/white?text=TE+VERDE",
      descripcion: "Té verde orgánico en bolsas individuales",
    },
    "7702132001365": {
      nombre: "Cacao en Polvo 200g",
      categoria: "Café e Infusiones",
      precioCompra: 12000,
      precioVenta: 18000,
      stockMinimo: 6,
      proveedor: "Chocolates Nacionales",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CACAO+POLVO",
      descripcion: "Cacao en polvo puro colombiano",
    },
    "7702133001366": {
      nombre: "Leche Condensada 400g",
      categoria: "Lácteos",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 12,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=LECHE+CONDENSADA",
      descripcion: "Leche condensada azucarada",
    },
    "7702134001367": {
      nombre: "Crema de Leche 200ml",
      categoria: "Lácteos",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 15,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=CREMA+LECHE",
      descripcion: "Crema de leche pasteurizada",
    },
    "7702135001368": {
      nombre: "Queso Campesino por kg",
      categoria: "Lácteos",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 4,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Quesos",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=QUESO+CAMPESINO",
      descripcion: "Queso campesino fresco, precio por kilogramo",
    },
    "7702136001369": {
      nombre: "Yogurt Griego Natural 170g",
      categoria: "Lácteos",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 18,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Nevera Yogurt",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=YOGURT+GRIEGO",
      descripcion: "Yogurt griego natural sin azúcar",
    },
    "7702137001370": {
      nombre: "Mantequilla sin Sal 125g",
      categoria: "Lácteos",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 14,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Mantequilla",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=MANTEQUILLA+SIN+sal",
      descripcion: "Mantequilla sin sal pasteurizada",
    },
    "7702138001371": {
      nombre: "Leche Deslactosada 1L",
      categoria: "Lácteos",
      precioCompra: 2500,
      precioVenta: 3750,
      stockMinimo: 20,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=LECHE+DESLACTOSADA",
      descripcion: "Leche deslactosada baja en lactosa",
    },
    "7702139001372": {
      nombre: "Kumis 1L",
      categoria: "Lácteos",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 12,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fffacd/white?text=KUMIS",
      descripcion: "Kumis fermentado tradicional colombiano",
    },
    "7702140001373": {
      nombre: "Arequipe 250g",
      categoria: "Lácteos",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 10,
      proveedor: "Dulces Nacionales",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=AREQUIPE",
      descripcion: "Arequipe colombiano tradicional",
    },
    "7702141001374": {
      nombre: "Chocolatina Supérate 24g",
      categoria: "Chocolates y Dulces",
      precioCompra: 600,
      precioVenta: 900,
      stockMinimo: 30,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CHOCOLATINA+SUPERATE",
      descripcion: "Chocolatina con leche y mani",
    },
    "7702142001375": {
      nombre: "Galletas Festival Vainilla 135g",
      categoria: "Chocolates y Dulces",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 15,
      proveedor: "Noel",
      ubicacion: "Mostrador Galletas",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=GALLETAS+FESTIVAL",
      descripcion: "Galletas con chips de chocolate vainilla",
    },
    "7702143001376": {
      nombre: "Bom Bom Bum 12g",
      categoria: "Chocolates y Dulces",
      precioCompra: 300,
      precioVenta: 450,
      stockMinimo: 50,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=BOM+BOM+BUM",
      descripcion: "Bombón de chocolate con relleno cremoso",
    },
    "7702144001377": {
      nombre: "Chicles Trident Sabor Menta 18 unidades",
      categoria: "Chocolates y Dulces",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 12,
      proveedor: "Cadbury",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/00ff7f/white?text=CHICLES+TRIDENT",
      descripcion: "Chicles Trident sabor menta fresca",
    },
    "7702145001378": {
      nombre: "Caramelos Halls Menta 34g",
      categoria: "Chocolates y Dulces",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 20,
      proveedor: "Cadbury",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/00ced1/white?text=CARAMELOS+HALLS",
      descripcion: "Caramelos Halls sabor menta para la garganta",
    },
    "7702146001379": {
      nombre: "Gomitas Trululu 100g",
      categoria: "Chocolates y Dulces",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 15,
      proveedor: "Dulces Nacionales",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/ff1493/white?text=GOMITAS+TRULULU",
      descripcion: "Gomitas surtidas de sabores",
    },
    "7702147001380": {
      nombre: "Helado Cornetto Vainilla",
      categoria: "Helados y Postres",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 24,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Congelador Helados",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=HELADO+CORNETTO",
      descripcion: "Helado Cornetto con barquillo vainilla",
    },
    "7702148001381": {
      nombre: "Torta de Tres Leches 500g",
      categoria: "Helados y Postres",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 4,
      proveedor: "Pastelería Nacional",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=TORTA+TRES+LECHES",
      descripcion: "Torta de tres leches tradicional",
    },
    "7702149001382": {
      nombre: "Flan de Caramelo 200g",
      categoria: "Helados y Postres",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 8,
      proveedor: "Postres Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/ffe4b5/white?text=FLAN+CARAMELO",
      descripcion: "Flan de vainilla con caramelo",
    },
    "7702150001383": {
      nombre: "Arroz con Leche 200g",
      categoria: "Helados y Postres",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 10,
      proveedor: "Postres Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=ARROZ+CON+LECHE",
      descripcion: "Arroz con leche tradicional colombiano",
    },
    "7702151001384": {
      nombre: "Natilla 200g",
      categoria: "Helados y Postres",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 12,
      proveedor: "Postres Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=NATILLA",
      descripcion: "Natilla colombiana con canela",
    },
    "7702152001385": {
      nombre: "Mazamorra 200g",
      categoria: "Helados y Postres",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 10,
      proveedor: "Postres Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=MAZAMORRA",
      descripcion: "Mazamorra de maíz tradicional",
    },
    "7702153001386": {
      nombre: "Brevas con Arequipe",
      categoria: "Helados y Postres",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 6,
      proveedor: "Dulces Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=BREVAS+AREQUIPE",
      descripcion: "Brevas encurtidas con arequipe",
    },
    "7702154001387": {
      nombre: "Cocadas Blancas 200g",
      categoria: "Helados y Postres",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 8,
      proveedor: "Dulces Nacionales",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/fffafa/white?text=COCADAS+BLANCAS",
      descripcion: "Cocadas blancas tradicionales",
    },
    "7702155001388": {
      nombre: "Empanadas de Carne x6",
      categoria: "Comidas Preparadas",
      precioCompra: 12000,
      precioVenta: 18000,
      stockMinimo: 5,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=EMPANADAS+CARNE",
      descripcion: "Empanadas de carne molida con arroz",
    },
    "7702156001389": {
      nombre: "Arepa con Queso",
      categoria: "Comidas Preparadas",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 15,
      proveedor: "Panadería Nacional",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=AREPA+QUESO",
      descripcion: "Arepa blanca con queso derretido",
    },
    "7702157001390": {
      nombre: "Tamal Tolimense",
      categoria: "Comidas Preparadas",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 6,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=TAMAL+TOLIMENSE",
      descripcion: "Tamal tolimense con pollo y cerdo",
    },
    "7702158001391": {
      nombre: "Sancocho Trifásico",
      categoria: "Comidas Preparadas",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 4,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=SANCOCHO+TRIFASICO",
      descripcion: "Sancocho con res, pollo y cerdo",
    },
    "7702159001392": {
      nombre: "Ajiaco Santafereño",
      categoria: "Comidas Preparadas",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 5,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=AJIACO+SANTAFERENO",
      descripcion: "Ajiaco bogotano con pollo y mazorca",
    },
    "7702160001393": {
      nombre: "Bandeja Paisa",
      categoria: "Comidas Preparadas",
      precioCompra: 28500,
      precioVenta: 42800,
      stockMinimo: 3,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=BANDEJA+PAISA",
      descripcion: "Bandeja paisa completa con todos los ingredientes",
    },
    "7702161001394": {
      nombre: "Mondongo",
      categoria: "Comidas Preparadas",
      precioCompra: 14500,
      precioVenta: 21800,
      stockMinimo: 4,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=MONDONGO",
      descripcion: "Mondongo antioqueño con verduras",
    },
    "7702162001395": {
      nombre: "Lechona Tolimense por kg",
      categoria: "Comidas Preparadas",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 2,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=LECHONA+TOLIMENSE",
      descripcion: "Lechona tolimense tradicional, precio por kilogramo",
    },
    "7702163001396": {
      nombre: "Chicharrón con Arepa",
      categoria: "Comidas Preparadas",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 6,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=CHICHARRON+AREPA",
      descripcion: "Chicharrón de cerdo con arepa blanca",
    },
    "7702164001397": {
      nombre: "Pinchos de Pollo x8",
      categoria: "Comidas Preparadas",
      precioCompra: 9500,
      precioVenta: 14300,
      stockMinimo: 8,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/cd853f/white?text=PINCHOS+POLLO",
      descripcion: "Pinchos de pollo marinados con verduras",
    },
    "7702165001398": {
      nombre: "Papa Rellena",
      categoria: "Comidas Preparadas",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 10,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=PAPA+RELLENA",
      descripcion: "Papa rellena con carne molida y arroz",
    },
    "7702166001399": {
      nombre: "Pastel de Pollo",
      categoria: "Comidas Preparadas",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 7,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=PASTEL+POLLO",
      descripcion: "Pastel de pollo con verduras",
    },
    "7702167001400": {
      nombre: "Salchipapas Grandes",
      categoria: "Comidas Preparadas",
      precioCompra: 10500,
      precioVenta: 15800,
      stockMinimo: 8,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=SALCHIPAPAS",
      descripcion: "Salchipapas con salchicha, papas y salsas",
    },
    "7702168001401": {
      nombre: "Hamburguesa Sencilla",
      categoria: "Comidas Preparadas",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=HAMBURGUESA+SENCILLA",
      descripcion: "Hamburguesa con carne, lechuga, tomate y queso",
    },
    "7702169001402": {
      nombre: "Perro Caliente Americano",
      categoria: "Comidas Preparadas",
      precioCompra: 7200,
      precioVenta: 10800,
      stockMinimo: 12,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=PERRO+CALIENTE",
      descripcion: "Perro caliente con salchicha, papa y salsas",
    },
    "7702170001403": {
      nombre: "Pizza Personal Jamón y Queso",
      categoria: "Comidas Preparadas",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 6,
      proveedor: "Pizzería Nacional",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ff6347/white?text=PIZZA+JAMON+QUESO",
      descripcion: "Pizza personal con jamón y queso",
    },
    "7702171001404": {
      nombre: "Gaseosa Coca Cola 2.5L",
      categoria: "Bebidas Gaseosas",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 12,
      proveedor: "Coca Cola Company",
      ubicacion: "Nevera Bebidas",
      imagen:
        "https://via.placeholder.com/300x200/dc143c/white?text=COCA+COLA+2.5L",
      descripcion: "Gaseosa Coca Cola botella 2.5 litros",
    },
    "7702172001405": {
      nombre: "Agua Manantial 600ml",
      categoria: "Bebidas",
      precioCompra: 900,
      precioVenta: 1350,
      stockMinimo: 30,
      proveedor: "Agua Pura",
      ubicacion: "Nevera Aguas",
      imagen:
        "https://via.placeholder.com/300x200/e0ffff/white?text=AGUA+MANANTIAL",
      descripcion: "Agua manantial natural 600ml",
    },
    "7702173001406": {
      nombre: "Jugo de Naranja Natural 1L",
      categoria: "Bebidas",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 8,
      proveedor: "Jugos Naturales",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/ffa500/white?text=JUGO+NARANJA",
      descripcion: "Jugo de naranja 100% natural exprimido",
    },
    "7702174001407": {
      nombre: "Limonada Natural 500ml",
      categoria: "Bebidas",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 15,
      proveedor: "Jugos Naturales",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=LIMONADA+NATURAL",
      descripcion: "Limonada natural con hierbabuena",
    },
    "7702175001408": {
      nombre: "Cerveza Poker Light 330ml",
      categoria: "Cervezas",
      precioCompra: 2400,
      precioVenta: 3600,
      stockMinimo: 18,
      proveedor: "Bavaria",
      ubicacion: "Nevera Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=CERVEZA+POKER",
      descripcion: "Cerveza Poker Light colombiana",
    },
    "7702176001409": {
      nombre: "Ron Medellín Añejo 750ml",
      categoria: "Licores",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 2,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=RON+MEDELLIN",
      descripcion: "Ron Medellín añejo 5 años",
    },
    "7702177001410": {
      nombre: "Aguardiente Antioqueño 750ml",
      categoria: "Licores",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 3,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=AGUARDIENTE+ANTIOQUENO",
      descripcion: "Aguardiente Antioqueño tradicional",
    },
    "7702178001411": {
      nombre: "Vino Colombiano Tinto 750ml",
      categoria: "Vinos",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 4,
      proveedor: "Viñedos Colombianos",
      ubicacion: "Estante Vinos",
      imagen:
        "https://via.placeholder.com/300x200/800080/white?text=VINO+COLOMBIANO",
      descripcion: "Vino tinto colombiano Cabernet Sauvignon",
    },
    "7702179001412": {
      nombre: "Cigarrillos Belmont Red 20 unidades",
      categoria: "Tabaco",
      precioCompra: 9500,
      precioVenta: 14300,
      stockMinimo: 6,
      proveedor: "Tabacalera Nacional",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CIGARRILLOS+BELMONT",
      descripcion: "Cigarrillos Belmont sabor original",
    },
    "7702180001413": {
      nombre: "Encendedor Desechable",
      categoria: "Tabaco",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 20,
      proveedor: "Artículos Tabaco",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=ENCENDEDOR",
      descripcion: "Encendedor desechable plástico",
    },
    "7702181001414": {
      nombre: "Filtro para Cigarrillos x100",
      categoria: "Tabaco",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 8,
      proveedor: "Artículos Tabaco",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=FILTROS+CIGARRILLOS",
      descripcion: "Filtros para cigarrillos tamaño king",
    },
    "7702182001415": {
      nombre: "Pañales Pampers XXG 48 unidades",
      categoria: "Bebés",
      precioCompra: 52000,
      precioVenta: 78000,
      stockMinimo: 4,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ffb6c1/white?text=PANALES+PAMPERS",
      descripcion: "Pañales Pampers Swaddlers talla XXG",
    },
    "7702183001416": {
      nombre: "Fórmula Infantil Enfamil 400g",
      categoria: "Bebés",
      precioCompra: 32000,
      precioVenta: 48000,
      stockMinimo: 5,
      proveedor: "Mead Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=FORMULA+INFANTIL",
      descripcion: "Fórmula láctea infantil Enfamil 1",
    },
    "7702184001417": {
      nombre: "Talco Johnson's Baby 400g",
      categoria: "Bebés",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 6,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=TALCO+BABY",
      descripcion: "Talco Johnson's para bebés suave",
    },
    "7702185001418": {
      nombre: "Shampoo Johnson's Baby 750ml",
      categoria: "Bebés",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 5,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=SHAMPOO+BABY+GRANDE",
      descripcion: "Shampoo Johnson's para cabello de bebé",
    },
    "7702186001419": {
      nombre: "Crema para Piel Johnson's Baby 200ml",
      categoria: "Bebés",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 7,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=CREMA+PIEL+BABY",
      descripcion: "Crema hidratante para piel de bebé",
    },
    "7702187001420": {
      nombre: "Toallitas Húmedas Pampers x64",
      categoria: "Bebés",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 8,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/98fb98/white?text=TOALLITAS+HUMEDAS",
      descripcion: "Toallitas húmedas Pampers para bebés",
    },
    "7702188001421": {
      nombre: "Biberón Philips Avent 250ml",
      categoria: "Bebés",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 6,
      proveedor: "Philips",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=BIBERON+PHILIPS",
      descripcion: "Biberón Philips Avent con tetina natural",
    },
    "7702189001422": {
      nombre: "Chupón Philips Avent",
      categoria: "Bebés",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 10,
      proveedor: "Philips",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=CHUPON+PHILIPS",
      descripcion: "Chupón Philips Avent orthodontic",
    },
    "7702190001423": {
      nombre: "Jabón Líquido para Manos 500ml",
      categoria: "Cuidado Personal",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Productos Higiene",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/00ffff/white?text=JABON+MANOS",
      descripcion: "Jabón líquido antibacterial para manos",
    },
    "7702191001424": {
      nombre: "Crema Dental Sensodyne 75ml",
      categoria: "Cuidado Personal",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 8,
      proveedor: "GlaxoSmithKline",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/00ffff/white?text=CREMA+DENTAL+SENSODYNE",
      descripcion: "Crema dental Sensodyne para dientes sensibles",
    },
    "7702192001425": {
      nombre: "Enjuague Bucal Listerine 500ml",
      categoria: "Cuidado Personal",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 6,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/00ced1/white?text=ENJUAGUE+BUCAL",
      descripcion: "Enjuague bucal Listerine Cool Mint",
    },
    "7702193001426": {
      nombre: "Hilo Dental Oral-B 50m",
      categoria: "Cuidado Personal",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 12,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=HILO+DENTAL",
      descripcion: "Hilo dental Oral-B encerado",
    },
    "7702194001427": {
      nombre: "Cepillo Dental Colgate Slim Soft",
      categoria: "Cuidado Personal",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 15,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CEPILLO+DENTAL",
      descripcion: "Cepillo dental Colgate slim soft",
    },
    "7702195001428": {
      nombre: "Desodorante Dove Men 150ml",
      categoria: "Cuidado Personal",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 8,
      proveedor: "Unilever",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/4682b4/white?text=DESODORANTE+DOVE",
      descripcion: "Desodorante Dove Men Care Fresh",
    },
    "7702196001429": {
      nombre: "Jabón de Baño Protex 125g",
      categoria: "Cuidado Personal",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 20,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=JABON+PROTEX",
      descripcion: "Jabón de baño Protex antibacterial",
    },
    "7702197001430": {
      nombre: "Shampoo Head & Shoulders 400ml",
      categoria: "Cuidado Personal",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 6,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/00bfff/white?text=SHAMPOO+HEAD+SHOULDERS",
      descripcion: "Shampoo Head & Shoulders contra caspa",
    },
    "7702198001431": {
      nombre: "Acondicionador Pantene 400ml",
      categoria: "Cuidado Personal",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 7,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=ACONDICIONADOR+PANTENE",
      descripcion: "Acondicionador Pantene Pro-V para cabello dañado",
    },
    "7702199001432": {
      nombre: "Crema Humectante Nivea 200ml",
      categoria: "Cuidado Personal",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 8,
      proveedor: "Beiersdorf",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=CREMA+NIVEA",
      descripcion: "Crema humectante Nivea Soft",
    },
    "7702200001433": {
      nombre: "Protector Solar Neutrogena 120ml",
      categoria: "Cuidado Personal",
      precioCompra: 28500,
      precioVenta: 42800,
      stockMinimo: 5,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Higiene",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=PROTECTOR+SOLAR",
      descripcion: "Protector solar Neutrogena SPF 50",
    },
    "7702201001434": {
      nombre: "Papel Toalla Familia Jumbo 2 rollos",
      categoria: "Hogar y Limpieza",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 5,
      proveedor: "Familia",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/f5f5f5/white?text=PAPEL+TOALLA+JUMBO",
      descripcion: "Papel toalla Familia jumbo 2 rollos",
    },
    "7702202001435": {
      nombre: "Limpiavidrios Mr. Músculo 500ml",
      categoria: "Hogar y Limpieza",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 10,
      proveedor: "Colgate-Palmolive",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/e0ffff/white?text=LIMPIAVIDRIOS",
      descripcion: "Limpiavidrios Mr. Músculo sin rayas",
    },
    "7702203001436": {
      nombre: "Desinfectante Lysol Lavanda 1L",
      categoria: "Hogar y Limpieza",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 6,
      proveedor: "Reckitt Benckiser",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/dda0dd/white?text=DESINFECTANTE+LYSOL",
      descripcion: "Desinfectante Lysol aroma lavanda",
    },
    "7702204001437": {
      nombre: "Jabón en Polvo Ariel 3kg",
      categoria: "Hogar y Limpieza",
      precioCompra: 19500,
      precioVenta: 29300,
      stockMinimo: 4,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=JABON+ARIEL",
      descripcion: "Jabón en polvo Ariel concentrado",
    },
    "7702205001438": {
      nombre: "Suavizante Downy Lavanda 1L",
      categoria: "Hogar y Limpieza",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 5,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=SUAVIZANTE+DOWNY",
      descripcion: "Suavizante Downy aroma lavanda",
    },
    "7702206001439": {
      nombre: "Bolsas de Basura 30L x20",
      categoria: "Hogar y Limpieza",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 8,
      proveedor: "Productos Limpieza",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=BOLSAS+BASURA",
      descripcion: "Bolsas de basura negras tamaño 30L",
    },
    "7702207001440": {
      nombre: "Esponja Scotch-Brite",
      categoria: "Hogar y Limpieza",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 15,
      proveedor: "3M",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/f5f5f5/white?text=ESPONJA+SCOTCH",
      descripcion: "Esponja Scotch-Brite para lavar platos",
    },
    "7702208001441": {
      nombre: "Guantes de Látex Grandes",
      categoria: "Hogar y Limpieza",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 12,
      proveedor: "Productos Limpieza",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=GUANTES+LATEX",
      descripcion: "Guantes de látex desechables talla grande",
    },
    "7702209001442": {
      nombre: "Fibras de Limpieza x10",
      categoria: "Hogar y Limpieza",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 18,
      proveedor: "Productos Limpieza",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=FIBRAS+LIMPIEZA",
      descripcion: "Fibras de microfibra para limpieza",
    },
    "7702210001443": {
      nombre: "Insecticida Raid 300ml",
      categoria: "Hogar y Limpieza",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 7,
      proveedor: "SC Johnson",
      ubicacion: "Pasillo Limpieza",
      imagen:
        "https://via.placeholder.com/300x200/32cd32/white?text=INSECTICIDA+RAID",
      descripcion: "Insecticida Raid en aerosol",
    },
    "7702211001444": {
      nombre: "Velas Eléctricas x6",
      categoria: "Hogar y Limpieza",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 10,
      proveedor: "Productos Hogar",
      ubicacion: "Pasillo Ambientadores",
      imagen:
        "https://via.placeholder.com/300x200/ffff99/white?text=VELAS+ELECTRICAS",
      descripcion: "Velas eléctricas LED con control remoto",
    },
    "7702212001445": {
      nombre: "Difusor de Aromas Automático",
      categoria: "Hogar y Limpieza",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 4,
      proveedor: "Productos Hogar",
      ubicacion: "Pasillo Ambientadores",
      imagen:
        "https://via.placeholder.com/300x200/dda0dd/white?text=DIFUSOR+AROMAS",
      descripcion: "Difusor automático de aromas con recargas",
    },
    "7702213001446": {
      nombre: "Baterías Alcalinas AA x4",
      categoria: "Electrónicos",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 12,
      proveedor: "Energizer",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=BATERIAS+AA+ALKALINAS",
      descripcion: "Baterías alcalinas AA Energizer Max",
    },
    "7702214001447": {
      nombre: "Bombillo LED 9W E27 Blanco Calido",
      categoria: "Electrónicos",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 18,
      proveedor: "Philips",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=BOMBILLO+LED+CALIDO",
      descripcion: "Bombillo LED Philips 9W luz cálida",
    },
    "7702215001448": {
      nombre: "Extension 3 Tomas con USB",
      categoria: "Electrónicos",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 6,
      proveedor: "Importadora Electrónica",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=EXTENSION+USB",
      descripcion: "Extensión con 3 tomas y 2 puertos USB",
    },
    "7702216001449": {
      nombre: "Audífonos Inalámbricos Xiaomi Redmi",
      categoria: "Electrónicos",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 4,
      proveedor: "Xiaomi Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=AUDIFONOS+XIAOMI",
      descripcion: "Audífonos inalámbricos Xiaomi Redmi AirDots",
    },
    "7702217001450": {
      nombre: "Power Bank 20000mAh Xiaomi",
      categoria: "Electrónicos",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Xiaomi Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=POWER+BANK+XIAOMI",
      descripcion: "Batería externa Xiaomi 20000mAh carga rápida",
    },
    "7702218001451": {
      nombre: "Cable USB-C 2m Anker",
      categoria: "Electrónicos",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 8,
      proveedor: "Anker",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=CABLE+USB+C+ANKER",
      descripcion: "Cable USB-C a USB-C Anker PowerLine+ 2m",
    },
    "7702219001452": {
      nombre: "Funda iPhone 13 Silicone MagSafe",
      categoria: "Electrónicos",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 5,
      proveedor: "Apple Store Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/ffb6c1/white?text=FUNDA+IPHONE+13",
      descripcion: "Funda de silicona MagSafe para iPhone 13",
    },
    "7702220001453": {
      nombre: "Cargador Inalámbrico Samsung",
      categoria: "Electrónicos",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 4,
      proveedor: "Samsung Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=CARGADOR+INALAMBRICO",
      descripcion: "Cargador inalámbrico Samsung 15W",
    },
    "7702221001454": {
      nombre: "Smartwatch Xiaomi Mi Band 8",
      categoria: "Electrónicos",
      precioCompra: 120000,
      precioVenta: 180000,
      stockMinimo: 3,
      proveedor: "Xiaomi Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=MI+BAND+8",
      descripcion: "Smartwatch Xiaomi Mi Band 8 con GPS",
    },
    "7702222001455": {
      nombre: "Tablet Samsung Galaxy Tab A8",
      categoria: "Electrónicos",
      precioCompra: 450000,
      precioVenta: 680000,
      stockMinimo: 1,
      proveedor: "Samsung Colombia",
      ubicacion: "Mostrador Electrónicos",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=TABLET+SAMSUNG+A8",
      descripcion: "Tablet Samsung Galaxy Tab A8 10.5 pulgadas",
    },
    "7702223001456": {
      nombre: "Impresora Multifuncional Epson",
      categoria: "Oficina",
      precioCompra: 220000,
      precioVenta: 330000,
      stockMinimo: 2,
      proveedor: "Epson Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=IMPRESORA+EPSON+MULTI",
      descripcion: "Impresora multifuncional Epson EcoTank L3250",
    },
    "7702224001457": {
      nombre: "Papel Bond A4 500 hojas Blancura 92",
      categoria: "Oficina",
      precioCompra: 28500,
      precioVenta: 42800,
      stockMinimo: 5,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PAPEL+BOND+A4+92",
      descripcion: "Papel bond A4 blancura 92 75g",
    },
    "7702225001458": {
      nombre: "Archivador Oficio 3 gavetas",
      categoria: "Oficina",
      precioCompra: 125000,
      precioVenta: 188000,
      stockMinimo: 2,
      proveedor: "Muebles Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=ARCHIVADOR+3+GAVETAS",
      descripcion: "Archivador metálico 3 gavetas tamaño oficio",
    },
    "7702226001459": {
      nombre: "Silla Ejecutiva Giratoria",
      categoria: "Oficina",
      precioCompra: 350000,
      precioVenta: 525000,
      stockMinimo: 1,
      proveedor: "Muebles Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=SILLA+EROGONOMICA+GIRATORIA",
      descripcion: "Silla ejecutiva ergonómica con ajuste de altura",
    },
    "7702227001460": {
      nombre: "Cafetera Industrial 10 tazas Oster",
      categoria: "Oficina",
      precioCompra: 145000,
      precioVenta: 218000,
      stockMinimo: 1,
      proveedor: "Oster",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=CAFETERA+OSTER",
      descripcion: "Cafetera industrial Oster para oficina",
    },
    "7702228001461": {
      nombre: "Enmicadora Fellowes Automática",
      categoria: "Oficina",
      precioCompra: 185000,
      precioVenta: 278000,
      stockMinimo: 1,
      proveedor: "Fellowes Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=ENMICADORA+FELLOWES",
      descripcion: "Enmicadora automática Fellowes Star+",
    },
    "7702229001462": {
      nombre: "Marcadores Permanentes Stabilo x6",
      categoria: "Oficina",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 6,
      proveedor: "Stabilo",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=MARCADORES+STABILO",
      descripcion: "Marcadores permanentes Stabilo Boss colores surtidos",
    },
    "7702230001463": {
      nombre: "Cuadernos Profesionales x3",
      categoria: "Oficina",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 8,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CUADERNOS+PROFESIONALES",
      descripcion: "Cuadernos profesionales rayados tamaño carta",
    },
    "7702231001464": {
      nombre: "Bolígrafos Pilot G2 x12",
      categoria: "Oficina",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 5,
      proveedor: "Pilot",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/0000ff/white?text=BOLIGRAFOS+PILOT+G2",
      descripcion: "Bolígrafos Pilot G2 gel negro",
    },
    "7702232001465": {
      nombre: "Pegamento en Barra Elmer's x6",
      categoria: "Oficina",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Elmer's",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PEGAMENTO+ELMERS",
      descripcion: "Barras de pegamento Elmer's sin lavar",
    },
    "7702233001466": {
      nombre: "Cinta Adhesiva Transparente 19mm x33m",
      categoria: "Oficina",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 15,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CINTA+ADHESIVA+GRANDE",
      descripcion: "Cinta adhesiva transparente dispensador",
    },
    "7702234001467": {
      nombre: "Separadores A-Z + Numéricos",
      categoria: "Oficina",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 8,
      proveedor: "Papeles Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=SEPARADORES+A+Z",
      descripcion: "Separadores de carpeta A-Z más numéricos",
    },
    "7702235001468": {
      nombre: "Calculadora Científica Sharp",
      categoria: "Oficina",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 3,
      proveedor: "Sharp",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=CALCULADORA+SHARP",
      descripcion: "Calculadora científica Sharp EL-W531",
    },
    "7702236001469": {
      nombre: "Reloj de Pared Analógico",
      categoria: "Oficina",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 4,
      proveedor: "Relojes Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=RELOJ+PARED+ANALOGICO",
      descripcion: "Reloj de pared analógico 30cm diámetro",
    },
    "7702237001470": {
      nombre: "Destructora de Papel Rexel",
      categoria: "Oficina",
      precioCompra: 285000,
      precioVenta: 428000,
      stockMinimo: 1,
      proveedor: "Rexel Colombia",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=DESTRUCTORA+REXEL",
      descripcion: "Destructora de papel Rexel Mercury RSS2232",
    },
    "7702238001471": {
      nombre: "Proyector de Documentos",
      categoria: "Oficina",
      precioCompra: 125000,
      precioVenta: 188000,
      stockMinimo: 1,
      proveedor: "Artículos Oficina",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PROYECTOR+DOCUMENTOS",
      descripcion: "Proyector de documentos A3 con luz LED",
    },
    "7702239001472": {
      nombre: "Lámpara de Escritorio LED Philips",
      categoria: "Oficina",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Philips",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=LAMPARA+ESCRITORIO+PHILIPS",
      descripcion: "Lámpara de escritorio LED regulable Philips",
    },
    "7702240001473": {
      nombre: "Ventilador de Escritorio",
      categoria: "Oficina",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 4,
      proveedor: "Electrodomésticos Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/c0c0c0/white?text=VENTILADOR+ESCRITORIO",
      descripcion: "Ventilador de escritorio USB 3 velocidades",
    },
    "7702241001474": {
      nombre: "Purificador de Aire para Oficina",
      categoria: "Oficina",
      precioCompra: 350000,
      precioVenta: 525000,
      stockMinimo: 1,
      proveedor: "Electrodomésticos Nacionales",
      ubicacion: "Mostrador Oficina",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=PURIFICADOR+AIRE+OFICINA",
      descripcion: "Purificador de aire HEPA para espacios medianos",
    },
    "7702242001475": {
      nombre: "Café Instantáneo Nescafé 200g",
      categoria: "Café e Infusiones",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 6,
      proveedor: "Nestlé",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CAFE+NESCAFE",
      descripcion: "Café instantáneo Nescafé clásico",
    },
    "7702243001476": {
      nombre: "Té Negro en Bolsas Lipton x100",
      categoria: "Café e Infusiones",
      precioCompra: 28500,
      precioVenta: 42800,
      stockMinimo: 4,
      proveedor: "Unilever",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/cd853f/white?text=TE+NEGRO+LIPTON",
      descripcion: "Té negro Lipton en bolsas individuales",
    },
    "7702244001477": {
      nombre: "Cacao en Polvo Premium 500g",
      categoria: "Café e Infusiones",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 5,
      proveedor: "Chocolates Nacionales",
      ubicacion: "Pasillo Café",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CACAO+POLVO+PREMIUM",
      descripcion: "Cacao en polvo colombiano premium",
    },
    "7702245001478": {
      nombre: "Leche Condensada La Lechera 400g",
      categoria: "Lácteos",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 12,
      proveedor: "Nestlé",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=LECHE+CONDENSADA+LECHERA",
      descripcion: "Leche condensada La Lechera azucarada",
    },
    "7702246001479": {
      nombre: "Crema de Leche Alquería 500ml",
      categoria: "Lácteos",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 10,
      proveedor: "Alquería",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=CREMA+LECHE+ALQUERIA",
      descripcion: "Crema de leche Alquería pasteurizada",
    },
    "7702247001480": {
      nombre: "Queso Mozzarella por kg",
      categoria: "Lácteos",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 3,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Quesos",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=QUESO+MOZZARELLA",
      descripcion: "Queso mozzarella fresco, precio por kilogramo",
    },
    "7702248001481": {
      nombre: "Yogurt Griego Chobani 170g",
      categoria: "Lácteos",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 15,
      proveedor: "Chobani",
      ubicacion: "Nevera Yogurt",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=YOGURT+GRIEGO+CHOBANI",
      descripcion: "Yogurt griego Chobani natural",
    },
    "7702249001482": {
      nombre: "Mantequilla Rama 250g",
      categoria: "Lácteos",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 10,
      proveedor: "Rama",
      ubicacion: "Nevera Mantequilla",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=MANTEQUILLA+RAMA",
      descripcion: "Mantequilla Rama con sal",
    },
    "7702250001483": {
      nombre: "Leche Deslactosada Parmalat 1L",
      categoria: "Lácteos",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 18,
      proveedor: "Parmalat",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=LECHE+DESLACTOSADA+PARMALAT",
      descripcion: "Leche deslactosada Parmalat baja en lactosa",
    },
    "7702251001484": {
      nombre: "Kumis Alquería 1L",
      categoria: "Lácteos",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 12,
      proveedor: "Alquería",
      ubicacion: "Nevera Lácteos",
      imagen:
        "https://via.placeholder.com/300x200/fffacd/white?text=KUMIS+ALQUERIA",
      descripcion: "Kumis Alquería fermentado tradicional",
    },
    "7702252001485": {
      nombre: "Arequipe Alpina 250g",
      categoria: "Lácteos",
      precioCompra: 7200,
      precioVenta: 10800,
      stockMinimo: 8,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=AREQUIPE+ALPINA",
      descripcion: "Arequipe Alpina tradicional colombiano",
    },
    "7702253001486": {
      nombre: "Chocolatina Hersheys 43g",
      categoria: "Chocolates y Dulces",
      precioCompra: 2200,
      precioVenta: 3300,
      stockMinimo: 20,
      proveedor: "Hershey's",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CHOCOLATINA+HERSHEYS",
      descripcion: "Chocolatina Hershey's Milk Chocolate",
    },
    "7702254001487": {
      nombre: "Galletas Oreo Original 154g",
      categoria: "Chocolates y Dulces",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 10,
      proveedor: "Mondelēz",
      ubicacion: "Mostrador Galletas",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=GALLETAS+OREO",
      descripcion: "Galletas Oreo original con crema",
    },
    "7702255001488": {
      nombre: "Chicles Trident Layers Sabor Tutti Frutti",
      categoria: "Chocolates y Dulces",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 15,
      proveedor: "Cadbury",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=CHICLES+TRIDENT+LAYERS",
      descripcion: "Chicles Trident Layers sabor tutti frutti",
    },
    "7702256001489": {
      nombre: "Caramelos Werther's Original 50g",
      categoria: "Chocolates y Dulces",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 12,
      proveedor: "Storck",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=CARAMELOS+WERTHERS",
      descripcion: "Caramelos Werther's Original butterscotch",
    },
    "7702257001490": {
      nombre: "Gomitas Trolli 100g",
      categoria: "Chocolates y Dulces",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 14,
      proveedor: "Trolli",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/ff1493/white?text=GOMITAS+TROLLI",
      descripcion: "Gomitas Trolli surtidas de sabores",
    },
    "7702258001491": {
      nombre: "Helado Popsy Limón",
      categoria: "Helados y Postres",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 24,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Congelador Helados",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=HELADO+POPSY+LIMON",
      descripcion: "Helado Popsy sabor limón",
    },
    "7702259001492": {
      nombre: "Torta Tres Leches Alpina 500g",
      categoria: "Helados y Postres",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 4,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=TORTA+TRES+LECHES+ALPINA",
      descripcion: "Torta de tres leches Alpina tradicional",
    },
    "7702260001493": {
      nombre: "Flan Napolitano 200g",
      categoria: "Helados y Postres",
      precioCompra: 4800,
      precioVenta: 7200,
      stockMinimo: 10,
      proveedor: "Postres Nacionales",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/ffe4b5/white?text=FLAN+NAPOLITANO",
      descripcion: "Flan napolitano con caramelo",
    },
    "7702261001494": {
      nombre: "Arroz con Leche Alpina 200g",
      categoria: "Helados y Postres",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 12,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=ARROZ+CON+LECHE+ALPINA",
      descripcion: "Arroz con leche Alpina tradicional",
    },
    "7702262001495": {
      nombre: "Natilla Alpina 200g",
      categoria: "Helados y Postres",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 14,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=NATILLA+ALPINA",
      descripcion: "Natilla Alpina con canela",
    },
    "7702263001496": {
      nombre: "Mazamorra Alpina 200g",
      categoria: "Helados y Postres",
      precioCompra: 3500,
      precioVenta: 5200,
      stockMinimo: 12,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=MAZAMORRA+ALPINA",
      descripcion: "Mazamorra Alpina de maíz",
    },
    "7702264001497": {
      nombre: "Brevas con Arequipe Alpina",
      categoria: "Helados y Postres",
      precioCompra: 9500,
      precioVenta: 14300,
      stockMinimo: 6,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Postres",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=BREVAS+AREQUIPE+ALPINA",
      descripcion: "Brevas encurtidas con arequipe Alpina",
    },
    "7702265001498": {
      nombre: "Cocadas Blancas Alpina 200g",
      categoria: "Helados y Postres",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 8,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Mostrador Dulces",
      imagen:
        "https://via.placeholder.com/300x200/fffafa/white?text=COCADAS+BLANCAS+ALPINA",
      descripcion: "Cocadas blancas Alpina tradicionales",
    },
    "7702266001499": {
      nombre: "Empanadas de Carne x10",
      categoria: "Comidas Preparadas",
      precioCompra: 15000,
      precioVenta: 22500,
      stockMinimo: 4,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=EMPANADAS+CARNE+X10",
      descripcion: "Empanadas de carne molida con arroz x10 unidades",
    },
    "7702267001500": {
      nombre: "Arepa con Queso y Huevo",
      categoria: "Comidas Preparadas",
      precioCompra: 4500,
      precioVenta: 6800,
      stockMinimo: 12,
      proveedor: "Panadería Nacional",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=AREPA+QUESO+HUEVO",
      descripcion: "Arepa blanca con queso derretido y huevo",
    },
    "7702268001501": {
      nombre: "Tamal Santafereño",
      categoria: "Comidas Preparadas",
      precioCompra: 12000,
      precioVenta: 18000,
      stockMinimo: 5,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=TAMAL+SANTAFERENO",
      descripcion: "Tamal santafereño con pollo y cerdo",
    },
    "7702269001502": {
      nombre: "Sancocho de Gallina",
      categoria: "Comidas Preparadas",
      precioCompra: 22000,
      precioVenta: 33000,
      stockMinimo: 3,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=SANCOCHO+GALLINA",
      descripcion: "Sancocho de gallina con verduras",
    },
    "7702270001503": {
      nombre: "Ajiaco Bogotano Completo",
      categoria: "Comidas Preparadas",
      precioCompra: 19500,
      precioVenta: 29300,
      stockMinimo: 4,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=AJIACO+BOGOTANO",
      descripcion: "Ajiaco bogotano con pollo, mazorca y guascas",
    },
    "7702271001504": {
      nombre: "Bandeja Paisa Mini",
      categoria: "Comidas Preparadas",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 5,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=BANDEJA+PAISA+MINI",
      descripcion: "Bandeja paisa mini con porción pequeña",
    },
    "7702272001505": {
      nombre: "Mondongo Santafereño",
      categoria: "Comidas Preparadas",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 4,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=MONDONGO+SANTAFERENO",
      descripcion: "Mondongo santafereño con verduras",
    },
    "7702273001506": {
      nombre: "Lechona Tolimense 1/2 kg",
      categoria: "Comidas Preparadas",
      precioCompra: 25000,
      precioVenta: 37500,
      stockMinimo: 3,
      proveedor: "Comidas Tradicionales",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=LECHONA+TOLIMENSE+MEDIO",
      descripcion: "Lechona tolimense 1/2 kilogramo",
    },
    "7702274001507": {
      nombre: "Chicharrón con Hogao",
      categoria: "Comidas Preparadas",
      precioCompra: 14500,
      precioVenta: 21800,
      stockMinimo: 6,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=CHICHARRON+HOGAO",
      descripcion: "Chicharrón de cerdo con hogao",
    },
    "7702275001508": {
      nombre: "Pinchos de Pollo x12",
      categoria: "Comidas Preparadas",
      precioCompra: 13500,
      precioVenta: 20300,
      stockMinimo: 6,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/cd853f/white?text=PINCHOS+POLLO+X12",
      descripcion: "Pinchos de pollo marinados x12 unidades",
    },
    "7702276001509": {
      nombre: "Papa Rellena con Carne",
      categoria: "Comidas Preparadas",
      precioCompra: 7500,
      precioVenta: 11300,
      stockMinimo: 8,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f4a460/white?text=PAPA+RELLENA+CARNE",
      descripcion: "Papa rellena con carne molida y arroz",
    },
    "7702277001510": {
      nombre: "Pastel de Pollo Grande",
      categoria: "Comidas Preparadas",
      precioCompra: 10500,
      precioVenta: 15800,
      stockMinimo: 6,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=PASTEL+POLLO+GRANDE",
      descripcion: "Pastel de pollo grande con verduras",
    },
    "7702278001511": {
      nombre: "Salchipapas Familiares",
      categoria: "Comidas Preparadas",
      precioCompra: 13500,
      precioVenta: 20300,
      stockMinimo: 6,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=SALCHIPAPAS+FAMILIARES",
      descripcion: "Salchipapas familiares con doble porción",
    },
    "7702279001512": {
      nombre: "Hamburguesa Especial",
      categoria: "Comidas Preparadas",
      precioCompra: 10500,
      precioVenta: 15800,
      stockMinimo: 8,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=HAMBURGUESA+ESPECIAL",
      descripcion: "Hamburguesa con carne, queso, tocineta y vegetales",
    },
    "7702280001513": {
      nombre: "Perro Caliente Especial",
      categoria: "Comidas Preparadas",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 10,
      proveedor: "Comidas Rápidas",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=PERRO+CALIENTE+ESPECIAL",
      descripcion: "Perro caliente con salchicha, papa, queso y salsas",
    },
    "7702281001514": {
      nombre: "Pizza Personal Pepperoni",
      categoria: "Comidas Preparadas",
      precioCompra: 14500,
      precioVenta: 21800,
      stockMinimo: 5,
      proveedor: "Pizzería Nacional",
      ubicacion: "Mostrador Caliente",
      imagen:
        "https://via.placeholder.com/300x200/ff6347/white?text=PIZZA+PEPPERONI",
      descripcion: "Pizza personal con pepperoni y queso",
    },
    "7702282001515": {
      nombre: "Gaseosa Coca Cola 3L",
      categoria: "Bebidas Gaseosas",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 10,
      proveedor: "Coca Cola Company",
      ubicacion: "Nevera Bebidas",
      imagen:
        "https://via.placeholder.com/300x200/dc143c/white?text=COCA+COLA+3L",
      descripcion: "Gaseosa Coca Cola botella 3 litros",
    },
    "7702283001516": {
      nombre: "Agua Manantial 1.5L",
      categoria: "Bebidas",
      precioCompra: 1200,
      precioVenta: 1800,
      stockMinimo: 20,
      proveedor: "Agua Pura",
      ubicacion: "Nevera Aguas",
      imagen:
        "https://via.placeholder.com/300x200/e0ffff/white?text=AGUA+MANANTIAL+1.5L",
      descripcion: "Agua manantial natural 1.5 litros",
    },
    "7702284001517": {
      nombre: "Jugo de Naranja Natural 2L",
      categoria: "Bebidas",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 6,
      proveedor: "Jugos Naturales",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/ffa500/white?text=JUGO+NARANJA+2L",
      descripcion: "Jugo de naranja 100% natural 2 litros",
    },
    "7702285001518": {
      nombre: "Limonada Natural 1L",
      categoria: "Bebidas",
      precioCompra: 5500,
      precioVenta: 8300,
      stockMinimo: 10,
      proveedor: "Jugos Naturales",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=LIMONADA+NATURAL+1L",
      descripcion: "Limonada natural con hierbabuena 1 litro",
    },
    "7702286001519": {
      nombre: "Cerveza Águila Light 473ml",
      categoria: "Cervezas",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 15,
      proveedor: "Bavaria",
      ubicacion: "Nevera Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=CERVEZA+AGUILA+473ML",
      descripcion: "Cerveza Águila Light botella 473ml",
    },
    "7702287001520": {
      nombre: "Ron Medellín Añejo 375ml",
      categoria: "Licores",
      precioCompra: 55000,
      precioVenta: 83000,
      stockMinimo: 4,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=RON+MEDELLIN+375ML",
      descripcion: "Ron Medellín añejo botella 375ml",
    },
    "7702288001521": {
      nombre: "Aguardiente Antioqueño 375ml",
      categoria: "Licores",
      precioCompra: 42000,
      precioVenta: 63000,
      stockMinimo: 5,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=AGUARDIENTE+ANTIOQUENO+375ML",
      descripcion: "Aguardiente Antioqueño botella 375ml",
    },
    "7702289001522": {
      nombre: "Vino Colombiano Rosado 750ml",
      categoria: "Vinos",
      precioCompra: 38000,
      precioVenta: 57000,
      stockMinimo: 3,
      proveedor: "Viñedos Colombianos",
      ubicacion: "Estante Vinos",
      imagen:
        "https://via.placeholder.com/300x200/ffb6c1/white?text=VINO+COLOMBIANO+ROSADO",
      descripcion: "Vino rosado colombiano Cabernet Franc",
    },
    "7702290001523": {
      nombre: "Cigarrillos Belmont Blue 20 unidades",
      categoria: "Tabaco",
      precioCompra: 10500,
      precioVenta: 15800,
      stockMinimo: 6,
      proveedor: "Tabacalera Nacional",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=CIGARRILLOS+BELMONT+BLUE",
      descripcion: "Cigarrillos Belmont Blue sabor mentolado",
    },
    "7702291001524": {
      nombre: "Encendedor Bic Grande",
      categoria: "Tabaco",
      precioCompra: 2500,
      precioVenta: 3800,
      stockMinimo: 15,
      proveedor: "Artículos Tabaco",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ff0000/white?text=ENCENDEDOR+BIC+GRANDE",
      descripcion: "Encendedor Bic desechable grande",
    },
    "7702292001525": {
      nombre: "Filtro para Cigarrillos x200",
      categoria: "Tabaco",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 5,
      proveedor: "Artículos Tabaco",
      ubicacion: "Mostrador Tabaco",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=FILTROS+CIGARRILLOS+X200",
      descripcion: "Filtros para cigarrillos tamaño king x200 unidades",
    },
    "7702293001526": {
      nombre: "Pañales Pampers Super Pack XXG",
      categoria: "Bebés",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 3,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ffb6c1/white?text=PANALES+PAMPERS+SUPER+PACK",
      descripcion: "Pañales Pampers Swaddlers XXG super pack",
    },
    "7702294001527": {
      nombre: "Fórmula Infantil Nan 800g",
      categoria: "Bebés",
      precioCompra: 45000,
      precioVenta: 68000,
      stockMinimo: 4,
      proveedor: "Nestlé",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=FORMULA+INFANTIL+NAN+800G",
      descripcion: "Fórmula láctea infantil Nan 3 800g",
    },
    "7702295001528": {
      nombre: "Talco Johnson's Baby 200g",
      categoria: "Bebés",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 8,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/e6e6fa/white?text=TALCO+BABY+200G",
      descripcion: "Talco Johnson's para bebés suave 200g",
    },
    "7702296001529": {
      nombre: "Shampoo Johnson's Baby 400ml",
      categoria: "Bebés",
      precioCompra: 16500,
      precioVenta: 24800,
      stockMinimo: 6,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/87ceeb/white?text=SHAMPOO+BABY+400ML",
      descripcion: "Shampoo Johnson's para cabello de bebé 400ml",
    },
    "7702297001530": {
      nombre: "Crema para Piel Johnson's Baby 100ml",
      categoria: "Bebés",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 10,
      proveedor: "Johnson & Johnson",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=CREMA+PIEL+BABY+100ML",
      descripcion: "Crema hidratante Johnson's para piel de bebé",
    },
    "7702298001531": {
      nombre: "Toallitas Húmedas Pampers x80",
      categoria: "Bebés",
      precioCompra: 19500,
      precioVenta: 29300,
      stockMinimo: 6,
      proveedor: "Procter & Gamble",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/98fb98/white?text=TOALLITAS+HUMEDAS+PAMPERS+X80",
      descripcion: "Toallitas húmedas Pampers para bebés x80 unidades",
    },
    "7702299001532": {
      nombre: "Biberón Philips Avent 330ml",
      categoria: "Bebés",
      precioCompra: 42000,
      precioVenta: 63000,
      stockMinimo: 5,
      proveedor: "Philips",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ffffff/white?text=BIBERON+PHILIPS+330ML",
      descripcion: "Biberón Philips Avent con tetina natural 330ml",
    },
    "7702300001533": {
      nombre: "Chupón Philips Avent 6-18m",
      categoria: "Bebés",
      precioCompra: 22500,
      precioVenta: 33800,
      stockMinimo: 8,
      proveedor: "Philips",
      ubicacion: "Pasillo Bebés",
      imagen:
        "https://via.placeholder.com/300x200/ff69b4/white?text=CHUPON+PHILIPS+6-18M",
      descripcion: "Chupón Philips Avent orthodontic 6-18 meses",
    },
    "7801610880104": {
      nombre: "Cerveza Águila Light 330ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 2200,
      precioVenta: 3200,
      stockMinimo: 12,
      proveedor: "Bavaria",
      ubicacion: "Nevera - Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=CERVEZA+AGUILA+LIGHT",
      descripcion: "Cerveza light colombiana, botella de 330ml, 4.2% alcohol",
    },
    "7702301001534": {
      nombre: "Cerveza Poker 330ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 2000,
      precioVenta: 2900,
      stockMinimo: 15,
      proveedor: "Bavaria",
      ubicacion: "Nevera - Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=CERVEZA+POKER",
      descripcion: "Cerveza pilsen colombiana, botella de 330ml",
    },
    "7702302001535": {
      nombre: "Cerveza Club Colombia Dorada 330ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 2100,
      precioVenta: 3100,
      stockMinimo: 12,
      proveedor: "Bavaria",
      ubicacion: "Nevera - Cervezas",
      imagen:
        "https://via.placeholder.com/300x200/gold/white?text=CERVEZA+CLUB+DORADA",
      descripcion: "Cerveza dorada colombiana, botella de 330ml",
    },
    "7702303001536": {
      nombre: "Aguardiente Antioqueño 750ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 65000,
      precioVenta: 98000,
      stockMinimo: 4,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/daa520/white?text=AGUARDIENTE+ANTIOQUENO+750ML",
      descripcion: "Aguardiente Antioqueño botella 750ml, 29% alcohol",
    },
    "7702304001537": {
      nombre: "Ron Medellín Añejo 750ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 85000,
      precioVenta: 128000,
      stockMinimo: 3,
      proveedor: "Licorera Colombiana",
      ubicacion: "Estante Licores",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=RON+MEDELLIN+ANEJO",
      descripcion: "Ron Medellín Añejo botella 750ml, 40% alcohol",
    },
    "7702305001538": {
      nombre: "Vino Colombiano Tinto 750ml",
      categoria: "Bebidas Alcohólicas",
      precioCompra: 35000,
      precioVenta: 52500,
      stockMinimo: 5,
      proveedor: "Viñedos Colombianos",
      ubicacion: "Estante Vinos",
      imagen:
        "https://via.placeholder.com/300x200/800080/white?text=VINO+COLOMBIANO+TINTO",
      descripcion: "Vino tinto colombiano Cabernet Sauvignon 750ml",
    },
    "7702306001539": {
      nombre: "Panela en Raspadura 500g",
      categoria: "Endulzantes",
      precioCompra: 1800,
      precioVenta: 2700,
      stockMinimo: 20,
      proveedor: "Paneleros del Valle",
      ubicacion: "Pasillo A - Estante 8",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=PANELA+RASPADURA",
      descripcion: "Panela orgánica en raspadura tradicional",
    },
    "7702307001540": {
      nombre: "Café Juan Valdez Premium 250g",
      categoria: "Café e Infusiones",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 8,
      proveedor: "Juan Valdez Café",
      ubicacion: "Pasillo C - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CAFE+JUAN+VALDEZ+PREMIUM",
      descripcion: "Café colombiano premium 100% arábica tostado medio",
    },
    "7702308001541": {
      nombre: "Chocolate en Barra CasaLuker 100g",
      categoria: "Chocolates y Dulces",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 15,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Chocolates",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CHOCOLATE+CASALUKER",
      descripcion: "Chocolate negro 70% cacao colombiano",
    },
    "7702309001542": {
      nombre: "Galletas Saltín Noel 270g",
      categoria: "Chocolates y Dulces",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 12,
      proveedor: "Noel",
      ubicacion: "Mostrador Galletas",
      imagen:
        "https://via.placeholder.com/300x200/d2691e/white?text=GALLETAS+SALTIN+270G",
      descripcion: "Galletas saladas crackers Noel 270g",
    },
    "7702310001543": {
      nombre: "Salsa de Tomate Fruco 500g",
      categoria: "Pastas y Salsas",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 18,
      proveedor: "Fruco",
      ubicacion: "Pasillo E - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/dc143c/white?text=SALSA+FRUCO+500G",
      descripcion: "Salsa de tomate natural Fruco 500g",
    },
    "7702311001544": {
      nombre: "Pasta Doria Spaghetti 1kg",
      categoria: "Pastas y Salsas",
      precioCompra: 2500,
      precioVenta: 3800,
      stockMinimo: 12,
      proveedor: "Pasta Doria",
      ubicacion: "Pasillo E - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=PASTA+DORIA+1KG",
      descripcion: "Pasta spaghetti de trigo durum 1kg",
    },
    "7702312001545": {
      nombre: "Atún Van Camps en Agua 170g x3",
      categoria: "Enlatados y Conservas",
      precioCompra: 9500,
      precioVenta: 14300,
      stockMinimo: 6,
      proveedor: "Starkist",
      ubicacion: "Pasillo D - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/4682b4/white?text=ATUN+VAN+CAMPS+X3",
      descripcion: "Pack de 3 latas de atún en agua 170g cada una",
    },
    "7702313001546": {
      nombre: "Leche Condensada Alpina 400g",
      categoria: "Lácteos",
      precioCompra: 5200,
      precioVenta: 7800,
      stockMinimo: 10,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Pasillo K - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=LECHE+CONDENSADA+ALPINA",
      descripcion: "Leche condensada Alpina azucarada 400g",
    },
    "7702314001547": {
      nombre: "Yogurt Griego Alpina 170g",
      categoria: "Lácteos",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 20,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Nevera Yogurt",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=YOGURT+GRIEGO+ALPINA",
      descripcion: "Yogurt griego Alpina natural sin azúcar",
    },
    "7702315001548": {
      nombre: "Queso Campesino por kg",
      categoria: "Lácteos",
      precioCompra: 19500,
      precioVenta: 29300,
      stockMinimo: 4,
      proveedor: "Lácteos del Valle",
      ubicacion: "Nevera Quesos",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=QUESO+CAMPESINO+KG",
      descripcion: "Queso campesino fresco colombiano por kilogramo",
    },
    "7702316001549": {
      nombre: "Mantequilla Colanta sin Sal 250g",
      categoria: "Lácteos",
      precioCompra: 6800,
      precioVenta: 10200,
      stockMinimo: 8,
      proveedor: "Colanta",
      ubicacion: "Nevera Mantequilla",
      imagen:
        "https://via.placeholder.com/300x200/ffffe0/white?text=MANTEQUILLA+COLANTA",
      descripcion: "Mantequilla Colanta sin sal pasteurizada",
    },
    "7702317001550": {
      nombre: "Helado Popsy Vainilla 110ml",
      categoria: "Helados y Postres",
      precioCompra: 1200,
      precioVenta: 1800,
      stockMinimo: 25,
      proveedor: "Alpina Productos Alimenticios",
      ubicacion: "Congelador Helados",
      imagen:
        "https://via.placeholder.com/300x200/ffff00/white?text=HELADO+POPSY+VAINILLA",
      descripcion: "Helado Popsy sabor vainilla en pote pequeño",
    },
    "7702318001551": {
      nombre: "Torta María Noel 270g",
      categoria: "Chocolates y Dulces",
      precioCompra: 2800,
      precioVenta: 4200,
      stockMinimo: 15,
      proveedor: "Noel",
      ubicacion: "Mostrador Galletas",
      imagen:
        "https://via.placeholder.com/300x200/f0e68c/white?text=TORTA+MARIA+270G",
      descripcion: "Galletas María Noel 270g paquete familiar",
    },
    "7702319001552": {
      nombre: "Chocolatina Jet Negro 100g",
      categoria: "Chocolates y Dulces",
      precioCompra: 3800,
      precioVenta: 5700,
      stockMinimo: 12,
      proveedor: "Casa Luker",
      ubicacion: "Mostrador Chocolates",
      imagen:
        "https://via.placeholder.com/300x200/8b0000/white?text=CHOCOLATINA+JET+NEGRO",
      descripcion: "Chocolatina Jet negro 70% cacao",
    },
    "7702320001553": {
      nombre: "Gaseosa Postobón Manzana 400ml",
      categoria: "Bebidas Gaseosas",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 20,
      proveedor: "Postobón",
      ubicacion: "Nevera Bebidas",
      imagen:
        "https://via.placeholder.com/300x200/ff4500/white?text=POSTOBON+MANZANA+400ML",
      descripcion: "Gaseosa Postobón sabor manzana lata 400ml",
    },
    "7702321001554": {
      nombre: "Jugo Hit Mora 250ml x6",
      categoria: "Bebidas",
      precioCompra: 13500,
      precioVenta: 20300,
      stockMinimo: 4,
      proveedor: "Postobón",
      ubicacion: "Nevera Jugos",
      imagen:
        "https://via.placeholder.com/300x200/8a2be2/white?text=JUGO+HIT+MORA+X6",
      descripcion: "Pack de 6 jugos Hit mora 250ml cada uno",
    },
    "7702322001555": {
      nombre: "Agua Cristal con Gas 600ml",
      categoria: "Bebidas",
      precioCompra: 1000,
      precioVenta: 1500,
      stockMinimo: 24,
      proveedor: "Postobón",
      ubicacion: "Nevera Aguas",
      imagen:
        "https://via.placeholder.com/300x200/e0ffff/white?text=AGUA+CRISTAL+GAS",
      descripcion: "Agua Cristal con gas botella 600ml",
    },
    "7702323001556": {
      nombre: "Cereal Corn Flakes Kelloggs 750g",
      categoria: "Cereales y Desayunos",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 6,
      proveedor: "Kellogg's",
      ubicacion: "Pasillo I - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/ffdab9/white?text=CORN+FLAKES+750G",
      descripcion: "Cereal Corn Flakes Kelloggs caja familiar 750g",
    },
    "7702324001557": {
      nombre: "Miel de Abeja Colombiana 500g",
      categoria: "Endulzantes",
      precioCompra: 12500,
      precioVenta: 18800,
      stockMinimo: 5,
      proveedor: "Apicultores Unidos",
      ubicacion: "Pasillo A - Estante 6",
      imagen:
        "https://via.placeholder.com/300x200/ffd700/white?text=MIEL+ABEJA+COLOMBIANA",
      descripcion: "Miel de abeja pura 100% colombiana",
    },
    "7702325001558": {
      nombre: "Vinagre de Manzana Orgánico 500ml",
      categoria: "Aceites y Vinagres",
      precioCompra: 4800,
      precioVenta: 7200,
      stockMinimo: 8,
      proveedor: "Productos Orgánicos",
      ubicacion: "Pasillo B - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/f0f8ff/white?text=VINAGRE+MANZANA+ORGANICO",
      descripcion: "Vinagre de manzana orgánico sin filtrar",
    },
    "7702326001559": {
      nombre: "Aceite de Coco Virgen 500ml",
      categoria: "Aceites y Vinagres",
      precioCompra: 18500,
      precioVenta: 27800,
      stockMinimo: 4,
      proveedor: "Productos Naturales",
      ubicacion: "Pasillo B - Estante 5",
      imagen:
        "https://via.placeholder.com/300x200/fff8dc/white?text=ACEITE+COCO+VIRGEN",
      descripcion: "Aceite de coco virgen extraído en frío",
    },
    "7702327001560": {
      nombre: "Sal Marina Refinada 1kg",
      categoria: "Condimentos y Especias",
      precioCompra: 1500,
      precioVenta: 2200,
      stockMinimo: 15,
      proveedor: "Salinas del Caribe",
      ubicacion: "Pasillo I - Estante 1",
      imagen:
        "https://via.placeholder.com/300x200/f5f5f5/white?text=SAL+MARINA+1KG",
      descripcion: "Sal marina refinada yodada paquete 1kg",
    },
    "7702328001561": {
      nombre: "Pimienta Negra Molida Premium 100g",
      categoria: "Condimentos y Especias",
      precioCompra: 6500,
      precioVenta: 9800,
      stockMinimo: 10,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 2",
      imagen:
        "https://via.placeholder.com/300x200/000000/white?text=PIMIENTA+NEGRA+PREMIUM",
      descripcion: "Pimienta negra molida premium calidad gourmet",
    },
    "7702329001562": {
      nombre: "Cúrcuma en Polvo Orgánica 200g",
      categoria: "Condimentos y Especias",
      precioCompra: 8500,
      precioVenta: 12800,
      stockMinimo: 8,
      proveedor: "Especias Orgánicas",
      ubicacion: "Pasillo I - Estante 3",
      imagen:
        "https://via.placeholder.com/300x200/ffa500/white?text=CURCUMA+ORGANICA",
      descripcion: "Cúrcuma en polvo orgánica certificada",
    },
    "7702330001563": {
      nombre: "Ajo Granulado 200g",
      categoria: "Condimentos y Especias",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 12,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 4",
      imagen:
        "https://via.placeholder.com/300x200/f5deb3/white?text=AJO+GRANULADO",
      descripcion: "Ajo deshidratado granulado premium",
    },
    "7702331001564": {
      nombre: "Orégano Mediterráneo 50g",
      categoria: "Condimentos y Especias",
      precioCompra: 4200,
      precioVenta: 6300,
      stockMinimo: 15,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 5",
      imagen:
        "https://via.placeholder.com/300x200/228b22/white?text=OREGANO+ITALIANO",
      descripcion: "Orégano mediterráneo seco premium",
    },
    "7702332001565": {
      nombre: "Laurel en Hojas Premium 20g",
      categoria: "Condimentos y Especias",
      precioCompra: 3200,
      precioVenta: 4800,
      stockMinimo: 18,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 6",
      imagen:
        "https://via.placeholder.com/300x200/32cd32/white?text=LAUREL+PREMIUM",
      descripcion: "Hojas de laurel secas premium calidad",
    },
    "7702333001566": {
      nombre: "Comino Molido Premium 100g",
      categoria: "Condimentos y Especias",
      precioCompra: 4800,
      precioVenta: 7200,
      stockMinimo: 12,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 7",
      imagen:
        "https://via.placeholder.com/300x200/a0522d/white?text=COMINO+MOLIDO+PREMIUM",
      descripcion: "Comino molido premium calidad gourmet",
    },
    "7702334001567": {
      nombre: "Canela en Rama Ceilán 50g",
      categoria: "Condimentos y Especias",
      precioCompra: 5800,
      precioVenta: 8700,
      stockMinimo: 10,
      proveedor: "Especias Gourmet",
      ubicacion: "Pasillo I - Estante 8",
      imagen:
        "https://via.placeholder.com/300x200/8b4513/white?text=CANELA+RAMA+CEILAN",
      descripcion: "Canela ceilan en rama premium calidad",
    },
  };

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    setCodeReader(reader);
    verificarPermisos();

    return () => {
      reader.reset();
    };
  }, []);

  useEffect(() => {
    if (isActive && codeReader && permisosCamara) {
      iniciarEscaneo();
    } else {
      detenerEscaneo();
    }

    return () => detenerEscaneo();
  }, [isActive, codeReader, dispositivoSeleccionado, permisosCamara]);

  const verificarPermisos = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermisosCamara(true);
      await cargarDispositivos();
    } catch (error) {
      console.error("Sin permisos de cámara:", error);
      setPermisosCamara(false);
      setError(
        "Se requieren permisos de cámara para escanear códigos de barras"
      );
    }
  };

  const cargarDispositivos = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      setDispositivos(videoInputDevices);

      if (videoInputDevices.length > 0) {
        // Priorizar cámara trasera en móviles
        const camaraTrasera = videoInputDevices.find(
          (device: MediaDeviceInfo) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("rear") ||
            device.label.toLowerCase().includes("environment")
        );

        setDispositivoSeleccionado(
          camaraTrasera ? camaraTrasera.deviceId : videoInputDevices[0].deviceId
        );
      }
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
      setError("Error al acceder a las cámaras disponibles");
    }
  };

  const procesarCodigoEscaneado = (codigo: string) => {
    console.log("🔍 Procesando código:", codigo);
    setUltimoEscaneo(codigo);

    const productoExistente = productos.find((p) => p.codigoBarras === codigo);

    if (productoExistente) {
      console.log("✅ Producto encontrado en inventario:", productoExistente.nombre);
      setProductoEncontrado(productoExistente);

      if (onProductoEncontrado) {
        onProductoEncontrado(productoExistente);
      }
    } else {
      setProductoEncontrado({
        id: Date.now(),
        nombre: `Buscando producto ${codigo.slice(-6)}`,
        codigoBarras: codigo,
        categoria: "Buscando...",
        stock: 0,
        precioCompra: 0,
        precioVenta: 0,
        margen: 0,
        proveedor: "Buscando...",
        proveedorId: 0,
        ubicacion: "Por definir",
        descripcion: "Consultando la base de datos pública de productos...",
        estado: "activo",
        fechaCreacion: new Date().toISOString(),
        ultimaActualizacion: new Date().toISOString(),
      });

      buscarProductoEnAPI(codigo);
    }

    onScan(codigo);
  };

  const buscarProductoEnAPI = async (codigo: string) => {
    setCargandoAPI(true);
    try {
      console.log("🌐 Buscando producto en Open Food Facts...");
      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v0/product/${codigo}.json`
      );

      if (response.data && response.data.status === 1) {
        const product = response.data.product;
        const nombre =
          product.product_name_es ||
          product.generic_name ||
          product.product_name ||
          `Producto ${codigo.slice(-6)}`;
        const categoria =
          Array.isArray(product.categories_hierarchy) && product.categories_hierarchy.length > 0
            ? product.categories_hierarchy.join(" > ")
            : product.categories || "Sin categoría";
        const descripcion =
          product.generic_name ||
          product.ingredients_text ||
          product.labels ||
          product.stores ||
          "Descripción no disponible";
        const imagen =
          product.image_url ||
          product.image_front_url ||
          product.image_small_url ||
          null;
        const marca =
          product.brands ||
          (Array.isArray(product.brands_tags) ? product.brands_tags[0] : null) ||
          "Sin marca";
        const peso = product.quantity || product.package_name || "Sin peso";
        const origen =
          product.countries ||
          (Array.isArray(product.countries_tags) ? product.countries_tags.join(", ") : "Sin origen");

        const productoDeAPI: Producto = {
          id: Date.now(),
          nombre,
          codigoBarras: codigo,
          categoria,
          descripcion,
          imagen: imagen || undefined,
          proveedor: marca,
          stock: 0,
          precioCompra: 0,
          precioVenta: 0,
          margen: 0,
          ubicacion: "Por Definir",
          estado: "activo",
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString(),
        };

        console.log("📦 Producto encontrado en API:", nombre);
        setProductoEncontrado(productoDeAPI);

        if (onProductoEncontrado) {
          onProductoEncontrado(productoDeAPI);
        }
      } else {
        console.log("❌ Producto no encontrado en Open Food Facts");
      }
    } catch (error) {
      console.error("Error buscando en API:", error);
    } finally {
      setCargandoAPI(false);
    }
  };


  const iniciarEscaneo = async () => {
    if (!codeReader || !videoRef.current || escaneoActivo) return;

    try {
      setEscaneoActivo(true);
      setError("");
      setProductoEncontrado(null);

      const deviceId = dispositivoSeleccionado || null;

      await codeReader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result: Result | null, error?: Error) => {
          if (result) {
            const codigo = result.getText();

            // Evitar escaneos duplicados rápidos
            if (codigo !== ultimoEscaneo) {
              // Vibración en dispositivos móviles
              if ("vibrate" in navigator) {
                navigator.vibrate([100, 50, 100]);
              }

              procesarCodigoEscaneado(codigo);

              // Pausar escaneo por 2 segundos para evitar duplicados
              setTimeout(() => {
                setUltimoEscaneo("");
              }, 2000);
            }
          }

          if (error && error.name !== "NotFoundException") {
            console.error("Error de escaneo:", error);
          }
        }
      );
    } catch (error) {
      console.error("Error iniciando escaneo:", error);
      setError("Error al iniciar el escáner. Intenta con otra cámara.");
      setEscaneoActivo(false);
    }
  };

  const detenerEscaneo = () => {
    if (codeReader && escaneoActivo) {
      codeReader.reset();
      setEscaneoActivo(false);
    }
  };

  const escaneoManual = () => {
    const codigo = prompt("Ingresa el código de barras:");
    if (codigo?.trim()) {
      procesarCodigoEscaneado(codigo.trim());
    }
  };

  const generarCodigoPrueba = () => {
    const codigosPrueba = Object.keys(baseDatosCodigosBarras);
    const codigoAleatorio = codigosPrueba[Math.floor(Math.random() * codigosPrueba.length)];

    // Simular vibración y feedback
    if ("vibrate" in navigator) {
      navigator.vibrate(100);
    }

    console.log("🎲 Código de prueba generado:", codigoAleatorio);
    procesarCodigoEscaneado(codigoAleatorio);
  };

  if (!permisosCamara) {
    return (
      <div className="escaner-container">
        <div className="escaner-error">
          <h4>📷 Permisos de Cámara Requeridos</h4>
          <p>
            Para escanear códigos de barras, necesitas permitir el acceso a la
            cámara.
          </p>
          <div className="escaner-controls">
            <button className="button primary" onClick={verificarPermisos}>
              🔄 Solicitar Permisos
            </button>
            <button className="button" onClick={escaneoManual}>
              ⌨️ Código Manual
            </button>
            <button className="button success" onClick={generarCodigoPrueba}>
              🎲 Código de Prueba
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="escaner-container">
      {error && (
        <div className="escaner-error">
          <p>⚠️ {error}</p>
          <button className="button" onClick={() => setError("")}>
            ❌ Cerrar
          </button>
        </div>
      )}

      {/* Mostrar información del producto encontrado */}
      {productoEncontrado && (
        <div className="producto-encontrado">
          <h4>✅ Producto Identificado</h4>
          <div className="producto-info-card">
            <div className="producto-imagen">
              {productoEncontrado.imagen ? (
                <img
                  src={productoEncontrado.imagen}
                  alt={productoEncontrado.nombre}
                />
              ) : (
                <div className="imagen-placeholder">📦</div>
              )}
            </div>
            <div className="producto-detalles">
              <h5>{productoEncontrado.nombre}</h5>
              <p className="categoria">{productoEncontrado.categoria}</p>
              <p className="codigo">Código: {productoEncontrado.codigoBarras}</p>
              <div className="precios">
                <span className="precio-compra">
                  Compra: ${(productoEncontrado.precioCompra || 0).toLocaleString()}
                </span>
                <span className="precio-venta">
                  Venta: ${(productoEncontrado.precioVenta || 0).toLocaleString()}
                </span>
              </div>
              <p className="stock">
                Stock: {(productoEncontrado.stock ?? 0)} unidades
              </p>
            </div>
          </div>
        </div>
      )}

      {isActive && (
        <div className="camera-view">
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "300px",
              border: "2px solid #667eea",
              borderRadius: "8px",
              backgroundColor: "#000",
              objectFit: "cover",
            }}
            playsInline
            muted
          />

          <div className="escaner-overlay">
            <div className="scan-line"></div>
            <div className="scan-instructions">
              {escaneoActivo
                ? "📱 Buscando código..."
                : "⏸️ Iniciando escáner..."}
            </div>
          </div>
        </div>
      )}

      <div className="escaner-controls">
        {/* Selector de cámara - solo mostrar si hay múltiples dispositivos */}
        {dispositivos.length > 1 && (
          <select
            id="selector-camara"
            aria-label="Seleccionar cámara para escáner"
            className="input"
            value={dispositivoSeleccionado}
            onChange={(e) => setDispositivoSeleccionado(e.target.value)}
          >
            <option value="">Seleccionar cámara</option>
            {dispositivos.map((dispositivo) => (
              <option key={dispositivo.deviceId} value={dispositivo.deviceId}>
                {dispositivo.label ||
                  `Cámara ${dispositivo.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        <button className="button" onClick={escaneoManual}>
          ⌨️ Código Manual
        </button>

        <button className="button success" onClick={generarCodigoPrueba}>
          🎲 Código de Prueba
        </button>

        <button className="button" onClick={() => window.location.reload()}>
          🔄 Reiniciar Cámara
        </button>
      </div>

      <div className="escaner-estadisticas">
        <p>
          <strong>Códigos de prueba locales:</strong>{" "}
          {Object.keys(baseDatosCodigosBarras).length}
        </p>
        <p>
          <strong>Productos en inventario:</strong> {productos.length}
        </p>
        {cargandoAPI && (
          <p>
            <strong>Estado:</strong> Buscando producto en API...
          </p>
        )}
        {ultimoEscaneo && (
          <p>
            <strong>Último escaneado:</strong> {ultimoEscaneo}
          </p>
        )}
      </div>
    </div>
  );
}

export default EscanerZXing;
