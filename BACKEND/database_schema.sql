-- ══════════════════════════════════════════════════════
--  ECOMATCH — Database Schema
--  Esquema inicial de la base de datos MySQL
-- ══════════════════════════════════════════════════════

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS ecomatch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecomatch_db;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tipo_usuario ENUM('vendedor', 'comprador', 'centro', 'admin') NOT NULL,
  empresa VARCHAR(255),
  telefono VARCHAR(20),
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  verificado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultima_conexion TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_tipo_usuario (tipo_usuario),
  INDEX idx_estado (estado)
);

-- Tabla de planes VIP
CREATE TABLE IF NOT EXISTS planes_vip (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio_mensual DECIMAL(10,2) NOT NULL,
  precio_anual DECIMAL(10,2),
  comision_porcentaje DECIMAL(5,2) NOT NULL,
  caracteristicas JSON,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos/materiales
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo_material VARCHAR(100) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(50) DEFAULT 'kg',
  precio DECIMAL(10,2) NOT NULL,
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  imagenes JSON,
  activo BOOLEAN DEFAULT TRUE,
  fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_tipo_material (tipo_material),
  INDEX idx_estado (estado),
  INDEX idx_activo (activo)
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transacciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  comprador_id INT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  precio_total DECIMAL(10,2) NOT NULL,
  comision DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'pendiente',
  fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_comprador (comprador_id),
  INDEX idx_estado (estado)
);

-- Tabla de mensajes/chat
CREATE TABLE IF NOT EXISTS mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaccion_id INT,
  remitente_id INT NOT NULL,
  destinatario_id INT NOT NULL,
  mensaje TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE CASCADE,
  FOREIGN KEY (remitente_id) REFERENCES usuarios(id),
  FOREIGN KEY (destinatario_id) REFERENCES usuarios(id),
  INDEX idx_transaccion (transaccion_id),
  INDEX idx_remitente (remitente_id),
  INDEX idx_destinatario (destinatario_id)
);

-- Tabla de suscripciones VIP
CREATE TABLE IF NOT EXISTS suscripciones_vip (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  plan_id INT NOT NULL,
  tipo ENUM('mensual', 'anual') NOT NULL,
  fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_fin TIMESTAMP NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES planes_vip(id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_activo (activo)
);

-- Insertar planes VIP por defecto
INSERT INTO planes_vip (nombre, precio_mensual, precio_anual, comision_porcentaje, caracteristicas) VALUES
('Estándar', 0, 0, 10.00, '{"publicacion": true, "chat": true, "panel_basico": true}'),
('VIP Mensual', 499.00, 499.00, 6.00, '{"comision_reducida": true, "publicaciones_destacadas": true, "prioridad_busquedas": true, "soporte_24_7": true, "estadisticas": true}'),
('VIP Anual', 399.00, 4788.00, 6.00, '{"todo_mensual": true, "perfil_premium": true, "api_acceso": true, "gestor_dedicado": true, "reportes_mensuales": true, "certificado_ecologico": true}')
ON DUPLICATE KEY UPDATE id = id;

-- Usuario admin por defecto (contraseña: admin123)
INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, verificado, activo) VALUES
('Administrador', 'admin@ecomatch.mx', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8nJ9nSzOuq', 'admin', 'ECOMATCH', TRUE, TRUE)
ON DUPLICATE KEY UPDATE id = id;