# Pruebas de LogicLab

## Resultados observados

Campaña local del 15 de octubre de 2026 (America/Mexico_City; los JSON usan UTC). Windows, Node.js 24.12.0, npm 10.8.1, AMD Ryzen 5 5600G. Se probó la compilación de producción mediante Vite Preview en `127.0.0.1:4173`.

| Validación | Resultado real | Evidencia |
|---|---|---|
| Instalación de dependencias | Instalación completada; auditoría inicial sin vulnerabilidades reportadas | `package-lock.json`; ver registro final de instalación en evidencia |
| TypeScript estricto | Aprobado | `npm run typecheck`, incluido en build |
| Build Vite | Aprobado; HTML, CSS y JS en dist | Registro de compilación y lista de salida |
| Unitarias iniciales | 18 aprobadas, 7 fallidas de 25 | `unitarias-antes-correcciones.json` |
| Unitarias después de correcciones | 25 aprobadas, 0 fallidas | `unitarias.json` |
| Primer ciclo navegador | 12 aprobadas, 4 fallidas por accesibilidad | `navegadores-antes-correcciones.json`; durante esta campaña se actualizó el build, por lo que sólo se conserva como diagnóstico |
| Segundo ciclo completo sobre build estable | 16 aprobadas, 0 fallidas, 43.6 s | `navegadores.json` |
| Axe | 0 violaciones detectadas en tres pestañas por cada uno de cuatro proyectos | `accesibilidad-{proyecto}-{pestaña}.json` |
| Responsive | Sin desbordamiento horizontal del documento en 320, 390, 768 y 1440 px, con referencia de reglas abierta | Prueba «diseño adaptable y teclado» |
| Integridad documental | 5 originales con copias SHA-256 idénticas | `../evidencia/reportes/inventario-originales.json` |
| Producción Vercel y CI remoto | NO VERIFICADO | No hay despliegue ni ejecución remota acreditados |

Los archivos citados por nombre se encuentran en `evidencia/pruebas/`, salvo indicación contraria. Los JSON son evidencia primaria; las cifras de esta página describen la campaña indicada y pueden cambiar al repetirla.

## Pruebas del motor

`tests/unit/boolean.test.ts` verifica palabras y símbolos AND, etiqueta opcional, NOT, identificadores multiletra, precedencia, XOR, constantes, `__proto__`, entradas vacías, símbolos no válidos, asignaciones erróneas, paréntesis incompletos, identidades booleanas, determinismo y límite superior de variables.

Se enumeran **las 256 funciones booleanas de tres variables**, se simplifican sus minterms y maxterms y se comprueban SOP, POS, NAND y NOR en las ocho asignaciones: **8192 comparaciones de equivalencia**, además de las aserciones estructurales del evaluador independiente NAND/NOR. Esto no es una prueba exhaustiva de funciones de más de tres variables.

Las siete pruebas iniciales fallidas demostraron omisión de caracteres, aceptación de asignaciones inválidas, falta de constantes y polaridad NOR incorrecta. Se conserva el informe previo. Las modificaciones se limitaron a esas causas, tipado, aislamiento del motor y mejoras de accesibilidad/configuración.

## Pruebas del navegador

Cada proyecto Playwright ejecuta cuatro pruebas: flujo con errores y resultados, teclado/responsive, accesibilidad y rendimiento. Versiones verificadas: Chromium 156.0.8078.4, Firefox 157.0 y WebKit 27.2. El proyecto móvil usa Chromium con emulación Pixel 7; no representa una ejecución en teléfono físico. WebKit de Playwright tampoco equivale a probar Safari instalado en iOS/macOS.

Se comprobaron entrada vacía, `A&`, tabla de `A+A*B`, validación interna, formas canónicas, resultados NAND/NOR, selección de fila y propagación en SVG/ASCII. Se conservaron ocho capturas reales, tabla y circuito por proyecto. Se revisaron visualmente la tabla móvil y el circuito de escritorio.

Axe se ejecutó con reglas WCAG 2 A/AA y 2.1 AA en Tabla de Verdad, Simplificación y Diagrama Lógico. Se corrigieron contraste, enlace distinguible, nombre accesible de controles y foco del circuito desplazable. Cero violaciones detectadas no certifica conformidad completa: faltan revisión con lector de pantalla, navegación integral por teclado, zoom, otras vistas y evaluación humana.

RF-02 y RF-03 se revisaron en código y UI: no hay pasos ni explicación por transformación; la aplicación informa esa limitación. No se registran como pruebas funcionales aprobadas de esas características.

## RNF-02: condiciones de rendimiento

- Build de producción local, página ya cargada; red y CPU sin throttling.
- Cuatro expresiones: `A+B`, `(A+B)*(A'+C)+B*C`, `A^B^C^D^E^F` y `(A+B+C)*(D+E+F)`.
- Cinco repeticiones de cada expresión por proyecto: 20 por entorno, 80 en total.
- Medición desde antes del clic automatizado hasta tabla con número esperado de filas y dos `requestAnimationFrame`. Incluye sobrecarga del controlador; no mide carga inicial de página.
- Umbral comprobado en cada muestra: menos de 3000 ms.

| Entorno | Máximo observado |
|---|---:|
| Chromium | 132.43 ms |
| Firefox | 135.12 ms |
| WebKit | 274.71 ms |
| Móvil emulado | 116.72 ms |

Los valores exactos, CPU, versiones y fechas están en `rendimiento-*.json`. Se cumple el umbral en esta muestra de 2–6 variables; quedan sin verificar las funciones costosas de 7–12 variables, hardware móvil, producción, carga inicial y dispositivos lentos. El algoritmo síncrono y exponencial requiere trabajo adicional antes de garantizar RNF-02 en todo el dominio permitido.

## Reproducibilidad

```sh
npm ci
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

En Linux/CI usar `npx playwright install --with-deps chromium firefox webkit`. El workflow está preparado pero su ejecución en GitHub está pendiente. Las pruebas escriben resultados en evidencia sin publicarlos automáticamente. Los resultados anteriores se sobrescriben salvo copias archivadas explícitamente.

El script opcional `scripts/audit-documents.py` necesita Python y `pypdf`; se usó el Python empaquetado de Codex con pypdf ya disponible. Python no es una dependencia de ejecución ni del build de LogicLab. La maquetación DOCX no se validó mediante renderizado; los originales no se modificaron.
