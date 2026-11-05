# Implementación PostgreSQL de LogicLab

## 1. Introducción

LogicLab es una aplicación educativa de álgebra booleana. Esta actividad implementa el esquema PostgreSQL entregado para soportar usuarios, ejercicios, intentos, historial y progreso.

La fuente principal fue `LogicLab_Esquema_PostgreSQL.sql`. El archivo original no fue sustituido ni modificado. Los diagramas conceptual, lógico y físico se conservaron sin cambios.

## 2. Objetivo

Crear una base PostgreSQL real, comprobar su estructura contra los modelos de datos, ejecutar pruebas de integridad, generar un respaldo en formato Custom y validar una restauración independiente.

## 3. Motor y entorno

- Motor: PostgreSQL.
- Servidor: PostgreSQL 17.7, Windows 64 bits.
- Servicio: `postgresql-x64-17`, estado `Running`, inicio automático.
- Host y puerto: `127.0.0.1:5432`.
- Herramientas: `psql`, `pg_dump` y `pg_restore`, todas versión 17.7.
- Codificación de `logiclab_db`: UTF8.
- Base principal: `logiclab_db`.

La autenticación se realizó mediante `pgpass.conf` local, fuera del repositorio. No se incluyeron credenciales en comandos, documentación ni evidencias.

## 4. Comparación con los modelos

Los tres diagramas representan las mismas cinco entidades/tablas:

- `usuarios`: identidad y acceso.
- `ejercicios`: catálogo de actividades.
- `intentos`: respuestas de usuarios a ejercicios.
- `historial`: operaciones booleanas consultadas.
- `progreso`: resumen por usuario.

La implementación coincide con el modelo conceptual en las relaciones `usuarios 1:N intentos`, `ejercicios 1:N intentos`, `usuarios 1:N historial` y `usuarios 1:1 progreso`. Coincide con el modelo lógico en atributos, identificadores, tipos conceptuales, PK, FK, UNIQUE, NN y CHECK. Coincide con el modelo físico en UUID, `TIMESTAMPTZ`, reglas `ON DELETE` e índices.

El texto del diagrama físico que indica que el progreso se actualiza transaccionalmente se interpreta como decisión de diseño. El SQL no contiene trigger ni procedimiento para calcularlo automáticamente; la aplicación o una transacción explícita debe mantener esos contadores.

## 5. Creación y ejecución

Se comprobó que `logiclab_db` no existía y se creó con:

```sql
CREATE DATABASE logiclab_db WITH ENCODING 'UTF8' TEMPLATE template0;
```

El esquema se ejecutó sin modificarlo:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d logiclab_db -w -X -v ON_ERROR_STOP=1 -a -f "C:\Users\PC\Desktop\LogicLab\T2 Actividad - 3 Diseño del Modelo de Datos\LogicLab_Esquema_PostgreSQL.sql" -o "C:\Users\PC\Desktop\LogicLab\T2 Actividad - 3 Diseño del Modelo de Datos\evidencias_implementacion\estructura\ejecucion_esquema.log"
```

Resultado: código de salida `0` y `COMMIT` completado.

## 6. Tablas y relaciones

### usuarios

`id_usuario UUID` es PK con `gen_random_uuid()`. `correo` es obligatorio y UNIQUE. `nombre` no puede ser vacío después de aplicar `btrim`. `creado_en` usa `TIMESTAMPTZ` y `now()`.

### ejercicios

Contiene título, enunciado, expresión objetivo, respuesta esperada, dificultad, estado activo y fecha de creación. La dificultad permitida es `basico`, `intermedio` o `avanzado`.

### intentos

Relaciona un usuario con un ejercicio. `id_usuario` aplica `ON DELETE CASCADE`; `id_ejercicio` aplica `ON DELETE RESTRICT`. `duracion_ms` es opcional, pero no puede ser negativa.

### historial

Registra expresiones de un usuario. Las operaciones permitidas son `evaluacion`, `simplificacion`, `tabla_verdad` y `diagrama`. El borrado del usuario aplica CASCADE.

### progreso

Usa `id_usuario` simultáneamente como PK y FK, por lo que representa una relación 1:1. Sus contadores son no negativos y `intentos_correctos <= intentos_total`. El borrado del usuario aplica CASCADE.

## 7. Claves, restricciones e índices

La consulta al catálogo confirmó 15 restricciones:

- Cinco PK.
- Una UNIQUE para `usuarios.correo`.
- Cuatro FK.
- Cinco CHECK: nombre, dificultad, duración, operación y contadores.

Se confirmaron nueve índices totales: cinco índices de PK, uno UNIQUE de correo y tres índices explícitos:

- `idx_intentos_usuario_fecha`.
- `idx_intentos_ejercicio`.
- `idx_historial_usuario_fecha`.

`progreso.id_usuario` fue verificado como PK y FK a `usuarios(id_usuario)`.

Aunque no aparece una extensión `pgcrypto`, PostgreSQL 17.7 expone `gen_random_uuid()` en `pg_catalog`; la creación y las inserciones con valores por defecto funcionaron correctamente.

## 8. Pruebas funcionales e integridad

El script independiente `evidencias_implementacion/pruebas/pruebas_funcionales.sql` insertó datos ficticios con correos `@logiclab.example` y hashes de prueba no utilizables para autenticación.

Pruebas aprobadas:

- Generación de UUID para usuarios y ejercicios.
- Campos obligatorios y nombre no vacío.
- Correo UNIQUE.
- Dificultades permitidas y rechazo de dificultad inválida.
- Intentos válidos, respuestas correctas/incorrectas, fecha por defecto y duración opcional.
- FK para usuario y ejercicio.
- Rechazo de duración negativa.
- Operaciones válidas del historial y rechazo de operaciones no permitidas.
- Progreso con contadores válidos.
- Rechazo de contadores negativos y de correctos mayores que totales.
- Rechazo de progreso duplicado.
- `DELETE RESTRICT` al intentar borrar un ejercicio con intentos.
- `DELETE CASCADE` al borrar un usuario con intentos, historial y progreso.

Las pruebas fallidas esperadas se aislaron con `BEGIN`, `SAVEPOINT`, `ROLLBACK TO SAVEPOINT` y `COMMIT`. El resultado final del script fue código de salida `0`; todos los marcadores fueron `PASS`.

Conteos finales conservados en `logiclab_db`:

| Tabla | Registros |
|---|---:|
| usuarios | 2 |
| ejercicios | 3 |
| intentos | 3 |
| historial | 5 |
| progreso | 2 |

El esquema no actualiza automáticamente `progreso`; la consistencia debe mantenerse en la misma transacción que registra cada intento o mediante lógica de aplicación futura. No se agregaron triggers.

## 9. Respaldo

Se generó un respaldo PostgreSQL auténtico, no un sustituto `.sql`:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -d logiclab_db -Fc -f "C:\Users\PC\Desktop\LogicLab\T2 Actividad - 3 Diseño del Modelo de Datos\respaldo\LogicLab_Backup.backup" -v
```

