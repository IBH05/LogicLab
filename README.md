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
│   ├── logic/boolean.ts
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

La organización proviene del equipo y corresponde al proyecto Jira **LogicLab-Software**. No se afirman Sprints completados ni cambios realizados en Jira. Ver [SCRUM.md](docs/SCRUM.md).

## Git, CI/CD y Vercel

Se usa el repositorio existente y `main` como rama principal, conservando su commit inicial. El workflow de GitHub Actions instala con `npm ci`, ejecuta unitarias, build y pruebas en tres motores de navegador más móvil emulado. Su ejecución remota está pendiente hasta publicar los archivos.

Vercel debe conectar **IBH05/LogicLab**, raíz `./`, preset **Vite**, build **`npm run build`**, salida **`dist`**, Node **24.x** y rama de producción **main**. `vercel.json` fija los parámetros de build; la conexión Git y la rama de producción se revisan en la cuenta Vercel. No hacen falta rewrites SPA ni variables de entorno. La automatización de despliegues y la URL final sólo se darán por verificadas después de un despliegue real.

La publicación pública requiere aprobación porque los documentos originales incluyen nombres personales y metadatos de autor. No se deben incluir tokens ni documentos académicos en recursos públicos del sitio. Ver [despliegue](docs/DESPLIEGUE.md) y [contribución](docs/CONTRIBUCION.md).

## Documentación académica y límites del alcance

En `evidencia/documentos/` se conservan sin cambios `Diagramas LogicLab.pdf`, `T1 Actividad 5 - Construcción de requisitos y casos de uso - Equipo 3.pdf`, `T1 Actividad 7 - Equipo 3.pdf` y `U1Act1 - Equipo 3.docx`. El inventario SHA-256 permite comprobar identidad con los originales de raíz. `evidencia/codigo-original/` contiene el TSX previo a la integración.

El DOCX inicial exige una base de datos, usuarios, ejercicios, historial y progreso. Esas funciones no existen en el código recibido y necesitan reconciliarse con el alcance posterior sin cuentas. No se considera completa la propuesta académica global.

Mejoras pendientes: trazas educativas para RF-02/RF-03, revisión con estudiantes, definición del alcance persistente, cálculo en Web Worker, presupuestos de tiempo, cobertura más amplia de funciones grandes, accesibilidad manual y pruebas en dispositivos físicos. No hay una licencia del proyecto definida; no se agregó un archivo de licencia ni se concede una licencia por inferencia.
