# MiniMarket Innova 🏪

Sistema completo de punto de venta para minimarkets con autenticación, inventario y gestión de fiado.

## 🚀 Características

- ✅ **Autenticación JWT** - Login seguro con roles (Jefe/Empleado)
- ✅ **Punto de Venta** - Sistema completo con carrito de compras
- ✅ **Escáner de códigos de barras** - Lectura automática con ZXing
- ✅ **Gestión de Inventario** - CRUD completo de productos
- ✅ **Sistema de Fiado** - Deudas de clientes y consumo de empleados
- ✅ **Base de datos MongoDB** - Persistencia completa
- ✅ **WebSockets** - Actualizaciones en tiempo real
- ✅ **Responsive** - Funciona en móvil y desktop

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- MongoDB (local o Atlas)
- npm o yarn

### 1. Clonar el repositorio

```bash
git clone https://github.com/Nicman16/MiniMarketInnova.git
cd MiniMarketInnova
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

Edita `.env` con tus configuraciones:

```env
# Base de datos MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/minimarket

# JWT Secret para autenticación
JWT_SECRET=tu_clave_secreta_aqui_cambiar_en_produccion

# Puerto del servidor (opcional, Railway lo asigna automáticamente)
PORT=3001

# Entorno
NODE_ENV=development

# CORS permitido para el frontend
CORS_ORIGIN=http://localhost:3002

# Opcional: solo si frontend y backend están en hosts distintos
# REACT_APP_API_URL=https://tu-backend-api.up.railway.app
```

### 4. Configurar MongoDB

#### Opción A: MongoDB Local (Desarrollo)

1. **Instala MongoDB Community Edition:**
   - Windows: [Descarga aquí](https://www.mongodb.com/try/download/community)
   - macOS: `brew install mongodb-community`
   - Linux: `sudo apt install mongodb`

2. **Inicia MongoDB:**
   ```bash
   # Windows (como servicio)
   net start MongoDB

   # macOS/Linux
   mongod --dbpath /usr/local/var/mongodb
   ```

#### Opción B: MongoDB Atlas (Recomendado para producción)

1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crea una cuenta gratuita
3. Crea un cluster
4. Obtén la connection string y ponla en `MONGO_URI`

### 5. Ejecutar la aplicación

```bash
# Frontend en desarrollo
npm run dev

# Backend en desarrollo
npm run dev:server

# Frontend + backend
npm run dev:all
```

## 🔐 Usuarios Demo

Las cuentas demo no se crean automáticamente al iniciar el servidor.

1. Asegúrate de tener `NODE_ENV=development`
2. Ejecuta `npm run seed:demo`
3. Inicia sesión con las cuentas generadas por el seed

| Email | Contraseña | Rol | Permisos |
|-------|------------|-----|----------|
| `jefe@demo.local` | `DemoJefe2024!` | Jefe | Todo (inventario, fiado, empleados) |
| `empleado1@demo.local` | `DemoEmpleado2024!` | Empleado | Punto de venta |
| `empleado2@demo.local` | `DemoEmpleado2024!` | Empleado | Punto de venta |

## 🌐 Despliegue en Railway

### Configuración automática

El proyecto incluye configuración automática para Railway:

1. **Conecta tu repositorio** en Railway
2. **Railway detectará automáticamente:**
   - MongoDB como servicio
   - Variables de entorno
   - Puerto de despliegue

### Variables de entorno en Railway

Ve a tu proyecto → Settings → Environment y configura:

```env
NODE_ENV=production
JWT_SECRET=tu_clave_secreta_segura_aqui
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/minimarket?retryWrites=true&w=majority
CORS_ORIGIN=https://<tu-app>.up.railway.app

# Opcional: solo si API y frontend están separados
# REACT_APP_API_URL=https://<tu-api>.up.railway.app
```

Si usas una sola app en Railway (frontend servido por Express + API en el mismo servicio),
deja `REACT_APP_API_URL` sin definir: el frontend consumirá `/api/...` en el mismo dominio automáticamente.

### URL de producción

Después del despliegue, Railway te dará una URL como:
```
https://minimarketinnova-production.up.railway.app
```

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login con email/contraseña
- `GET /api/auth/me` - Información del usuario actual

### Productos
- `GET /api/tienda/productos` - Lista productos para venta
- `GET /api/productos` - Lista completa (admin)

### Fiado/Deudas
- `POST /api/deuda/crear` - Crear nueva deuda
- `GET /api/deuda/lista` - Lista todas las deudas
- `POST /api/deuda/transaccion` - Registrar cargo/abono

### Sistema
- `GET /health` - Estado del servidor

## 🧪 Probar el Sistema de Fiado

### 1. Crear usuarios demo
```bash
npm run seed:demo
```

### 2. Login como Jefe
```
Email: jefe@demo.local
Contraseña: DemoJefe2024!
```

### 3. Ir a "💳 Fiado"

### 4. Crear una deuda
- Click "➕ Nueva Deuda"
- Tipo: Cliente
- Nombre: Juan Pérez
- Referencia: 123
- Monto: 50000
- Razón: Compra de productos

### 5. Registrar un pago
- Click "📋 Ver Historial"
- Tipo: Abono (pago)
- Monto: 20000
- Razón: Pago parcial

## 🏗️ Arquitectura

```
📁 MiniMarket Innova/
├── 📁 src/
│   ├── 📁 componentes/
│   │   ├── 📁 auth/        # Login y acceso
│   │   ├── 📁 caja/        # Apertura, cierre y movimientos de caja
│   │   ├── 📁 dashboard/   # Dashboard, bienvenida y estadísticas
│   │   ├── 📁 fiado/       # Gestión de deudas
│   │   ├── 📁 inventario/  # Inventario, escáner, precios y proveedores
│   │   ├── 📁 personal/    # Personal y empleados
│   │   └── 📁 ventas/      # Punto de venta y reportes
│   ├── 📁 context/         # Contextos de sesión y auth
│   ├── 📁 services/
│   │   ├── 📁 auth/        # Servicios de autenticación local de empleados
│   │   ├── 📁 caja/        # Estado y operaciones de caja
│   │   ├── 📁 dashboard/   # Consumo de estadísticas
│   │   ├── 📁 fiado/       # API de deuda/fiado
│   │   ├── 📁 inventario/  # Productos e inventario
│   │   ├── 📁 reportes/    # Ventas y reportes
│   │   └── 📁 shared/      # Sincronización y utilidades compartidas
│   ├── 📁 styles/          # Estilos
│   └── 📁 types/           # Tipos TypeScript
├── 📁 docs/                # Documentación técnica y reportes
├── 📁 scripts/             # Scripts de soporte
├── 📁 notebooks/           # Exploración y pruebas
├── 📄 server.js            # Backend Express
├── 📄 railway.toml         # Config Railway
└── 📄 package.json         # Dependencias y scripts
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo completo
npm run dev:server   # Solo backend
npm run dev:all      # Frontend + backend
npm run build        # Build producción
npm start           # Servidor producción
npm run seed:demo    # Crea usuarios demo en desarrollo
```

## 📝 Tecnologías

- **Frontend:** React 18, TypeScript, CSS3
- **Backend:** Node.js, Express.js
- **Base de datos:** MongoDB con Mongoose
- **Autenticación:** JWT (JSON Web Tokens)
- **WebSockets:** Socket.io para tiempo real
- **Escáner:** ZXing library
- **Despliegue:** Railway (automático)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de Railway
2. Verifica que MongoDB esté corriendo
3. Comprueba las variables de entorno
4. Abre un issue en GitHub

---

**¡MiniMarket Innova - Tu sistema POS completo! 🚀**