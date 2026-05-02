# Backend MiniMarket Innova

Esta carpeta contiene toda la API y lógica de servidor.

## Estructura

- config/: entorno, conexión a base de datos
- middleware/: autenticación, seguridad, rate limiting
- models/: esquemas y modelos de MongoDB
- routes/: endpoints de API por dominio
- socket/: inicialización y eventos en tiempo real
- utils/: utilidades compartidas
- state.js: estado en memoria para fallback
- server.js: entrypoint principal del backend

## Arranque

- Desarrollo backend: npm run dev:server
- Desarrollo completo: npm run dev:all
- Local directo: npm run start:local
- Staging: npm run start:staging
- Railway/producción: npm run start:railway

## Convenciones

- Todas las rutas se montan desde backend/server.js
- Prefijo API: /api
- Healthcheck: /health
- No agregar lógica de negocio en server.js: mantenerla en routes, services o utils
