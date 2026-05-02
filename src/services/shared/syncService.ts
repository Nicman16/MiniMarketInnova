import { io, Socket } from 'socket.io-client';

class SyncService {
  private socket: Socket | null = null;
  private productos: any[] = [];
  private listeners: Set<Function> = new Set();
  private dispositivosConectados: number = 0;
  private reconectando: boolean = false;

  constructor() {
    this.conectar();
  }

  private getAuthToken(): string {
    return localStorage.getItem('token') || '';
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/\/$/, '');
  }

  private conectar() {
    // Detectar entorno y configurar URL del servidor
    const serverUrl = this.getServerUrl();
    const token = this.getAuthToken();
    
    console.log('🔗 Conectando a:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: token ? { token } : undefined
    });

    this.setupListeners();
  }

  private getServerUrl(): string {
    const configuredUrl = (process.env.REACT_APP_API_URL || '').trim();
    if (configuredUrl) {
      return this.sanitizeUrl(configuredUrl);
    }

    const origin = window.location.origin;
    const isHttpOrigin = origin.startsWith('http://') || origin.startsWith('https://');

    if (process.env.NODE_ENV === 'production') {
      // En móvil híbrida, origin puede ser capacitor://localhost o ionic://localhost.
      // Por eso se recomienda configurar REACT_APP_API_URL en producción.
      if (isHttpOrigin) {
        return this.sanitizeUrl(origin);
      }

      console.warn('⚠️ REACT_APP_API_URL no está configurada en producción. Se usará conexión relativa al mismo origen.');
      return '';
    }

    // En desarrollo local web
    return 'http://localhost:3001';
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🟢 Conectado al servidor');
      this.reconectando = false;
      this.notifyListeners('conectado', true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Desconectado del servidor:', reason);
      this.notifyListeners('conectado', false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      this.notifyListeners('error', error.message);
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconectado al servidor');
      this.reconectando = false;
    });

    this.socket.on('reconnecting', () => {
      console.log('🔄 Intentando reconectar...');
      this.reconectando = true;
    });

    this.socket.on('productos-sync', (productos: any[]) => {
      console.log('📦 Productos sincronizados:', productos.length);
      this.productos = productos;
      this.notifyListeners('productos', productos);
    });

    this.socket.on('producto-agregado', (producto: any) => {
      console.log('➕ Producto agregado:', producto.nombre);
      this.productos.push(producto);
      this.notifyListeners('productos', this.productos);
      this.notifyListeners('producto-agregado', producto);
    });

    this.socket.on('producto-actualizado', (producto: any) => {
      console.log('📝 Producto actualizado:', producto.nombre);
      const index = this.productos.findIndex(p => p.id === producto.id);
      if (index !== -1) {
        this.productos[index] = producto;
        this.notifyListeners('productos', this.productos);
        this.notifyListeners('producto-actualizado', producto);
      }
    });

    this.socket.on('producto-eliminado', (id: number) => {
      console.log('🗑️ Producto eliminado:', id);
      this.productos = this.productos.filter(p => p.id !== id);
      this.notifyListeners('productos', this.productos);
      this.notifyListeners('producto-eliminado', id);
    });

    this.socket.on('codigo-escaneado', (data: any) => {
      console.log('📱 Código escaneado remotamente:', data);
      this.notifyListeners('codigo-escaneado', data);
    });

    this.socket.on('dispositivos-conectados', (count: number) => {
      this.dispositivosConectados = count;
      this.notifyListeners('dispositivos-conectados', count);
    });

    this.socket.on('dispositivo-conectado', (count: number) => {
      this.dispositivosConectados = count;
      this.notifyListeners('dispositivos-conectados', count);
    });

    this.socket.on('dispositivo-desconectado', (count: number) => {
      this.dispositivosConectados = count;
      this.notifyListeners('dispositivos-conectados', count);
    });

    this.socket.on('error', (error: string) => {
      console.error('❌ Error del servidor:', error);
      this.notifyListeners('error', error);
    });

    this.socket.on('pong', () => {
      console.log('🏓 Pong recibido');
    });

    // Nuevos listeners para ventas y empleados
    this.socket.on('venta-registrada', (venta: any) => {
      console.log('💰 Venta registrada remotamente:', venta);
      this.notifyListeners('venta-registrada', venta);
    });

    this.socket.on('caja-abierta', (sesion: any) => {
      console.log('🔓 Caja abierta remotamente:', sesion);
      this.notifyListeners('caja-abierta', sesion);
    });

    this.socket.on('caja-cerrada', (sesion: any) => {
      console.log('🔒 Caja cerrada remotamente:', sesion);
      this.notifyListeners('caja-cerrada', sesion);
    });

    this.socket.on('movimiento-caja', (movimiento: any) => {
      console.log('💵 Movimiento de caja remoto:', movimiento);
      this.notifyListeners('movimiento-caja', movimiento);
    });

    this.socket.on('empleado-login', (empleado: any) => {
      console.log('👨‍💼 Empleado logueado:', empleado);
      this.notifyListeners('empleado-login', empleado);
    });

    this.socket.on('empleado-logout', (empleado: any) => {
      console.log('👨‍💼 Empleado desconectado:', empleado);
      this.notifyListeners('empleado-logout', empleado);
    });

    this.socket.on('empleado-creado', (empleado: any) => {
      console.log('👨‍💼 Nuevo empleado registrado:', empleado);
      this.notifyListeners('empleado-creado', empleado);
    });

    this.socket.on('empleado-actualizado', (empleado: any) => {
      console.log('👨‍💼 Empleado actualizado:', empleado);
      this.notifyListeners('empleado-actualizado', empleado);
    });

    this.socket.on('empleado-eliminado', (empleadoId: string) => {
      console.log('👨‍💼 Empleado eliminado:', empleadoId);
      this.notifyListeners('empleado-eliminado', empleadoId);
    });
  }

  // Suscribirse a cambios
  subscribe(callback: Function) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(event: string, data?: any) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  // Métodos para enviar datos
  agregarProducto(producto: any) {
    if (this.socket?.connected) {
      this.socket.emit('agregar-producto', producto);
    } else {
      console.error('❌ No conectado al servidor');
    }
  }

  actualizarProducto(producto: any) {
    if (this.socket?.connected) {
      this.socket.emit('actualizar-producto', producto);
    } else {
      console.error('❌ No conectado al servidor');
    }
  }

  eliminarProducto(id: number) {
    if (this.socket?.connected) {
      this.socket.emit('eliminar-producto', id);
    } else {
      console.error('❌ No conectado al servidor');
    }
  }

  escanearCodigo(codigo: string, dispositivo: string) {
    if (this.socket?.connected) {
      this.socket.emit('codigo-escaneado', { 
        codigo, 
        dispositivo, 
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      });
    } else {
      console.error('❌ No conectado al servidor');
    }
  }

  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  obtenerProductos() {
    return this.productos;
  }

  obtenerDispositivosConectados() {
    return this.dispositivosConectados;
  }

  estaConectado() {
    return this.socket?.connected || false;
  }

  reconectar() {
    if (this.socket) {
      const token = this.getAuthToken();
      this.socket.auth = token ? { token } : {};
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  actualizarToken() {
    if (this.socket) {
      const token = this.getAuthToken();
      this.socket.auth = token ? { token } : {};
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Nuevos métodos para registrar eventos
  registrarVenta(venta: any) {
    if (this.socket?.connected) {
      this.socket.emit('venta-registrada', venta);
    }
  }

  notificarAperturaCaja(sesion: any) {
    if (this.socket?.connected) {
      this.socket.emit('caja-abierta', sesion);
    }
  }

  notificarCierreCaja(sesion: any) {
    if (this.socket?.connected) {
      this.socket.emit('caja-cerrada', sesion);
    }
  }

  notificarMovimientoCaja(movimiento: any) {
    if (this.socket?.connected) {
      this.socket.emit('movimiento-caja', movimiento);
    }
  }

  notificarLogin(empleado: any) {
    if (this.socket?.connected) {
      this.socket.emit('empleado-login', empleado);
    }
  }

  notificarLogout(empleado: any) {
    if (this.socket?.connected) {
      this.socket.emit('empleado-logout', empleado);
    }
  }

  notificarNuevoEmpleado(empleado: any) {
    if (this.socket?.connected) {
      this.socket.emit('empleado-creado', empleado);
    }
  }

  notificarEmpleadoActualizado(empleado: any) {
    if (this.socket?.connected) {
      this.socket.emit('empleado-actualizado', empleado);
    }
  }

  notificarEmpleadoEliminado(empleadoId: string) {
    if (this.socket?.connected) {
      this.socket.emit('empleado-eliminado', empleadoId);
    }
  }
}

export const syncService = new SyncService();