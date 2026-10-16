# Contribuir a LogicLab

## Flujo de trabajo

1. Consultar `LogicLab-Software` y vincular el cambio a un ticket existente.
2. Actualizar main mediante `git fetch origin` y `git pull --ff-only` con el árbol limpio.
3. Crear una rama breve: `feat/SCRUM-6-pasos`, `fix/SCRUM-13-nor` o `docs/trazabilidad`.
4. Conservar el diseño y motor existentes salvo que una prueba o requisito justifique el cambio.
5. Ejecutar `npm ci`, `npm test`, `npm run build` y `npm run test:e2e` según alcance. Instalar previamente navegadores con `npx playwright install chromium firefox webkit`.
6. Abrir un pull request a `main` con problema, solución, ticket, pruebas y limitaciones.
7. Solicitar revisión del otro integrante y resolver observaciones antes de integrar.

## Convenciones

TypeScript estricto, nombres descriptivos, funciones puras en `src/logic/` y estado de interfaz en React. No agregar dependencias sin explicar su uso. `package-lock.json` debe acompañar cambios de dependencias. No hay un linter configurado; `npm run typecheck` comprueba tipos, pero no sustituye un análisis de estilo.

Usar commits descriptivos, por ejemplo `fix(SCRUM-13): corregir polaridad de conversión NOR` o `docs: documentar límites del prototipo`. La identidad de Git debe corresponder al autor real. No usar `push --force`, no cambiar visibilidad del repositorio y no subir tokens.

## Evidencia y privacidad

Los originales son inmutables. Comprobar SHA-256 contra `evidencia/reportes/inventario-originales.json`. Agregar resultados reales a `evidencia/pruebas/` y capturas auténticas a `evidencia/capturas/`, indicando contexto. No subir trazas con credenciales o datos de alumnos. Revisar documentos y metadatos antes de publicar; los originales contienen nombres del equipo y de la docente.

La protección de rama y revisiones obligatorias requieren configuración autorizada en GitHub; el workflow local no las habilita automáticamente. Si Vercel despliega cada push a main, la revisión y CI deben aprobarse antes de fusionar: la integración Vercel por sí sola no espera necesariamente al resultado de GitHub Actions.
