# Requisitos y matriz de trazabilidad

Fuente principal: Actividad 5, seis RF y cinco RNF; organización Jira proporcionada por el equipo. Fecha de evaluación local: 15 de octubre de 2026. **COMPLETADO** se refiere a la validación del alcance indicado, no a todos los casos posibles ni al cierre del Sprint. **PARCIALMENTE COMPLETADO** indica implementación o validación incompleta; **PENDIENTE** indica trabajo no realizado; **NO VERIFICADO** indica ausencia de evidencia de ejecución.

## Funcionales

| ID / Jira | Criterio de aceptación | Componentes | Evidencia / prueba | Estado y límite |
|---|---|---|---|---|
| RF-01 / SCRUM-5 | Introducir expresión válida y rechazar entradas vacías o inválidas con mensaje | `App`, `tokenize`, `Parser` | Unitarias «RF-01 entrada y errores»; E2E «flujo completo y errores» | COMPLETADO para la gramática documentada y límite de 2000 caracteres |
| RF-02 / SCRUM-6 | Mostrar transformaciones ordenadas de simplificación, desde entrada hasta resultado | `quineMcCluskey`, pestaña Simplificación | Auditoría estática y E2E verifican resultado y aviso de pasos pendientes | PARCIALMENTE COMPLETADO: existe simplificación final, falta traza por pasos |
| RF-03 / SCRUM-7 | Asociar explicación comprensible a cada transformación realmente aplicada | `RuleGroup` sólo sirve de referencia | Auditoría: no hay modelo ni renderizado de pasos | PENDIENTE: no se debe presentar la referencia de leyes como explicación de la resolución |
| RF-04 / SCRUM-8 | Mostrar 2^n filas con asignaciones y salida correctas | `calculateExpression`, `evaluateAst`, tabla React | Casos AND/XOR, E2E tabla de cuatro filas, evaluación exhaustiva de tres variables | COMPLETADO en casos probados; implementación limitada a 12 variables, rendimiento de 7–12 pendiente |
| RF-05 / SCRUM-9 | Identificar operadores y mostrar sus compuertas en una expresión válida | `SvgLogicCircuit`, `LogicGateNode`, ASCII, DOT, anotación | Unitarias «RF-05 diagramas»; E2E propagación y SVG; capturas reales | COMPLETADO en casos probados; NAND/NOR de varias entradas se interpretan como compuertas n-arias |
| RF-06 / SCRUM-10 | Mostrar resultado de la expresión y simplificaciones equivalentes | `ResultCard`, `formatSOP`, `formatPOS`, tabla | Resultados conocidos; equivalencia de 256 funciones; E2E resultados | COMPLETADO en casos probados; mínimo global no garantizado |

## No funcionales

| ID / Jira | Criterio de aceptación | Componentes | Evidencia / prueba | Estado y límite |
|---|---|---|---|---|
| RNF-01 / SCRUM-11 | Interfaz clara y comprensible para estudiantes | `App`, ayuda de sintaxis, mensajes, pestañas | E2E flujo, capturas revisadas | PARCIALMENTE COMPLETADO: falta estudio de comprensión/usabilidad con público objetivo |
| RNF-02 / SCRUM-12 | Respuesta ≤3000 ms bajo condiciones explícitas | Pipeline completo y renderizado React | 80 mediciones, cuatro entornos, casos de 2–6 variables; máximo observado 274.71 ms | PARCIALMENTE COMPLETADO: cumple en muestra local; no se garantiza para 7–12 variables, dispositivos físicos o producción |
| RNF-03 / SCRUM-13 | Resultados reproducibles y equivalentes para entradas válidas | Parser, evaluador, Q-M, SOP/POS/NAND/NOR | 25 unitarias; 256 funciones × 8 filas × 4 representaciones; repetibilidad | PARCIALMENTE COMPLETADO: dominio grande, optimalidad y pruebas aleatorias extensas pendientes |
| RNF-04 / SCRUM-14 | Uso en navegadores y dispositivos móviles | CSS responsive, regiones desplazables, controles | Chromium, Firefox, WebKit y Pixel 7 emulado; anchos 320/390/768/1440 | PARCIALMENTE COMPLETADO: dispositivos físicos, Safari real y otros SO no verificados |
| RNF-05 / SCRUM-15 | Textos, controles y resultados legibles y operables | Etiquetas, contraste, foco, SVG/ASCII | Axe en tres pestañas × cuatro entornos: sin violaciones detectadas; inspección visual de móvil y escritorio | PARCIALMENTE COMPLETADO: lector de pantalla, zoom, evaluación humana y todas las vistas pendientes |

## Restricciones y decisiones pendientes

- No se recopilan datos de estudiantes ni se guardan cálculos entre recargas.
- No existen cuentas, ejercicios persistentes ni progreso, aunque los pide el DOCX inicial. Resolver esta diferencia con Product Owner y docente.
- La simplificación usa cobertura voraz; equivalencia no significa minimización óptima.
- El cálculo es síncrono y exponencial. Las mediciones actuales definen un subconjunto, no una garantía universal.
- Los cuatro Sprints siguen planificados. La matriz técnica no modifica Jira.
- GitHub Actions remoto, Vercel y despliegue automático: NO VERIFICADOS hasta publicación autorizada y comprobación externa.
