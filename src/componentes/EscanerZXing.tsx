import React, { useRef, useEffect, useState } from "react";
import { BrowserMultiFormatReader, Result } from "@zxing/library";
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

    // 1. Buscar en productos existentes
    const productoExistente = productos.find((p) => p.codigoBarras === codigo);

    if (productoExistente) {
      console.log("✅ Producto encontrado en inventario:", productoExistente.nombre);
      setProductoEncontrado(productoExistente);

      if (onProductoEncontrado) {
        onProductoEncontrado(productoExistente);
      }
    } else {
      // 2. Buscar en base de datos de códigos conocidos
      const datosConocidos = baseDatosCodigosBarras[
        codigo as keyof typeof baseDatosCodigosBarras
      ];

      if (datosConocidos) {
        console.log("📚 Código encontrado en base de datos:", datosConocidos.nombre);

        // Crear nuevo producto con datos conocidos
        const nuevoProducto: Producto = {
          id: Date.now(), // ID temporal
          codigoBarras: codigo,
          stock: 0, // Stock inicial 0
          margen:
            ((datosConocidos.precioVenta - datosConocidos.precioCompra) /
              datosConocidos.precioCompra) *
            100,
          proveedorId: 1, // ID temporal
          estado: "activo",
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString(),
          ...datosConocidos,
        };

        setProductoEncontrado(nuevoProducto);

        if (onProductoEncontrado) {
          onProductoEncontrado(nuevoProducto);
        }
      } else {
        // 3. Código desconocido - generar producto básico
        console.log("❓ Código desconocido, generando producto básico");

        const productoGenerico: Producto = {
          id: Date.now(),
          nombre: `Producto ${codigo.slice(-6)}`,
          codigoBarras: codigo,
          categoria: "Sin Categoría",
          stock: 0,
          stockMinimo: 5,
          precioCompra: 0,
          precioVenta: 0,
          margen: 0,
          proveedor: "Proveedor Desconocido",
          proveedorId: 0,
          ubicacion: "Por Definir",
          descripcion: "Producto pendiente de configuración",
          estado: "activo",
          fechaCreacion: new Date().toISOString(),
          ultimaActualizacion: new Date().toISOString(),
        };

        setProductoEncontrado(productoGenerico);

        if (onProductoNoEncontrado) {
          onProductoNoEncontrado(codigo);
        }
      }
    }

    // Llamar callback original
    onScan(codigo);
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
          <strong>Códigos en base de datos:</strong>{" "}
          {Object.keys(baseDatosCodigosBarras).length}
        </p>
        <p>
          <strong>Productos en inventario:</strong> {productos.length}
        </p>
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
