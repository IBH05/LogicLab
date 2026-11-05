\set ON_ERROR_STOP on
\echo 'LogicLab - pruebas funcionales y de integridad'
\echo 'Los datos son ficticios y se conservan para el respaldo académico.'

BEGIN;
INSERT INTO usuarios (nombre, correo, password_hash)
VALUES ('Usuario Prueba Alfa', 'alfa@logiclab.example', 'hash-ficticio-alfa-no-autenticable')
RETURNING id_usuario AS id \gset user_a_
INSERT INTO usuarios (nombre, correo, password_hash)
VALUES ('Usuario Prueba Beta', 'beta@logiclab.example', 'hash-ficticio-beta-no-autenticable')
RETURNING id_usuario AS id \gset user_b_
INSERT INTO usuarios (nombre, correo, password_hash)
VALUES ('Usuario Prueba Gamma', 'gamma@logiclab.example', 'hash-ficticio-gamma-no-autenticable')
RETURNING id_usuario AS id \gset user_c_
INSERT INTO usuarios (nombre, correo, password_hash)
VALUES ('Usuario Prueba Delta', 'delta@logiclab.example', 'hash-ficticio-delta-no-autenticable')
RETURNING id_usuario AS id \gset user_d_

INSERT INTO ejercicios (titulo, enunciado, expresion_objetivo, respuesta_esperada, dificultad)
VALUES ('Conjunción básica', 'Evalúa la conjunción de dos variables booleanas.', 'A AND B', '0 cuando A=1 y B=0', 'basico')
RETURNING id_ejercicio AS id \gset exercise_basic_
INSERT INTO ejercicios (titulo, enunciado, expresion_objetivo, respuesta_esperada, dificultad)
VALUES ('Disyunción intermedia', 'Simplifica una disyunción booleana.', 'A OR B', '1 cuando alguna variable es 1', 'intermedio')
RETURNING id_ejercicio AS id \gset exercise_intermediate_
INSERT INTO ejercicios (titulo, enunciado, expresion_objetivo, respuesta_esperada, dificultad)
VALUES ('XOR avanzado', 'Construye la tabla de verdad de XOR.', 'A XOR B', '1 cuando las variables son distintas', 'avanzado')
RETURNING id_ejercicio AS id \gset exercise_advanced_
COMMIT;

SELECT CASE WHEN COUNT(*) = 4 AND COUNT(id_usuario) = 4 THEN 'PASS|UUID_GENERATION_USERS' ELSE 'FAIL|UUID_GENERATION_USERS' END AS resultado,
       COUNT(*) AS usuarios_insertados
FROM usuarios
WHERE correo IN ('alfa@logiclab.example', 'beta@logiclab.example', 'gamma@logiclab.example', 'delta@logiclab.example');
SELECT CASE WHEN COUNT(*) = 3 AND COUNT(id_ejercicio) = 3 THEN 'PASS|UUID_GENERATION_EXERCISES' ELSE 'FAIL|UUID_GENERATION_EXERCISES' END AS resultado,
       COUNT(*) AS ejercicios_insertados
FROM ejercicios
WHERE titulo IN ('Conjunción básica', 'Disyunción intermedia', 'XOR avanzado');

INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto, duracion_ms)
VALUES (:'user_a_id', :'exercise_basic_id', '0', TRUE, 1250);
INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto, duracion_ms)
VALUES (:'user_a_id', :'exercise_basic_id', '1', FALSE, 900);
INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto, duracion_ms)
VALUES (:'user_b_id', :'exercise_intermediate_id', '1', TRUE, NULL);
INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto, duracion_ms)
VALUES (:'user_c_id', :'exercise_basic_id', '0', TRUE, 500);

INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_a_id', 'A AND B', '0', 'evaluacion');
INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_a_id', 'A OR 0', 'A', 'simplificacion');
INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_a_id', 'A XOR B', '0,1,1,0', 'tabla_verdad');
INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_a_id', '(A AND B)', 'diagrama booleano', 'diagrama');
INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_b_id', 'A OR B', '1', 'evaluacion');
INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
VALUES (:'user_c_id', 'A AND B', '0', 'evaluacion');

INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
VALUES (:'user_a_id', 2, 1);
INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
VALUES (:'user_b_id', 1, 1);
INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
VALUES (:'user_c_id', 1, 1);

