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
# Modo desarrollo (con hot reload)
npm run dev

# O ejecutar por separado:
npm run dev:server  # Backend en puerto 3001
npm run dev:all     # Frontend + Backend
```

## 🔐 Usuarios de Prueba

| Email | Contraseña | Rol | Permisos |
|-------|------------|-----|----------|
| `jefe@test.com` | `1234` | Jefe | Todo (inventario, fiado, empleados) |
| `empleado@test.com` | `1234` | Empleado | Solo punto de venta |

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
```

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

### 1. Login como Jefe
```
Email: jefe@test.com
Contraseña: 1234
```

### 2. Ir a "💳 Fiado"

### 3. Crear una deuda
- Click "➕ Nueva Deuda"
- Tipo: Cliente
- Nombre: Juan Pérez
- Referencia: 123
- Monto: 50000
- Razón: Compra de productos

### 4. Registrar un pago
- Click "📋 Ver Historial"
- Tipo: Abono (pago)
- Monto: 20000
- Razón: Pago parcial

## 🏗️ Arquitectura

```
📁 MiniMarket Innova/
├── 📁 src/
│   ├── 📁 componentes/     # Componentes React
│   │   ├── Login.tsx       # Autenticación
│   │   ├── PuntoVenta.tsx  # Sistema POS
│   │   ├── Inventario.tsx  # Gestión productos
│   │   └── Fiado.tsx       # Sistema de deudas
│   ├── 📁 services/        # Servicios API
│   ├── 📁 types/          # Tipos TypeScript
│   └── 📁 styles/         # CSS
├── 📄 server.js           # Backend Express
├── 📄 railway.toml        # Config Railway
└── 📄 package.json        # Dependencias
```

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo completo
npm run dev:server   # Solo backend
npm run build        # Build producción
npm start           # Servidor producción
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