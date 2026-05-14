# Documentacion Del Proyecto

## Estructura

- `reference/`: guias rapidas y material de consulta.
- `reports/`: reportes tecnicos, de implementacion y verificacion.
- `planning/`: pendientes y notas de planificacion.
- `reviews/`: revisiones tecnicas y observaciones manuales.

## Indice Rapido

### Canonico (usar primero)

- `reference/QUICK_REFERENCE.md` (estado actual consolidado)
- `reports/ESTADISTICAS_IMPLEMENTADAS.md` (estado de dashboard/reportes)

### Historico (puede repetir informacion)

- `reports/IMPLEMENTATION_SUMMARY.md`
- `reports/SECURITY_FIXES.md`
- `reports/VERIFICATION_REPORT.md`
- `planning/MEJORAS_PENDIENTES.md`
- `reviews/WORKTREE_REVIEW.md`

## Nota De Consistencia

Para evitar contradicciones antes de deploy, tomar como fuente principal `reference/QUICK_REFERENCE.md`.
Los documentos historicos se mantienen solo para auditoria y trazabilidad de cambios.

## Criterio De Organizacion

La raiz del repositorio queda reservada para configuracion del proyecto,
codigo ejecutable principal y el README principal.

Todo el material documental o auxiliar se mantiene dentro de `docs/`.