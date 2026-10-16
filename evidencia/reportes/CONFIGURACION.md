# Informe de configuración de LogicLab

Fecha: 15 de octubre de 2026, America/Mexico_City. Directorio: `C:\Users\PC\Desktop\LogicLab`.

## Resultado y estados

| Entregable | Estado | Evidencia / observación |
|---|---|---|
| Auditoría de código y documentos | COMPLETADO | `AUDITORIA.md`; revisión del DOCX por XML, sin validación de maquetación |
| Respaldo de originales | COMPLETADO | Cinco copias binarias idénticas, hashes en `inventario-originales.json`; originales de raíz conservados |
| React + TypeScript + Vite | COMPLETADO | TypeScript estricto, entrada HTML/React, Tailwind y Lucide |
| Instalación reproducible | COMPLETADO | `npm ci`, lockfile y auditoría sin vulnerabilidades reportadas |
| Compilación y uso local | COMPLETADO | Build aprobado; servidor `http://127.0.0.1:5173/` responde HTTP 200 |
| Pruebas automatizadas | COMPLETADO dentro del alcance definido | 25 unitarias y 16 E2E aprobadas; 80 mediciones bajo 3000 ms |
| README y documentación | COMPLETADO | Seis documentos técnicos, matriz de trazabilidad e informes |
| Git local y vinculación | COMPLETADO | main sigue origin/main; historial inicial conservado; entrega registrada en un commit local descriptivo |
| Código y evidencia publicados | PENDIENTE | Falta autorización para publicar originales con nombres y metadatos en un repositorio público |
| GitHub Actions | PARCIALMENTE COMPLETADO | Workflow creado; ejecución remota NO VERIFICADA |
| Configuración Vercel | PARCIALMENTE COMPLETADO | `vercel.json` y exclusiones preparados |
| Acceso a Vercel | PENDIENTE | `vercel whoami` devuelve Logged out; navegador conectado no disponible |
| Despliegue y automatización GitHub–Vercel | PENDIENTE / NO VERIFICADO | Sin URL acreditada, sin conexión comprobada y sin despliegue ejecutado |
| Aceptación integral del producto | PARCIALMENTE COMPLETADO | RF-02/RF-03 incompletos, RNF con validación acotada y alcance de base de datos pendiente |

## Árbol de entrega

```text
LogicLab/
  .github/workflows/ci.yml
  .gitattributes
  .gitignore
  .nvmrc
  .vercelignore
  README.md
  docs/
    ARQUITECTURA.md
    REQUISITOS.md
    SCRUM.md
    PRUEBAS.md
    DESPLIEGUE.md
    CONTRIBUCION.md
  evidencia/
    documentos/       (3 PDF y 1 DOCX sin alteraciones)
    codigo-original/  (calculadora_booleana.tsx sin alteraciones)
    capturas/         (8 PNG reales y README de procedencia)
    pruebas/          (JSON y registros TXT de ejecuciones reales)
    reportes/         (auditoría, configuración, hashes y verificación)
  public/.gitkeep
  scripts/
    audit-documents.py
    verify-delivery.mjs
  src/
    App.tsx
    main.tsx
    styles.css
    logic/boolean.ts
  tests/
    unit/boolean.test.ts
    e2e/app.spec.ts
  index.html
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  playwright.config.ts
  vercel.json
  calculadora_booleana.tsx  (original)
  Diagramas LogicLab.pdf  (original)
  T1 Actividad 5 - Construcción de requisitos y casos de uso - Equipo 3.pdf
  T1 Actividad 7 - Equipo 3.pdf
  U1Act1 - Equipo 3.docx
```

`node_modules/`, `dist/`, `tmp/` y resultados temporales de Playwright no se versionan. `evidencia/` sí se incluye. `dist/` sólo contiene el HTML, CSS, JS y el marcador vacío de public; no contiene documentos académicos ni código original.

## Archivos creados y modificados

Se crearon todos los archivos de configuración, fuentes bajo `src/`, pruebas, workflow, seis documentos bajo `docs/`, scripts e informes mostrados en el árbol. Las copias de documentos y TSX se añadieron bajo evidencia. Los informes JSON, registros TXT y capturas PNG fueron generados por herramientas reales, sin fabricación de resultados.

El único archivo previamente versionado modificado es `README.md`, ampliado desde las dos líneas existentes en el remoto. Los cinco originales locales no se modificaron. `src/App.tsx` y `src/logic/boolean.ts` son derivados nuevos del TSX conservado, con tipado y correcciones documentadas.

## Dependencias instaladas

| Tipo | Paquetes | Justificación |
|---|---|---|
| Ejecución | react, react-dom, lucide-react | Interfaz existente y sus iconos |
| Build y tipos | vite, @vitejs/plugin-react, typescript, @types/react, @types/react-dom, @types/node | Compilación, HMR y tipado estricto |
| Estilos | tailwindcss, @tailwindcss/vite | Compilar las clases de la interfaz original |
| Pruebas | vitest, @playwright/test, @axe-core/playwright | Motor, navegadores, rendimiento y accesibilidad |

