# LogicLab

Aplicación web educativa para aprender álgebra booleana mediante expresiones, tablas de verdad, simplificación y circuitos lógicos interactivos. El prototipo conserva la interfaz y el motor del archivo original `calculadora_booleana.tsx`, integrados en React, TypeScript y Vite.

## Problema, público y objetivos

Los documentos académicos describen dificultades de estudiantes para resolver expresiones lógicas y comprender su procedimiento. La propuesta reúne herramientas que normalmente consultan por separado: tablas, simplificaciones, reglas y compuertas. La encuesta citada en los PDF tiene 20 participantes; no constituye por sí sola una validación del producto ni un estudio comercial concluyente.

El público principal son estudiantes de nivel medio superior y superior en sistemas digitales, electrónica, arquitectura de computadoras, programación, matemáticas discretas y álgebra booleana. Los docentes pueden utilizar la visualización como apoyo en clase.

**Objetivo general:** facilitar el aprendizaje y análisis del álgebra booleana con una herramienta web interactiva, verificable y comprensible.

**Objetivos específicos:**

1. Permitir introducir y validar expresiones lógicas.
2. Mostrar resultados simplificados y tablas de verdad consistentes.
3. Relacionar operadores con compuertas y visualizar la propagación de valores.
4. Incorporar posteriormente un procedimiento paso a paso con explicación de cada transformación.
5. Verificar legibilidad, compatibilidad y respuesta máxima de tres segundos bajo condiciones definidas.

## Funcionalidades disponibles

- Entrada por teclado físico o virtual y cinco ejemplos precargados.
- Operadores AND, OR, XOR y NOT, paréntesis y asignación opcional `F = ...`.
- Constantes 0 y 1; errores ante entradas vacías, símbolos desconocidos o sintaxis inválida.
- Tabla de verdad, minterms, maxterms y formas canónicas.
- SOP y POS mediante Quine-McCluskey con cobertura final voraz.
- Representaciones algebraicas NAND y NOR; cada grupo de múltiples operandos representa una compuerta de múltiples entradas.
- Circuito SVG, árbol ASCII, código Graphviz DOT y evaluación de una fila en el circuito.
- Referencia de leyes booleanas y copiado de resultados.
- **Estructura común:** una sola cabecera fija y un solo pie en todas las vistas, un `h1` por página y un sistema de diseño con tokens (`src/styles.css`) y componentes base (`src/components/ui.tsx`).
- **Página de inicio** con una demostración de un circuito real (medio sumador o mayoría de 3: interruptores, LED, tabla con la fila activa y botón para abrirlo en el editor; se maneja con ratón o teclado), módulos con capturas de la aplicación, el caso de la alarma resuelto en cinco pasos (sus cifras salen del propio motor), ruta de aprendizaje y preguntas frecuentes. Las capturas de `public/capturas/` se regeneran con `npm run build`, `npx vite preview --port 4173` y `npm run capturas` (opcional: `CHROMIUM_PATH` apunta a un Chromium ya instalado). Hay enlaces directos (`#/calculadora`, `#/editor`, `#/ejercicios`) y funcionan los botones atrás/adelante del navegador.
- **Mapa de Karnaugh** de 1 a 5 variables (5 = dos mapas), con los grupos del resultado SOP resaltados.
- **Editor de circuitos drag & drop** (pestaña «Editor de circuitos»): se arrastran entradas, salidas y compuertas NOT, AND, OR, NAND, NOR, XOR y XNOR (AND/OR/NAND/NOR de 2 a 4 entradas) y se conectan con cables. Las entradas son interruptores y las salidas LED; los cables se colorean según el valor de la señal.
- **Análisis en vivo del circuito dibujado:** tabla de verdad (por simulación directa), expresión, SOP/POS/NAND/NOR, procedimiento de simplificación, Karnaugh, **caminos** entrada → salida con su retardo en niveles de compuertas, y **costo** (compuertas, entradas y circuitos integrados 74xx estimados).
- **Transformaciones con deshacer:** simplificar el circuito, reconstruirlo solo con NAND o solo con NOR, y dibujar un circuito desde una expresión (varias salidas separadas por `;`). La calculadora puede abrir su expresión en el editor.
- **Tutorial guiado** de 10 pasos en el editor: se inicia solo la primera vez, resalta la compuerta de la paleta que toca usar y avanza al detectar que el paso se cumplió (agregar entradas, compuerta y salida, cablear, encender). Se puede omitir y repetir con el botón «Tutorial»; que ya se vio se recuerda en el navegador.
- Deshacer/rehacer, zoom, acomodo automático, autoguardado en el navegador, y exportar/importar JSON, SVG y PNG.
- **Ruta de aprendizaje** (pestaña «Ejercicios»): 27 problemas de electrónica digital en 6 unidades ordenadas por dificultad (compuertas, tablas de verdad, expresiones, simplificación, circuitos y NAND/NOR). Cada unidad muestra su progreso; el botón «Continuar» retoma el siguiente ejercicio pendiente y al terminar un ejercicio se ofrece el siguiente. Los tipos son escribir la expresión, simplificar, completar tablas de verdad y armar circuitos con restricciones como «solo NAND, máximo 4 compuertas». La respuesta se verifica por **equivalencia lógica**, no por texto, y ante un error se muestra una fila concreta donde difiere. Incluye pistas progresivas, solución (ver la solución anula el progreso de ese ejercicio) y un generador aleatorio de 3 a 5 variables que queda aparte, en «Práctica libre». El orden es una recomendación: ninguna unidad está bloqueada. El progreso se guarda solo en este navegador.

