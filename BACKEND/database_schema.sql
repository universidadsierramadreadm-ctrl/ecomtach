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
  es_vip BOOLEAN DEFAULT FALSE,
  total_ventas INT DEFAULT 0,
  calificacion_promedio DECIMAL(3,2) DEFAULT 0,
  foto_perfil VARCHAR(255),
  descripcion TEXT,
  verificado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ultimo_login TIMESTAMP NULL,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
CREATE TABLE IF NOT EXISTS publicaciones (
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
  vistas INT DEFAULT 0,
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
  publicacion_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  comprador_id INT NOT NULL,
  plan_id INT DEFAULT 1,
  cantidad_kg DECIMAL(10,2) NOT NULL,
  precio_kg DECIMAL(10,2) NOT NULL,
  monto_neto DECIMAL(10,2) NOT NULL,
  comision_ecomatch DECIMAL(10,2) NOT NULL,
  tasa_comision DECIMAL(5,2) NOT NULL,
  estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'pendiente',
  fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios(id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
  FOREIGN KEY (plan_id) REFERENCES planes_vip(id),
  INDEX idx_vendedor (vendedor_id),
  INDEX idx_comprador (comprador_id),
  INDEX idx_estado (estado)
);

-- Tabla de mensajes/chat
CREATE TABLE IF NOT EXISTS mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaccion_id INT,
  producto_id INT,
  emisor_id INT NOT NULL,
  destinatario_id INT NOT NULL,
  contenido TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (emisor_id) REFERENCES usuarios(id),
  FOREIGN KEY (destinatario_id) REFERENCES usuarios(id),
  INDEX idx_transaccion (transaccion_id),
  INDEX idx_producto (producto_id),
  INDEX idx_emisor (emisor_id),
  INDEX idx_destinatario (destinatario_id)
);

-- Tabla de conversaciones (para chat)
CREATE TABLE IF NOT EXISTS conversaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario1_id INT NOT NULL,
  usuario2_id INT NOT NULL,
  producto_id INT,
  ultimo_mensaje TEXT,
  fecha_ultimo_mensaje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario1_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario2_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  INDEX idx_usuario1 (usuario1_id),
  INDEX idx_usuario2 (usuario2_id),
  INDEX idx_producto (producto_id)
);

-- Tabla de solicitudes de compra
CREATE TABLE IF NOT EXISTS solicitudes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT NOT NULL,
  comprador_id INT NOT NULL,
  cantidad_solicitada DECIMAL(10,2) NOT NULL,
  mensaje TEXT,
  estado ENUM('pendiente', 'aceptada', 'rechazada') DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (comprador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_publicacion (publicacion_id),
  INDEX idx_comprador (comprador_id),
  INDEX idx_estado (estado)
);

-- Tabla de calificaciones/reseñas
CREATE TABLE IF NOT EXISTS calificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  calificador_id INT NOT NULL,
  calificado_id INT NOT NULL,
  transaccion_id INT NOT NULL,
  calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (calificador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (calificado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (transaccion_id) REFERENCES transacciones(id) ON DELETE CASCADE,
  INDEX idx_calificador (calificador_id),
  INDEX idx_calificado (calificado_id),
  INDEX idx_transaccion (transaccion_id)
);

-- Insertar planes VIP por defecto
INSERT INTO planes_vip (nombre, precio_mensual, precio_anual, comision_porcentaje, caracteristicas) VALUES
('Estándar', 0, 0, 10.00, '{"publicacion": true, "chat": true, "panel_basico": true}'),
('VIP Mensual', 499.00, 499.00, 6.00, '{"comision_reducida": true, "publicaciones_destacadas": true, "prioridad_busquedas": true, "soporte_24_7": true, "estadisticas": true}'),
('VIP Anual', 399.00, 4788.00, 6.00, '{"todo_mensual": true, "perfil_premium": true, "api_acceso": true, "gestor_dedicado": true, "reportes_mensuales": true, "certificado_ecologico": true}')
ON DUPLICATE KEY UPDATE id = id;

-- Usuario admin por defecto (contraseña: admin123)
INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, verificado, activo, creado_en) VALUES
('Administrador', 'admin@ecomatch.mx', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8nJ9nSzOuq', 'admin', 'ECOMATCH', TRUE, TRUE, NOW())
ON DUPLICATE KEY UPDATE id = id;

-- Datos de ejemplo para usuarios
INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, telefono, estado, ciudad, verificado, activo, creado_en) VALUES
('Juan Pérez', 'juan.vendedor@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8nJ9nSzOuq', 'vendedor', 'ReciclaJuan', '555-0101', 'CDMX', 'Coyoacán', TRUE, TRUE, NOW()),
('María García', 'maria.compradora@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8nJ9nSzOuq', 'comprador', NULL, '555-0202', 'Jalisco', 'Guadalajara', TRUE, TRUE, NOW()),
('Centro Verde', 'centro.verde@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8nJ9nSzOuq', 'centro', 'Centro de Reciclaje Verde', '555-0303', 'Nuevo León', 'Monterrey', TRUE, TRUE, NOW())
ON DUPLICATE KEY UPDATE id = id;

-- Datos de ejemplo para publicaciones
INSERT INTO publicaciones (usuario_id, titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad, activo) VALUES
(2, 'Cartón corrugado reciclado', 'Cartón de alta calidad, limpio y seco', 'carton', 500.00, 2.50, 'CDMX', 'Iztapalapa', TRUE),
(2, 'Plástico PET transparente', 'Botellas de refresco limpias y prensadas', 'plastico', 200.00, 8.00, 'Jalisco', 'Tlaquepaque', TRUE),
(3, 'Aluminio de latas', 'Latas de refresco comprimidas', 'metal', 100.00, 15.00, 'Nuevo León', 'San Nicolás', TRUE)
ON DUPLICATE KEY UPDATE id = id;

-- Datos de ejemplo para transacciones
INSERT INTO transacciones (publicacion_id, vendedor_id, comprador_id, plan_id, cantidad_kg, precio_kg, monto_neto, comision_ecomatch, tasa_comision, estado) VALUES
(1, 2, 3, 1, 100.00, 2.50, 250.00, 25.00, 10.00, 'completada'),
(2, 2, 3, 1, 50.00, 8.00, 400.00, 40.00, 10.00, 'pendiente')
ON DUPLICATE KEY UPDATE id = id;