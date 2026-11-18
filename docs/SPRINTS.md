# Sprints: organización del trabajo realizado

> **Naturaleza de este documento.** El trabajo del repositorio **no se ejecutó como Sprints planificados con ceremonias**. Este documento agrupa, de forma **retrospectiva**, el trabajo que ya existe según los cuatro Sprints que el equipo planificó en [SCRUM.md](SCRUM.md) y añade tres agrupaciones para el trabajo que quedó fuera de ese plan. No contiene fechas de Sprint, duración, velocidad, puntos ni cierres en Jira, porque nada de eso ocurrió o consta. Las fechas que aparecen son las **fechas reales de los commits**, tomadas de `git log`. Los tickets de Jira no se han consultado ni modificado.

Los estados usan el vocabulario de [REQUISITOS.md](REQUISITOS.md): **COMPLETADO** (validado en el alcance indicado), **PARCIALMENTE COMPLETADO** y **PENDIENTE**. Las pruebas citadas corresponden al commit `16910f8`: 73 unitarias y 25 de navegador, ejecutadas en Chromium.

## Autoría real según git

| Commits | Fechas | Autor en git |
|---|---|---|
| `0dff94d`, `1427f57`, `e73bc4b`, `960e4b9` | 15 oct 2026 | IBH05 |
| `7dbea1d` | 22 oct 2026 | IBH05 |
| `82de2b1` | 5 nov 2026 | IBH05 |
| `67819f2`, `7bddcc2`, `26fa6e5`, `2de08aa`, `2404dd8`, `2526c71`, `16910f8` | 18 nov 2026 | Claude (asistente de IA; los commits llevan el aviso de coautoría) |

La columna «Responsable» de las tablas siguientes es la **asignación del plan del equipo**. No indica quién implementó el trabajo.

---

## Sprint 1 · Diseño e interfaz

**Meta:** una interfaz clara y accesible para introducir expresiones y leer resultados.

| Jira | Requisito | Responsable (plan) | Trabajo en el repositorio | Estado |
|---|---|---|---|---|
| SCRUM-5 | RF-01 | Ángel Raúl | Entrada por teclado físico y virtual, validación y mensajes de error. Integración del TSX original en React, TypeScript y Vite (`1427f57`). | COMPLETADO para la gramática documentada y el límite de 2000 caracteres |
| SCRUM-11 | RNF-01 | Isauro | Interfaz base original, más sistema de diseño con tokens y componentes (`2de08aa`), cabecera y pie únicos, página de inicio con demostración (`7bddcc2`, `2404dd8`, `2526c71`) y tutorial guiado del editor (`26fa6e5`). | PARCIALMENTE COMPLETADO: falta un estudio de comprensión con estudiantes |
| SCRUM-15 | RNF-05 | Isauro | Revisión automática con axe (WCAG A y AA) en Inicio, Calculadora, Editor y Ejercicios, sin violaciones; contraste, foco visible y `scroll-padding` por la cabecera fija. | PARCIALMENTE COMPLETADO: faltan lector de pantalla, zoom y evaluación humana |

**Límite:** no hay pruebas con usuarios reales.

## Sprint 2 · Motor lógico

**Meta:** resultados correctos y equivalentes para toda expresión válida.

| Jira | Requisito | Responsable (plan) | Trabajo en el repositorio | Estado |
|---|---|---|---|---|
| SCRUM-6 | RF-02 | Ángel Raúl | Quine-McCluskey con cobertura voraz y **procedimiento de simplificación paso a paso** (`7dbea1d`, 22 oct), con verificación de equivalencia en cada paso. | PARCIALMENTE COMPLETADO: implementado y con pruebas; falta revisión didáctica |
| SCRUM-10 | RF-06 | Isauro | Resultado final en SOP, POS, formas canónicas, NAND y NOR. | COMPLETADO en casos probados; el mínimo global no está garantizado |
| SCRUM-13 | RNF-03 | Ángel Raúl | Pruebas de equivalencia del motor y, además, de las conversiones del editor a solo NAND y solo NOR (`67819f2`). | PARCIALMENTE COMPLETADO: dominio grande y pruebas aleatorias extensas pendientes |

**Límite:** la simplificación voraz no garantiza el mínimo global.

## Sprint 3 · Funciones educativas

**Meta:** que el alumno entienda el procedimiento, no solo el resultado.

| Jira | Requisito | Responsable (plan) | Trabajo en el repositorio | Estado |
|---|---|---|---|---|
| SCRUM-7 | RF-03 | Isauro | Cada paso lleva su ley y su explicación (`7dbea1d`). La referencia de leyes sigue aparte. | PARCIALMENTE COMPLETADO: implementado; falta evaluar si las explicaciones son comprensibles para el público objetivo |
| SCRUM-8 | RF-04 | Ángel Raúl | Tabla de verdad de hasta 12 variables. Se añadió el **mapa de Karnaugh** de 1 a 5 variables (`67819f2`). | COMPLETADO en casos probados; rendimiento de 7–12 variables pendiente |
| SCRUM-9 | RF-05 | Isauro | Compuertas en SVG, ASCII y DOT; evaluación de una fila sobre el circuito. Se añadió el **editor de circuitos con arrastrar y soltar** (`67819f2`) y el diagrama compartido (`2526c71`). | COMPLETADO en casos probados |

## Sprint 4 · Pruebas y optimización

**Meta:** comprobar tiempos, navegadores y dispositivos.