Las versiones y licencias declaradas de dependencias directas se registran en `verificacion-entrega.json`; el árbol exacto está fijado por `package-lock.json`. No se agregó licencia del proyecto. Vercel CLI se ejecutó mediante npx, sin añadirlo a dependencias de LogicLab. Los navegadores de Playwright se instalaron en la caché de usuario, fuera del repositorio.

Para leer los documentos se usaron Python/pypdf y Poppler empaquetados de Codex. Un intento inicial de instalar pypdf/PyMuPDF con el Python del sistema falló al escribir su ejecutable; no se depende de esa instalación. El proyecto web no requiere Python.

## Comandos principales utilizados

```sh
git status --short --branch
git remote -v
git ls-remote origin
git fetch origin
git log origin/main --oneline -5
git ls-tree -r --name-only origin/main
git show origin/main:README.md
git merge --ff-only origin/main
git branch --set-upstream-to=origin/main main
npm install react react-dom lucide-react
npm install -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest @playwright/test @axe-core/playwright
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm audit --json
npm run dev -- --port 5173 --strictPort
npx --yes vercel whoami
node scripts/verify-delivery.mjs
git diff --check
git diff --cached --check -- . ':!calculadora_booleana.tsx' ':!evidencia/codigo-original/calculadora_booleana.tsx'
git -c credential.interactive=never push --dry-run origin main
git commit -m "chore: configurar LogicLab con Vite, pruebas y evidencia auditada"
```

Además se utilizaron lecturas con PowerShell, copias con `Copy-Item`, revisión de hashes, extracción de documentos mediante `scripts/audit-documents.py`, renderizado de páginas PDF con `pdftoppm` y consulta de la API pública de GitHub. Se revisó documentación oficial de Vite/Vercel, enlazada en `docs/DESPLIEGUE.md`. El push se comprobó únicamente con `--dry-run`, sin publicar datos. No se ejecutó deploy, creación de repositorio ni modificación de Jira. La revisión de espacios de los archivos nuevos de trabajo aprobó; los espacios originales del TSX archivado se conservan intencionalmente para mantener su hash.

## Pruebas y requisitos

La evidencia completa está en `docs/PRUEBAS.md` y `evidencia/pruebas/`. La matriz en `docs/REQUISITOS.md` relaciona cada RF/RNF con su Jira, componente, prueba y alcance.

- RF-01, RF-04, RF-05 y RF-06: implementados y verificados en los casos documentados.
- RF-02: PARCIALMENTE COMPLETADO; entrega resultado simplificado, pero no pasos.
- RF-03: PENDIENTE; no existe explicación por transformación.
- RNF-01 a RNF-05: PARCIALMENTE COMPLETADOS; existen controles y validaciones técnicas, pero falta aceptación humana, mayor cobertura o dispositivos reales según requisito.
- Rendimiento: 80 mediciones entre cuatro entornos, máximo 274.71 ms en la campaña documentada. No se extrapola a todas las funciones de 12 variables ni a producción.
- Los cuatro Sprints siguen planificados; no se cambiaron sus estados.

## Problemas y soluciones

| Hallazgo | Solución / situación |
|---|---|
| TSX aislado sin entorno ejecutable | Integración React/Vite, dependencias y TypeScript estricto |
| Tailwind sin pipeline | Compilación con plugin Vite de Tailwind, preservando clases |
| Caracteres desconocidos omitidos | Tokenización contigua y error explícito |
| Asignaciones inválidas aceptadas | Validación de etiqueta y única asignación |
| Constantes 0/1 ignoradas | Hojas reservadas y evaluación consistente |
| NOR devuelve polaridad incorrecta | Inversión de literales derivados del complemento, regresión verificada |
| Ejemplo con multiplicación implícita ambigua | Ejemplo explícito B*C y ayuda sobre identificadores |
| Garantía incorrecta de mínimo global | Títulos corregidos y cobertura voraz documentada |
| Etiquetas, foco y contraste insuficientes | Asociación de label, nombres accesibles, foco, contraste y enlace subrayado |
| Historial remoto existente | Integración por avance rápido, sin sobrescritura ni force push |
| Alcances académicos contradictorios | Discrepancia documentada; decisión de equipo/docente pendiente |
| Sin sesión Vercel | Autenticación mediante `npx vercel login` pendiente; no pedir contraseñas por chat |

## Enlaces y pendientes externos

GitHub: https://github.com/IBH05/LogicLab. Visibilidad remota comprobada: pública. Vercel: **URL pendiente**, sin despliegue confirmado. Conexión GitHub–Vercel: **NO VERIFICADA**.

Se necesita autorización para publicar en GitHub el código y la carpeta evidencia completa, incluidos nombres del equipo, de la docente y metadatos originales, y para hacer visible públicamente la aplicación en Vercel. Después se debe iniciar sesión en Vercel, importar o revisar el proyecto existente, conectar únicamente el repositorio indicado, fijar main, desplegar y verificar URL, commit, funcionalidad y automatización. La configuración local no equivale a una publicación realizada.
