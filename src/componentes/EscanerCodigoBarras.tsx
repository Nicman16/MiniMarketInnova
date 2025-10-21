import React, { useRef, useEffect, useState } from "react";

interface EscanerProps {
  onScan: (codigo: string) => void;
  isActive: boolean;
}

function EscanerCodigoBarras({ onScan, isActive }: EscanerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dispositivosDisponibles, setDispositivosDisponibles] = useState<
    MediaDeviceInfo[]
  >([]);
  const [camaraSeleccionada, setCamaraSeleccionada] = useState<string>("");
  const [permisosCamara, setPermisosCamara] = useState<boolean>(false);

  useEffect(() => {
    verificarPermisos();
    obtenerDispositivos();
  }, []);

  useEffect(() => {
    if (isActive && permisosCamara) {
      iniciarCamara();
    } else {
      detenerCamara();
    }

    return () => detenerCamara();
  }, [isActive, camaraSeleccionada, permisosCamara]);

  const verificarPermisos = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setPermisosCamara(true);
    } catch (error) {
      console.error("Sin permisos de cámara:", error);
      setPermisosCamara(false);
    }
  };

  const obtenerDispositivos = async () => {
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      const camaras = dispositivos.filter(
        (dispositivo) => dispositivo.kind === "videoinput"
      );
      setDispositivosDisponibles(camaras);

      // Seleccionar cámara trasera por defecto (móvil)
      const camaraTrasera = camaras.find(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("rear")
      );
      if (camaraTrasera) {
        setCamaraSeleccionada(camaraTrasera.deviceId);
      } else if (camaras.length > 0) {
        setCamaraSeleccionada(camaras[0].deviceId);
      }
    } catch (error) {
      console.error("Error al obtener dispositivos:", error);
    }
  };

  const iniciarCamara = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: camaraSeleccionada
            ? { exact: camaraSeleccionada }
            : undefined,
          facingMode: camaraSeleccionada ? undefined : "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      alert("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const detenerCamara = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const escanearManual = () => {
    const codigo = prompt("Ingresa el código de barras manualmente:");
    if (codigo && codigo.trim()) {
      onScan(codigo.trim());
    }
  };

  const generarCodigoAleatorio = () => {
    // Genera un código de barras falso para pruebas
    const codigo =
      "77020" +
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0");
    onScan(codigo);
  };

  const cambiarCamara = (deviceId: string) => {
    setCamaraSeleccionada(deviceId);
  };

  if (!permisosCamara) {
    return (
      <div className="escaner-container">
        <div className="escaner-error">
          <h4>📷 Acceso a la cámara requerido</h4>
          <p>Para usar el escáner, necesitas permitir el acceso a la cámara.</p>
          <button className="button" onClick={verificarPermisos}>
            🔄 Solicitar Permisos
          </button>
          <button className="button" onClick={escanearManual}>
            ⌨️ Ingresar Código Manual
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="escaner-container">
      {isActive && (
        <div className="camera-view">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "300px",
              border: "2px solid #667eea",
              borderRadius: "8px",
              backgroundColor: "#000",
            }}
          />
          <div className="escaner-overlay">
            <div className="scan-line"></div>
            <div className="scan-instructions">
              📱 Coloca el código de barras dentro del marco
            </div>
          </div>
        </div>
      )}

      <div className="escaner-controls">
        {dispositivosDisponibles.length > 1 && (
          <select
            className="input"
            value={camaraSeleccionada}
            onChange={(e) => cambiarCamara(e.target.value)}
            style={{ marginBottom: "10px" }}
          >
            {dispositivosDisponibles.map((dispositivo) => (
              <option key={dispositivo.deviceId} value={dispositivo.deviceId}>
                {dispositivo.label ||
                  `Cámara ${dispositivo.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        <button className="button" onClick={escanearManual}>
          ⌨️ Código Manual
        </button>

        <button className="button success" onClick={generarCodigoAleatorio}>
          🎲 Código de Prueba
        </button>

        <button className="button" onClick={() => window.location.reload()}>
          🔄 Reiniciar Cámara
        </button>
      </div>

      <div className="escaner-ayuda">
        <h4>💡 Consejos para escanear:</h4>
        <ul>
          <li>✅ Asegúrate de tener buena iluminación</li>
          <li>✅ Mantén el código de barras dentro del marco rojo</li>
          <li>✅ Mantén el dispositivo estable</li>
          <li>✅ Si no funciona, usa "Código Manual"</li>
        </ul>
      </div>
    </div>
  );
}

export default EscanerCodigoBarras;