Límites del editor y de los ejercicios: no hay realimentación (los ciclos se rechazan; solo circuitos combinacionales), no se detectan riesgos (*hazards*) y el retardo se mide en niveles de compuertas, no en tiempo. La estimación de chips no reparte compuertas sobrantes entre tipos distintos. Los símbolos son ANSI/IEEE; no hay símbolos IEC. Los ejercicios de simplificar comparan literales contra una solución obtenida con el mismo algoritmo voraz, por lo que una respuesta con menos literales también se acepta. El progreso vive en `localStorage`: no hay cuentas, ni sincronización, ni historial entre dispositivos. En pantallas táctiles el arrastre desde la paleta no está soportado por el navegador: se usa un toque para agregar la compuerta y se arrastra para moverla y cablearla (esa interacción táctil no se ha probado en dispositivos físicos).

La cobertura voraz **no garantiza un mínimo global**. La referencia de leyes no explica cada paso de una resolución. La exportación DOT es texto; Graphviz no es una dependencia de la aplicación.

### Sintaxis y límites

| Operación | Entrada aceptada |
|---|---|
| AND | `A*B`, `A·B`, `A AND B` |
| OR | `A+B`, `A OR B` |
| XOR | `A^B`, `A XOR B` |
| NOT | `!A`, `A'`, `NOT A` |
| Agrupación | `(A+B)*C` |
| Constantes | `A+0`, `A*1`, `0`, `1` |
| Etiqueta opcional | `F = A+B` |

Precedencia: paréntesis/NOT → AND → XOR → OR. `Pwr` y `BC` son nombres de variables; para multiplicar B y C se requiere `B*C`. Los nombres distinguen mayúsculas y minúsculas. La tabla comparativa muestra también notaciones educativas que no son necesariamente sintaxis de entrada: `∧`, `∨`, `¬` y `⊕` no se aceptan.

La entrada admite hasta 2000 caracteres. Con más de 12 variables se omiten tabla y simplificación, conservando el diagrama original. El límite de 12 variables no garantiza tiempos menores de tres segundos: el costo del algoritmo depende de la función. Las expresiones grandes necesitan trabajo adicional de rendimiento.

## Tecnologías y arquitectura

| Tecnología | Uso real |
|---|---|
| React y React DOM | Interfaz y estado local |
| TypeScript estricto | Tipado de AST, resultados y componentes |
| Vite | Desarrollo y compilación de producción |
| Tailwind CSS | Estilos de la interfaz original |
| Lucide React | Iconos |
| Vitest | Pruebas unitarias del motor |
| Playwright y axe-core | Navegadores, responsive, accesibilidad y tiempos |
| Git / GitHub Actions | Historial y configuración CI |
| Vercel | Destino de despliegue preparado, conexión pendiente |

