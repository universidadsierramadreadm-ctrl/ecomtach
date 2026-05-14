-- ══════════════════════════════════════════════════════
--  ECOMATCH — database.sql  v1.0
--  Base de datos MySQL — Modelo relacional completo
--  Ejecutar: mysql -u root -p < database.sql
-- ══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS ecomatch_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecomatch_db;

-- ─────────────────────────────────────────
-- TABLA: usuarios
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                VARCHAR(120)  NOT NULL,
  email                 VARCHAR(180)  NOT NULL UNIQUE,
  password_hash         VARCHAR(255)  NOT NULL,
  tipo_usuario          ENUM('vendedor','comprador','admin','vip') DEFAULT 'comprador',
  empresa               VARCHAR(180),
  telefono              VARCHAR(20),
  estado                VARCHAR(60),
  ciudad                VARCHAR(80),
  descripcion           TEXT,
  foto_perfil           VARCHAR(255),
  es_vip                TINYINT(1)    DEFAULT 0,
  verificado            TINYINT(1)    DEFAULT 0,
  activo                TINYINT(1)    DEFAULT 1,
  calificacion_promedio DECIMAL(3,2)  DEFAULT 0.00,
  total_ventas          INT UNSIGNED  DEFAULT 0,
  ultimo_login          DATETIME,
  creado_en             DATETIME      DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        DATETIME      ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email       (email),
  INDEX idx_tipo        (tipo_usuario),
  INDEX idx_estado      (estado),
  INDEX idx_vip         (es_vip)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: publicaciones (materiales)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicaciones (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendedor_id       INT UNSIGNED NOT NULL,
  titulo            VARCHAR(200) NOT NULL,
  descripcion       TEXT,
  tipo_material     ENUM(
    'PET','plastico_hdpe','plastico_ldpe','plastico_pp',
    'acero','aluminio','cobre','chatarra_mixta',
    'carton','papel','vidrio',
    'electronico','industrial','otro'
  ) NOT NULL,
  cantidad_kg       DECIMAL(12,2) NOT NULL,
  precio_kg         DECIMAL(10,2) NOT NULL,
  calidad           ENUM('A','B','C','mixta') DEFAULT 'B',
  estado            VARCHAR(60)   NOT NULL,
  ciudad            VARCHAR(80)   NOT NULL,
  tipo_entrega      ENUM('recoleccion','entrega','a_convenir') DEFAULT 'a_convenir',
  foto_url          VARCHAR(255),
  video_url         VARCHAR(255),
  contacto_adicional VARCHAR(120),
  estado_publicacion ENUM('disponible','vendido','pausado','eliminado') DEFAULT 'disponible',
  vistas            INT UNSIGNED  DEFAULT 0,
  activo            TINYINT(1)    DEFAULT 1,
  creado_en         DATETIME      DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME      ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_tipo_material  (tipo_material),
  INDEX idx_estado_pub     (estado),
  INDEX idx_ciudad         (ciudad),
  INDEX idx_precio         (precio_kg),
  INDEX idx_activo         (activo),
  FULLTEXT ft_busqueda     (titulo, descripcion)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: planes_vip
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes_vip (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80)   NOT NULL,
  tipo        ENUM('mensual','trimestral','anual') NOT NULL UNIQUE,
  precio      DECIMAL(10,2) NOT NULL,
  meses       TINYINT       NOT NULL,
  comision    DECIMAL(4,3)  DEFAULT 0.060,
  activo      TINYINT(1)    DEFAULT 1,
  creado_en   DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO planes_vip (nombre, tipo, precio, meses) VALUES
  ('VIP Mensual',    'mensual',    499.00,  1),
  ('VIP Trimestral', 'trimestral', 1299.00, 3),
  ('VIP Anual',      'anual',      4788.00, 12)
ON DUPLICATE KEY UPDATE precio = VALUES(precio);

-- ─────────────────────────────────────────
-- TABLA: suscripciones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suscripciones (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,
  plan_id       INT UNSIGNED NOT NULL,
  fecha_inicio  DATETIME     NOT NULL,
  fecha_fin     DATETIME     NOT NULL,
  monto_pagado  DECIMAL(10,2) NOT NULL,
  activa        TINYINT(1)   DEFAULT 1,
  metodo_pago   VARCHAR(60),
  referencia_pago VARCHAR(120),
  creado_en     DATETIME     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)  ON DELETE CASCADE,
  FOREIGN KEY (plan_id)    REFERENCES planes_vip(id) ON DELETE RESTRICT,
  INDEX idx_usuario  (usuario_id),
  INDEX idx_activa   (activa)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: transacciones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transacciones (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id      INT UNSIGNED NOT NULL,
  vendedor_id         INT UNSIGNED NOT NULL,
  comprador_id        INT UNSIGNED NOT NULL,
  cantidad_kg         DECIMAL(12,2) NOT NULL,
  precio_kg           DECIMAL(10,2) NOT NULL,
  monto_total         DECIMAL(12,2) NOT NULL,
  comision_ecomatch   DECIMAL(12,2) NOT NULL,
  tasa_comision       DECIMAL(4,3)  NOT NULL,
  monto_neto          DECIMAL(12,2) NOT NULL,
  estado              ENUM('pendiente','en_proceso','completada','cancelada') DEFAULT 'pendiente',
  notas               TEXT,
  creado_en           DATETIME      DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      DATETIME      ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE RESTRICT,
  FOREIGN KEY (vendedor_id)    REFERENCES usuarios(id)       ON DELETE RESTRICT,
  FOREIGN KEY (comprador_id)   REFERENCES usuarios(id)       ON DELETE RESTRICT,
  INDEX idx_vendedor   (vendedor_id),
  INDEX idx_comprador  (comprador_id),
  INDEX idx_estado_tx  (estado)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: conversaciones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario1_id     INT UNSIGNED NOT NULL,
  usuario2_id     INT UNSIGNED NOT NULL,
  publicacion_id  INT UNSIGNED,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario1_id)    REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (usuario2_id)    REFERENCES usuarios(id)    ON DELETE CASCADE,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE SET NULL,
  UNIQUE KEY uk_conversacion (usuario1_id, usuario2_id, publicacion_id),
  INDEX idx_u1 (usuario1_id),
  INDEX idx_u2 (usuario2_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: mensajes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversacion_id  INT UNSIGNED NOT NULL,
  emisor_id        INT UNSIGNED NOT NULL,
  receptor_id      INT UNSIGNED NOT NULL,
  contenido        TEXT         NOT NULL,
  leido            TINYINT(1)   DEFAULT 0,
  creado_en        DATETIME     DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversacion_id) REFERENCES conversaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (emisor_id)       REFERENCES usuarios(id)       ON DELETE CASCADE,
  FOREIGN KEY (receptor_id)     REFERENCES usuarios(id)       ON DELETE CASCADE,
  INDEX idx_conv    (conversacion_id),
  INDEX idx_leido   (receptor_id, leido)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: solicitudes (cotizaciones)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solicitudes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id   INT UNSIGNED NOT NULL,
  comprador_id     INT UNSIGNED NOT NULL,
  cantidad_solicitada DECIMAL(12,2),
  precio_ofrecido  DECIMAL(10,2),
  mensaje          TEXT,
  estado           ENUM('pendiente','aceptada','rechazada','cancelada') DEFAULT 'pendiente',
  creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (comprador_id)   REFERENCES usuarios(id)      ON DELETE CASCADE,
  INDEX idx_pub_sol (publicacion_id),
  INDEX idx_comp_sol (comprador_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: calificaciones / reputación
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calificaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaccion_id  INT UNSIGNED NOT NULL,
  evaluador_id    INT UNSIGNED NOT NULL,
  evaluado_id     INT UNSIGNED NOT NULL,
  puntuacion      TINYINT      NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario      TEXT,
  creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluador_id)   REFERENCES usuarios(id)      ON DELETE CASCADE,
  FOREIGN KEY (evaluado_id)    REFERENCES usuarios(id)      ON DELETE CASCADE,
  UNIQUE KEY uk_eval (transaccion_id, evaluador_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TABLA: notificaciones
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  tipo        ENUM('mensaje','solicitud','venta','sistema','vip') DEFAULT 'sistema',
  titulo      VARCHAR(120) NOT NULL,
  cuerpo      TEXT,
  leida       TINYINT(1)  DEFAULT 0,
  url_accion  VARCHAR(255),
  creado_en   DATETIME    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_not_usuario (usuario_id),
  INDEX idx_not_leida   (usuario_id, leida)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
-- TRIGGER: Actualizar calificación promedio del usuario
-- ─────────────────────────────────────────
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS after_calificacion_insert
AFTER INSERT ON calificaciones
FOR EACH ROW
BEGIN
  UPDATE usuarios
  SET calificacion_promedio = (
    SELECT AVG(puntuacion) FROM calificaciones WHERE evaluado_id = NEW.evaluado_id
  )
  WHERE id = NEW.evaluado_id;
END$$
DELIMITER ;

-- ─────────────────────────────────────────
-- USUARIO ADMIN inicial (password: Admin2024!)
-- ─────────────────────────────────────────
INSERT IGNORE INTO usuarios (nombre, email, password_hash, tipo_usuario, verificado)
VALUES ('Admin ECOMATCH', 'admin@ecomatch.mx',
  '$2a$12$LrXEmT8tH2oa6.M1bQJ5/e2ZGX.xk5wC0qcuJ3JhpWbQmHlCK9TBG',
  'admin', 1);

SELECT '✅ Base de datos ECOMATCH creada exitosamente.' AS mensaje;