Resultado:

- Código de salida: `0`.
- Tamaño: `11094` bytes.
- Formato: `CUSTOM`.
- Versión del servidor y `pg_dump`: `17.7`.
- `pg_restore --list`: código de salida `0`.
- TOC: 27 entradas.

El listado TOC contiene las cinco tablas, datos de las cinco tablas, restricciones y los índices.

## 10. Restauración de prueba

Se creó la base temporal `logiclab_restore_test` y se restauró sin tocar `logiclab_db`:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -d logiclab_restore_test -w --exit-on-error --verbose "C:\Users\PC\Desktop\LogicLab\T2 Actividad - 3 Diseño del Modelo de Datos\respaldo\LogicLab_Backup.backup"
```

Resultado final: código de salida `0`.

La base restaurada contiene cinco tablas, 30 columnas, 15 restricciones y nueve índices. Los conteos coinciden con `logiclab_db`: 3 ejercicios, 5 historiales, 3 intentos, 2 progresos y 2 usuarios. La base temporal queda conservada; no se elimina sin autorización.

## 11. Evidencias

En `evidencias_implementacion/` se conservaron:

- `estructura/ejecucion_esquema.log`.
- `estructura/version_conexion.txt`.
- `estructura/servicio_y_herramientas.txt`.
- `estructura/tablas_y_extension.txt`.
- `estructura/columnas.txt`.
- `estructura/restricciones.txt`.
- `estructura/indices.txt`.
- `estructura/relaciones.txt`.
- `pruebas/pruebas_funcionales.sql`.
- `pruebas/resultados_pruebas.log`.
- `restauracion/pg_restore.log`.
- `restauracion/conteos_logiclab_db.txt`.
- `restauracion/conteos_logiclab_restore_test.txt`.
- `restauracion/estructura_restaurada.txt`.
- `restauracion/restricciones_restauradas.txt`.
- `restauracion/indices_restaurados.txt`.
- `respaldo_informe.txt` y `restauracion_informe.txt`.

No se generaron capturas de pgAdmin porque no se encontró pgAdmin instalado. La captura disponible correspondía a MySQL Workbench, por lo que no se utilizó como evidencia de PostgreSQL. Las salidas conservadas son resultados reales de las herramientas PostgreSQL.

## 12. Incidencias corregidas

- La autenticación inicial no tenía una credencial PostgreSQL disponible. Se configuró un `pgpass.conf` local fuera del repositorio y se verificó el acceso con el rol `postgres`.
- La primera versión de las pruebas usó variables de `psql` dentro de bloques `DO`; se corrigió usando parámetros de sesión. La ejecución final terminó con código `0`.
- La primera invocación de `pg_restore` incluyó erróneamente `-X`, opción de `psql`. Se eliminó esa opción y la restauración final terminó con código `0`.
- Dos consultas iniciales intentaron consultar parámetros no existentes (`server_locale` y `lc_collate` mediante `SHOW`). Se sustituyeron por consultas válidas al catálogo; la evidencia final quedó con código `0`.

## 13. Limitaciones y pendientes

- La base temporal `logiclab_restore_test` queda pendiente de eliminación previa autorización.
- La autenticación de LogicLab aún no está integrada; los `password_hash` usados son únicamente ficticios.
- El cálculo automático de progreso queda pendiente de una decisión posterior: transacción de aplicación, servicio de dominio o trigger justificado.
- La aplicación React y el despliegue de Vercel no fueron modificados.
- No se realizaron commits ni pushes.

## 14. Conclusión técnica

La implementación PostgreSQL de LogicLab está completada y verificada. El esquema original se ejecutó correctamente, las cinco tablas y sus relaciones cumplen el modelo, las restricciones e índices fueron comprobados, el respaldo Custom es legible y la restauración en una base independiente fue exitosa con conteos coincidentes.