Las versiones exactas se registran en `package-lock.json`. El navegador procesa toda expresión; no hay API ni base de datos. `src/logic/boolean.ts` contiene el motor independiente de React, y `src/App.tsx` mantiene la interfaz y el renderizado SVG. Ver [arquitectura](docs/ARQUITECTURA.md).

```text
LogicLab/
├── .github/workflows/ci.yml
├── docs/
│   ├── ARQUITECTURA.md
│   ├── REQUISITOS.md
│   ├── SCRUM.md
│   ├── PRUEBAS.md
│   ├── DESPLIEGUE.md
│   └── CONTRIBUCION.md
├── evidencia/
│   ├── documentos/       # Copias binarias de los cuatro originales académicos
│   ├── codigo-original/  # TSX original sin modificaciones
│   ├── capturas/         # Capturas reales de pruebas locales
│   ├── pruebas/          # Resultados reales, incluidos fallos iniciales
│   └── reportes/         # Auditoría, hashes e informe de configuración
├── public/               # Sin documentos académicos
├── scripts/audit-documents.py
├── src/
│   ├── logic/
│   │   ├── boolean.ts        # motor: parser, tabla, Quine-McCluskey, NAND/NOR
│   │   ├── circuit.ts        # grafo de compuertas, simulación, caminos, costo, conversión
│   │   ├── karnaugh.ts       # mapas de Karnaugh
│   │   └── exercises.ts      # banco, verificación y generador de ejercicios
│   ├── components/           # CircuitEditor, CircuitAnalysis, KarnaughView, ExercisesView
│   ├── Shell.tsx             # navegación calculadora / editor / ejercicios
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── tests/{unit,e2e}/
├── calculadora_booleana.tsx  # Original conservado también en raíz
├── *.pdf / *.docx           # Originales conservados también en raíz
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── vercel.json
└── README.md
```

## Instalación y uso local

Requisitos: Git, Node.js **24.x**, npm y un navegador moderno. No se necesitan secretos ni variables de entorno.

```sh
git clone https://github.com/IBH05/LogicLab.git
cd LogicLab
npm ci
npm run dev
```

Abrir la URL que muestra Vite, normalmente `http://127.0.0.1:5173`. Hasta publicar esta entrega, el remoto puede contener sólo su README inicial; los archivos preparados ya están disponibles en el directorio local del proyecto.

### Producción

```sh
npm run build
npm run preview
```

`build` ejecuta TypeScript y genera `dist/`. `preview` permite revisar la compilación en `http://127.0.0.1:4173`. Los originales y la carpeta evidencia no se incluyen en el bundle.

### Pruebas

```sh
npm run typecheck
npm test
npx playwright install chromium firefox webkit
npm run build
npm run test:e2e
```

`npm run check` reúne unitarias, build y pruebas de navegador. En Linux, la instalación de navegadores puede necesitar `npx playwright install --with-deps chromium firefox webkit`. Los informes JSON se escriben en `evidencia/pruebas/` y las capturas de los flujos en `evidencia/capturas/`. La ejecución actual sobrescribe esos resultados; archivar una copia si se desea comparar campañas.

No se configuró un linter de estilo. Las pruebas no acreditan revisión didáctica con estudiantes ni compatibilidad en dispositivos físicos. Alcance, resultados y condiciones en [PRUEBAS.md](docs/PRUEBAS.md).

## Requisitos y estado

| ID | Requisito | Estado de implementación / validación |
|---|---|---|
| RF-01 | Ingresar expresiones lógicas | Implementado; sintaxis y errores cubiertos por pruebas |
| RF-02 | Simplificación paso a paso | Parcial: resultado simplificado disponible; pasos pendientes |
| RF-03 | Explicar cada paso | Pendiente; sólo existe referencia de leyes |
| RF-04 | Generar y mostrar tabla de verdad | Implementado hasta 12 variables; validación con casos acotados |
| RF-05 | Identificar compuertas lógicas | Implementado en SVG, ASCII y DOT; probado con propagación |
| RF-06 | Mostrar resultado final | Implementado; validación de equivalencias y flujo de interfaz |
| RNF-01 | Interfaz clara | Parcial; estructura comprobada, aceptación con estudiantes pendiente |
| RNF-02 | Respuesta máxima de 3 segundos | Medición local acotada; no garantizada para todo el dominio |
| RNF-03 | Consistencia y confiabilidad | Pruebas de equivalencia; validación completa del dominio pendiente |
| RNF-04 | Navegadores y móviles | Pruebas automatizadas; dispositivos físicos pendientes |
| RNF-05 | Legibilidad y accesibilidad | Correcciones y auditoría automática; revisión manual integral pendiente |