| Jira | Requisito | Responsable (plan) | Trabajo en el repositorio | Estado |
|---|---|---|---|---|
| SCRUM-12 | RNF-02 | Ángel Raúl | Mediciones previas de 2 a 6 variables (máximo observado 274.71 ms, según REQUISITOS.md). **Medición nueva:** una función de 12 variables tarda unos 34 s en simplificarse. El editor limita la simplificación a 10 entradas y no recalcula al mover compuertas (`67819f2`). | PARCIALMENTE COMPLETADO: la calculadora sigue siendo síncrona; falta un Web Worker |
| SCRUM-14 | RNF-04 | Isauro | Diseño adaptable verificado de 320 a 1440 px en todas las vistas. Las pruebas nuevas se ejecutaron **solo en Chromium**; la configuración de Firefox, WebKit y Pixel 7 existe pero no se ejecutó con ellas. | PARCIALMENTE COMPLETADO: dispositivos físicos y Safari real sin verificar |

---

## Trabajo adicional fuera del plan original

Estas agrupaciones **no tienen ticket de Jira** y quedan **sin responsable asignado**. Si el equipo decide registrarlas, hay que crear los tickets.

### Sprint 5 · Editor de circuitos (propuesto)

**Meta:** que el alumno construya y analice circuitos, no solo los vea dibujados.

| Entregable | Commit | Estado |
|---|---|---|
| Editor con arrastrar y soltar (7 compuertas, cableado, interruptores y LED, deshacer, zoom, importar y exportar JSON, SVG y PNG) | `67819f2` | COMPLETADO en casos probados |
| Análisis en vivo: tabla de verdad por simulación, expresión, Karnaugh, caminos con retardo, costo en chips | `67819f2` | COMPLETADO en casos probados |
| Transformaciones: simplificar, solo NAND, solo NOR, dibujar desde una expresión | `67819f2` | COMPLETADO en casos probados |

**Límites:** solo circuitos combinacionales (sin realimentación), sin detección de riesgos (*hazards*), símbolos ANSI/IEEE. El arrastre desde la paleta no funciona en pantallas táctiles; no se probó en dispositivos físicos.

### Sprint 6 · Ejercicios y aprendizaje guiado (propuesto)

**Meta:** practicar con retroalimentación inmediata y un orden recomendado.

| Entregable | Commit | Estado |
|---|---|---|
| Banco de 12 ejercicios, verificación por equivalencia lógica con contraejemplo, pistas, solución y generador aleatorio | `67819f2` | COMPLETADO en casos probados |
| Tutorial guiado de 10 pasos en el editor, con detección automática de cada paso | `26fa6e5` | COMPLETADO en casos probados |
| Ruta de aprendizaje de 6 unidades, 27 ejercicios y progreso por unidad | `16910f8` | PARCIALMENTE COMPLETADO: los 15 ejercicios nuevos no han recibido revisión docente |

**Límite:** el progreso se guarda solo en el navegador (`localStorage`).

### Sprint 7 · Rediseño de la página principal (propuesto)

**Meta:** una página de inicio informativa y una estructura común para todas las vistas.

| Fase | Entregable | Commit | Estado |
|---|---|---|---|
| Inicio | Primera página de inicio con demostración y enlaces directos por ruta (`#/…`) | `7bddcc2` | COMPLETADO |
| Fase 1 | Tokens de diseño, componentes base, cabecera y pie globales únicos | `2de08aa` | COMPLETADO |
| Fase 2 | Módulos con capturas generadas por script, caso de la alarma, preguntas frecuentes | `2404dd8` | COMPLETADO |
| Fase 3 | Demostración con un circuito real simulado con el motor | `2526c71` | COMPLETADO |
| Fase 4 | Menú móvil, enlace «Saltar al contenido», arrastre en pantallas táctiles, auditoría completa | — | **PENDIENTE** |

### Línea aparte · Modelo de datos (T2 Actividad 3)

| Entregable | Commit | Estado |
|---|---|---|
| Diagramas conceptual, lógico y físico; esquema PostgreSQL de 5 tablas; implementación local con evidencias y respaldo | `82de2b1` (5 nov) | DOCUMENTADO. **No está integrado en la aplicación**, que no tiene servidor ni cuentas |

---

## Pendientes que atraviesan los Sprints

| Pendiente | Afecta a |
|---|---|
| Decidir si la base de datos se integra a la aplicación o se mantiene como entrega aparte (ver [REQUISITOS.md](REQUISITOS.md)) | Sprint 6, línea de datos |
| Revisión didáctica con estudiantes y docente (pasos, explicaciones, ejercicios nuevos) | Sprints 1, 3 y 6 |
| Fase 4 del rediseño (móvil y accesibilidad) | Sprints 1, 4 y 7 |
| Cálculo pesado en un Web Worker | Sprint 4 |
| Ejecutar las pruebas en Firefox, WebKit y Pixel 7, y verificar el despliegue de Vercel | Sprint 4 |
| Registrar en Jira los Sprints 5 a 7 si el equipo lo decide | Todos |

## Definición de terminado

Se mantiene la de [SCRUM.md](SCRUM.md): criterio de aceptación trazable, revisión por el compañero, pruebas pertinentes aprobadas, documentación actualizada y evidencia real. **Ningún Sprint de este documento cumple todavía la revisión por el compañero ni tiene evidencia adjunta en Jira**, por lo que ninguno se declara cerrado.
