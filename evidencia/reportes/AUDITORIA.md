# Auditoría del proyecto LogicLab

Fecha local: 15 de octubre de 2026, America/Mexico_City. El entorno UTC registra parte de las ejecuciones el 16 de octubre. Se revisaron los cinco archivos entregados, el Git local y el remoto existente.

## Inventario e integridad

| Original | Tamaño en bytes | Revisión |
|---|---:|---|
| calculadora_booleana.tsx | 58941 | Código completo: parser, evaluador, Q-M, transformadores, diagramas y UI |
| Diagramas LogicLab.pdf | 195718 | Dos páginas de diagramas CU-01 a CU-06, inspección visual |
| T1 Actividad 5 - Construcción de requisitos y casos de uso - Equipo 3.pdf | 810663 | Once páginas: necesidades, RF/RNF, actor, trazabilidad y casos; diagrama revisado visualmente |
| T1 Actividad 7 - Equipo 3.pdf | 324737 | Nueve páginas: factibilidad, costos hipotéticos, riesgos y restricciones |
| U1Act1 - Equipo 3.docx | 992772 | Contenido XML, propiedades y partes del paquete; no se alteró el documento |

Todos permanecen en raíz y tienen copia binaria en `evidencia/documentos/` o `evidencia/codigo-original/`. `inventario-originales.json` registra hashes SHA-256 y comparación positiva. No había capturas Jira, GitHub o Vercel entre los archivos recibidos. Las capturas añadidas corresponden exclusivamente a pruebas locales reales.

La lectura de DOCX se realizó mediante OOXML; no se verificó su maquetación en Word porque no se encontró LibreOffice empaquetado. No se generó ni modificó un DOCX. Para los PDF se extrajo todo el texto; se inspeccionaron visualmente los diagramas, que no eran recuperables como texto. Las extracciones temporales están en `tmp/auditoria/`, fuera de Git.

## Hallazgos académicos

La Actividad 5 define seis requisitos funcionales, cinco no funcionales y al estudiante como actor principal. Cita una encuesta de 20 respuestas. Solicita procedimiento paso a paso y explicaciones asociadas, además del resultado. El requisito de tres segundos necesita condiciones de prueba definidas.

Los diagramas incluyen validación de entrada, manejo de errores y consulta de procedimientos. Su presencia en documentación representa requisitos, no prueba de implementación.

La Actividad 7 considera viable un prototipo sujeto a pruebas del motor, comprensión didáctica, rendimiento y recursos. Los importes y retornos financieros son escenarios académicos, no costos o ingresos reales. Plantea crecimiento exponencial de tablas y revisión de licencias y privacidad. No define cuentas ni roles administrativos.

El DOCX inicial solicita base de datos, entidades relacionadas, usuarios, ejercicios, resultados, historial y progreso; además desaconseja proyectos reducidos a calculadoras. Esta exigencia no se satisface con el TSX recibido. Debe reconciliarse con los PDF posteriores y el alcance actual antes de aprobar el proyecto académico global.

## Código original

- Sólo importaba React y `lucide-react`; las clases Tailwind no tenían compilación configurada.
- Faltaban `package.json`, lockfile, HTML, entrada React, configuración de TypeScript/Vite, estilos, pruebas y CI.
- El archivo tenía extensión TSX, pero parámetros y campos de clase sin tipar. Se tiparon con TypeScript estricto.
- Incluía tablas, SOP/POS, minterms/maxterms, NAND/NOR, SVG, ASCII, DOT, reglas, ejemplos y teclado.
- No incluía traza de simplificación ni explicaciones por paso. Una lista de leyes no satisface RF-03.
- El tokenizador omitía caracteres no reconocidos; por ejemplo `A&` se aceptaba como `A`. También aceptaba asignaciones mal formadas y omitía 0/1.
- La conversión NOR utilizaba la polaridad del complemento sin invertirla. Para entrada `A`, generaba su negación.
- El ejemplo `A + BC` era ambiguo para el lector: `BC` se procesa como una variable. Se corrigió el ejemplo a `A + B*C` y se explicó la gramática.
- La cobertura final Q-M es voraz: las etiquetas “mínima” y “exacta” podían interpretarse como garantía de minimización óptima. Se ajustaron los títulos visibles y se documentó el límite.
- El cálculo es síncrono, con hasta 4096 filas y complejidad variable; el límite de variables no demuestra un tiempo máximo.
- Había controles sin etiquetas asociadas, regiones desplazables no enfocables y contraste insuficiente. Se corrigieron durante la validación.

## Git y publicación

El directorio ya estaba inicializado en `main`, sin commits locales. `origin` apuntaba al repositorio solicitado. El remoto tenía un commit `0dff94d` con README. Se inspeccionó ese archivo y se integró el historial por avance rápido antes de ampliar el README. No se creó repositorio ni se forzó ningún push.

La API GitHub indica repositorio público y rama predeterminada `main`. Antes de publicar la nueva evidencia se necesita la autorización de visibilidad solicitada por el usuario.

## Revisión de datos personales

Los documentos contienen los nombres del equipo y el de la docente **Alma Lilia Núñez González**; los PDF incluyen nombres o alias de autor (`Alefa232`, `R DG`), fechas e identificadores internos de Canva. El DOCX contiene metadatos y esquemas de biblioteca documental/SharePoint. No se encontraron contraseñas o tokens en el código ni en el texto académico revisado. Esto no sustituye una revisión forense de todos los bytes de los originales.

La publicación de documentos originales en el repositorio público queda pendiente de autorización informada. Si se decide proteger nombres o metadatos, se necesitaría acordar cómo conservar originales íntegros y publicar copias sanitizadas; no se modificaron ni sanitizaron sin autorización. La aplicación no requiere los documentos para funcionar y `dist/` no los contiene.
