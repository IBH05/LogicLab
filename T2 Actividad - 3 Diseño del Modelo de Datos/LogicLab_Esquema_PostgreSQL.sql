-- LogicLab · Modelo físico propuesto (PostgreSQL 13+)
BEGIN;
CREATE TABLE usuarios (
 id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 nombre VARCHAR(120) NOT NULL,
 correo VARCHAR(254) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT ck_usuarios_nombre CHECK (length(btrim(nombre)) > 0)
);
CREATE TABLE ejercicios (
 id_ejercicio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 titulo VARCHAR(160) NOT NULL,
 enunciado TEXT NOT NULL,
 expresion_objetivo TEXT NOT NULL,
 respuesta_esperada TEXT NOT NULL,
 dificultad VARCHAR(12) NOT NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT ck_ejercicios_dificultad CHECK (dificultad IN ('basico','intermedio','avanzado'))
);
CREATE TABLE intentos (
 id_intento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 id_ejercicio UUID NOT NULL REFERENCES ejercicios(id_ejercicio) ON DELETE RESTRICT,
 respuesta_usuario TEXT NOT NULL,
 es_correcto BOOLEAN NOT NULL,
 duracion_ms INTEGER,
 realizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT ck_intentos_duracion CHECK (duracion_ms IS NULL OR duracion_ms >= 0)
);
CREATE TABLE historial (
 id_historial UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 expresion_entrada TEXT NOT NULL,
 expresion_resultado TEXT NOT NULL,
 operacion VARCHAR(24) NOT NULL,
 registrado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT ck_historial_operacion CHECK (operacion IN ('evaluacion','simplificacion','tabla_verdad','diagrama'))
);
CREATE TABLE progreso (
 id_usuario UUID PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 intentos_total INTEGER NOT NULL DEFAULT 0,
 intentos_correctos INTEGER NOT NULL DEFAULT 0,
 actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT ck_progreso_contadores CHECK (intentos_total >= 0 AND intentos_correctos >= 0 AND intentos_correctos <= intentos_total)
);
CREATE INDEX idx_intentos_usuario_fecha ON intentos(id_usuario, realizado_en DESC);
CREATE INDEX idx_intentos_ejercicio ON intentos(id_ejercicio);
CREATE INDEX idx_historial_usuario_fecha ON historial(id_usuario, registrado_en DESC);
COMMIT;