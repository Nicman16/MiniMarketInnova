# Revisión del Worktree Antiguo de Copilot

## Resumen ejecutivo

El worktree `copilot-worktree-2026-04-12T17-25-15` no representa una versión mejor del proyecto lista para mezclar completa. Sirve como referencia histórica, pero contiene mezcla de avances útiles con decisiones riesgosas e inconsistentes.

## Qué ya quedó integrado en el repo actual

- componentes principales de la interfaz en `src/componentes/`
- servicios de frontend en `src/services/`
- autenticación JWT en `server.js`
- endpoints de fiado, reportes y estadísticas
- documentación de seguridad y verificación

## Qué sí vale la pena rescatar del worktree

- ideas de organización por dominios funcionales
- scripts de apoyo para reestructuración como referencia, no para ejecución directa
- documentación comparativa para revisar decisiones pasadas

## Qué no conviene mezclar tal como está

- reestructura completa a `frontend/` y `backend/` sin plan de migración
- componentes con credenciales demo o acceso rápido hardcodeado
- servicios que mezclan mocks locales, localStorage y API real sin frontera clara
- scripts duplicados de reestructuración sin integración con el repo actual

## Riesgos detectados en el trabajo antiguo

- credenciales demo expuestas en login y documentación antigua
- datos demo inicializados desde servicios de frontend
- artefactos de build con contenido ya obsoleto
- separación estructural incompleta entre frontend y backend

## Recomendación

Mantener el proyecto actual con una reorganización incremental:

1. limpiar root y centralizar documentación
2. eliminar credenciales hardcodeadas remanentes
3. agrupar componentes y servicios por dominio en pasos pequeños
4. evaluar una migración a `frontend/` y `backend/` solo cuando exista plan de build, imports y despliegue