SELECT set_config('logiclab.user_a_id', :'user_a_id', false);
SELECT set_config('logiclab.user_b_id', :'user_b_id', false);
SELECT set_config('logiclab.user_c_id', :'user_c_id', false);
SELECT set_config('logiclab.user_d_id', :'user_d_id', false);
SELECT set_config('logiclab.exercise_basic_id', :'exercise_basic_id', false);
SELECT set_config('logiclab.exercise_intermediate_id', :'exercise_intermediate_id', false);
SELECT set_config('logiclab.exercise_advanced_id', :'exercise_advanced_id', false);

SELECT CASE WHEN COUNT(*) = 4 AND COUNT(*) FILTER (WHERE duracion_ms IS NULL OR duracion_ms >= 0) = 4
            THEN 'PASS|VALID_INTENTOS' ELSE 'FAIL|VALID_INTENTOS' END AS resultado,
       COUNT(*) AS intentos_validos
FROM intentos;
SELECT CASE WHEN COUNT(*) = 6 THEN 'PASS|VALID_HISTORIAL_OPERACIONES' ELSE 'FAIL|VALID_HISTORIAL_OPERACIONES' END AS resultado,
       COUNT(*) AS historiales_validos
FROM historial;
SELECT CASE WHEN COUNT(*) = 3 AND BOOL_AND(intentos_correctos <= intentos_total)
            THEN 'PASS|VALID_PROGRESO' ELSE 'FAIL|VALID_PROGRESO' END AS resultado,
       COUNT(*) AS progresos_validos
FROM progreso;

BEGIN;
SAVEPOINT sp_unique_correo;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO usuarios (nombre, correo, password_hash)
    VALUES ('Usuario Duplicado', 'alfa@logiclab.example', 'hash-ficticio-duplicado');
  EXCEPTION WHEN unique_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|UNIQUE_CORREO';
  ELSE
    RAISE NOTICE 'FAIL|UNIQUE_CORREO';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_unique_correo;
RELEASE SAVEPOINT sp_unique_correo;
COMMIT;

BEGIN;
SAVEPOINT sp_not_null;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO usuarios (nombre, correo)
    VALUES ('Usuario sin hash', 'sin-hash@logiclab.example');
  EXCEPTION WHEN not_null_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|NOT_NULL_PASSWORD_HASH';
  ELSE
    RAISE NOTICE 'FAIL|NOT_NULL_PASSWORD_HASH';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_not_null;
RELEASE SAVEPOINT sp_not_null;
COMMIT;

BEGIN;
SAVEPOINT sp_nombre_vacio;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO usuarios (nombre, correo, password_hash)
    VALUES ('   ', 'nombre-vacio@logiclab.example', 'hash-ficticio');
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_NOMBRE_NO_VACIO';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_NOMBRE_NO_VACIO';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_nombre_vacio;
RELEASE SAVEPOINT sp_nombre_vacio;
COMMIT;

BEGIN;
SAVEPOINT sp_dificultad;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO ejercicios (titulo, enunciado, expresion_objetivo, respuesta_esperada, dificultad)
    VALUES ('Dificultad inválida', 'Prueba', 'A', '0', 'experto');
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_DIFICULTAD';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_DIFICULTAD';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_dificultad;
RELEASE SAVEPOINT sp_dificultad;
COMMIT;

BEGIN;
SAVEPOINT sp_fk_usuario;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto)
    VALUES (gen_random_uuid(), current_setting('logiclab.exercise_basic_id')::uuid, '0', FALSE);
  EXCEPTION WHEN foreign_key_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|FOREIGN_KEY_USUARIO';
  ELSE
    RAISE NOTICE 'FAIL|FOREIGN_KEY_USUARIO';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_fk_usuario;
RELEASE SAVEPOINT sp_fk_usuario;
COMMIT;

BEGIN;
SAVEPOINT sp_fk_ejercicio;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto)
    VALUES (current_setting('logiclab.user_a_id')::uuid, gen_random_uuid(), '0', FALSE);
  EXCEPTION WHEN foreign_key_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|FOREIGN_KEY_EJERCICIO';
  ELSE
    RAISE NOTICE 'FAIL|FOREIGN_KEY_EJERCICIO';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_fk_ejercicio;
RELEASE SAVEPOINT sp_fk_ejercicio;
COMMIT;

BEGIN;
SAVEPOINT sp_duracion;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO intentos (id_usuario, id_ejercicio, respuesta_usuario, es_correcto, duracion_ms)
    VALUES (current_setting('logiclab.user_a_id')::uuid, current_setting('logiclab.exercise_basic_id')::uuid, '0', FALSE, -1);
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_DURACION_NO_NEGATIVA';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_DURACION_NO_NEGATIVA';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_duracion;
RELEASE SAVEPOINT sp_duracion;
COMMIT;