La [matriz de trazabilidad](docs/REQUISITOS.md) relaciona requisitos, Jira, componentes, pruebas y límites de aceptación.

## Equipo, Scrum y Jira

**Isauro Bucio Hurtado**, Product Owner y desarrollador frontend: priorización de requisitos, interfaz, experiencia de usuario, resultados, compatibilidad y accesibilidad.

**Ángel Raúl De Labastida Guzmán**, Scrum Master y desarrollador del motor lógico: coordinación Scrum, expresiones booleanas, algoritmos, pruebas funcionales y rendimiento. Ambos colaboran en desarrollo, documentación y validación.

| Sprint planificado | Enfoque | Tareas y responsables |
|---|---|---|
| 1 | Diseño e interfaz | SCRUM-5 / RF-01: Ángel Raúl; SCRUM-11 / RNF-01 y SCRUM-15 / RNF-05: Isauro |
| 2 | Motor lógico | SCRUM-6 / RF-02 y SCRUM-13 / RNF-03: Ángel Raúl; SCRUM-10 / RF-06: Isauro |
| 3 | Funciones educativas | SCRUM-7 / RF-03 y SCRUM-9 / RF-05: Isauro; SCRUM-8 / RF-04: Ángel Raúl |
| 4 | Pruebas y optimización | SCRUM-12 / RNF-02: Ángel Raúl; SCRUM-14 / RNF-04: Isauro |

La organización proviene del equipo y corresponde al proyecto Jira **LogicLab-Software**. No se afirman Sprints completados ni cambios realizados en Jira. Ver [SCRUM.md](docs/SCRUM.md). El trabajo existente se agrupa por Sprint, con sus commits como evidencia y sin fechas inventadas, en [SPRINTS.md](docs/SPRINTS.md).

## Git, CI/CD y Vercel

Se usa el repositorio existente y `main` como rama principal, conservando su commit inicial. El workflow de GitHub Actions instala con `npm ci`, ejecuta unitarias, build y pruebas en tres motores de navegador más móvil emulado. Su ejecución remota está pendiente hasta publicar los archivos.

Vercel debe conectar **IBH05/LogicLab**, raíz `./`, preset **Vite**, build **`npm run build`**, salida **`dist`**, Node **24.x** y rama de producción **main**. `vercel.json` fija los parámetros de build; la conexión Git y la rama de producción se revisan en la cuenta Vercel. No hacen falta rewrites SPA ni variables de entorno. La automatización de despliegues y la URL final sólo se darán por verificadas después de un despliegue real.

La publicación pública requiere aprobación porque los documentos originales incluyen nombres personales y metadatos de autor. No se deben incluir tokens ni documentos académicos en recursos públicos del sitio. Ver [despliegue](docs/DESPLIEGUE.md) y [contribución](docs/CONTRIBUCION.md).

## Documentación académica y límites del alcance

En `evidencia/documentos/` se conservan sin cambios `Diagramas LogicLab.pdf`, `T1 Actividad 5 - Construcción de requisitos y casos de uso - Equipo 3.pdf`, `T1 Actividad 7 - Equipo 3.pdf` y `U1Act1 - Equipo 3.docx`. El inventario SHA-256 permite comprobar identidad con los originales de raíz. `evidencia/codigo-original/` contiene el TSX previo a la integración.

El DOCX inicial exige una base de datos, usuarios, ejercicios, historial y progreso. Esas funciones no existen en el código recibido y necesitan reconciliarse con el alcance posterior sin cuentas. No se considera completa la propuesta académica global.

Mejoras pendientes: trazas educativas para RF-02/RF-03, revisión con estudiantes, definición del alcance persistente, cálculo en Web Worker, presupuestos de tiempo, cobertura más amplia de funciones grandes, accesibilidad manual y pruebas en dispositivos físicos. No hay una licencia del proyecto definida; no se agregó un archivo de licencia ni se concede una licencia por inferencia.