BEGIN;
SAVEPOINT sp_operacion;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO historial (id_usuario, expresion_entrada, expresion_resultado, operacion)
    VALUES (current_setting('logiclab.user_a_id')::uuid, 'A', '0', 'otra_operacion');
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_OPERACION_HISTORIAL';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_OPERACION_HISTORIAL';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_operacion;
RELEASE SAVEPOINT sp_operacion;
COMMIT;

BEGIN;
SAVEPOINT sp_progreso_negativo;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
    VALUES (current_setting('logiclab.user_d_id')::uuid, -1, 0);
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_PROGRESO_NO_NEGATIVO';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_PROGRESO_NO_NEGATIVO';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_progreso_negativo;
RELEASE SAVEPOINT sp_progreso_negativo;
COMMIT;

BEGIN;
SAVEPOINT sp_progreso_inconsistente;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
    VALUES (current_setting('logiclab.user_d_id')::uuid, 1, 2);
  EXCEPTION WHEN check_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|CHECK_CORRECTOS_MENOR_IGUAL_TOTALES';
  ELSE
    RAISE NOTICE 'FAIL|CHECK_CORRECTOS_MENOR_IGUAL_TOTALES';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_progreso_inconsistente;
RELEASE SAVEPOINT sp_progreso_inconsistente;
COMMIT;

BEGIN;
SAVEPOINT sp_progreso_duplicado;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    INSERT INTO progreso (id_usuario, intentos_total, intentos_correctos)
    VALUES (current_setting('logiclab.user_a_id')::uuid, 3, 2);
  EXCEPTION WHEN unique_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|PRIMARY_KEY_PROGRESO_1_A_1';
  ELSE
    RAISE NOTICE 'FAIL|PRIMARY_KEY_PROGRESO_1_A_1';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_progreso_duplicado;
RELEASE SAVEPOINT sp_progreso_duplicado;
COMMIT;

BEGIN;
SAVEPOINT sp_delete_restrict;
DO $$
DECLARE
  fallo_esperado boolean := false;
BEGIN
  BEGIN
    DELETE FROM ejercicios WHERE id_ejercicio = current_setting('logiclab.exercise_basic_id')::uuid;
  EXCEPTION WHEN foreign_key_violation THEN
    fallo_esperado := true;
  END;
  IF fallo_esperado THEN
    RAISE NOTICE 'PASS|DELETE_RESTRICT_EJERCICIO_CON_INTENTOS';
  ELSE
    RAISE NOTICE 'FAIL|DELETE_RESTRICT_EJERCICIO_CON_INTENTOS';
  END IF;
END $$;
ROLLBACK TO SAVEPOINT sp_delete_restrict;
RELEASE SAVEPOINT sp_delete_restrict;
COMMIT;

BEGIN;
    DELETE FROM usuarios WHERE id_usuario = :'user_c_id';
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM intentos WHERE id_usuario = :'user_c_id')
              AND NOT EXISTS (SELECT 1 FROM historial WHERE id_usuario = :'user_c_id')
              AND NOT EXISTS (SELECT 1 FROM progreso WHERE id_usuario = :'user_c_id')
            THEN 'PASS|DELETE_CASCADE_USUARIO' ELSE 'FAIL|DELETE_CASCADE_USUARIO' END AS resultado;
COMMIT;

DELETE FROM usuarios WHERE id_usuario = :'user_d_id';

SELECT table_name, COUNT(*) AS registros
FROM (
  SELECT 'usuarios' AS table_name FROM usuarios WHERE correo LIKE '%@logiclab.example'
  UNION ALL SELECT 'ejercicios' FROM ejercicios WHERE titulo IN ('Conjunción básica', 'Disyunción intermedia', 'XOR avanzado')
  UNION ALL SELECT 'intentos' FROM intentos
  UNION ALL SELECT 'historial' FROM historial
  UNION ALL SELECT 'progreso' FROM progreso
) s
GROUP BY table_name
ORDER BY table_name;

SELECT u.nombre, p.intentos_total, p.intentos_correctos,
       CASE WHEN p.intentos_correctos <= p.intentos_total THEN 'PASS' ELSE 'FAIL' END AS consistencia
FROM usuarios u JOIN progreso p ON p.id_usuario = u.id_usuario
WHERE u.correo IN ('alfa@logiclab.example', 'beta@logiclab.example')
ORDER BY u.correo;
