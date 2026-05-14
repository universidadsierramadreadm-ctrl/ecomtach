// ══════════════════════════════════════════════════════
//  ECOMATCH — models/authModel.js
//  Modelo para operaciones de autenticación
// ══════════════════════════════════════════════════════
const db = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Busca usuario por email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const findByEmail = async (email) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, password_hash, tipo_usuario, es_vip, activo, verificado FROM usuarios WHERE email = ?',
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al buscar usuario por email: ${error.message}`);
  }
};

/**
 * Busca usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const findById = async (id) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, tipo_usuario, empresa, telefono, estado, ciudad, es_vip, total_ventas, calificacion_promedio, foto_perfil, descripcion, verificado, activo, creado_en, ultimo_login FROM usuarios WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al buscar usuario por ID: ${error.message}`);
  }
};

/**
 * Crea un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<number>} ID del usuario creado
 */
const create = async (userData) => {
  try {
    const { nombre, email, password_hash, tipo_usuario, empresa, telefono, estado, ciudad } = userData;

    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, telefono, estado, ciudad, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [nombre, email, password_hash, tipo_usuario, empresa || null, telefono || null, estado || null, ciudad || null]
    );

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
};

/**
 * Actualiza la contraseña de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} newPasswordHash - Nuevo hash de contraseña
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
const updatePassword = async (userId, newPasswordHash) => {
  try {
    await db.query('UPDATE usuarios SET password_hash = ?, actualizado_en = NOW() WHERE id = ?', [newPasswordHash, userId]);
    return true;
  } catch (error) {
    throw new Error(`Error al actualizar contraseña: ${error.message}`);
  }
};

/**
 * Actualiza último login de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<boolean>} True si se actualizó correctamente
 */
const updateLastLogin = async (userId) => {
  try {
    await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [userId]);
    return true;
  } catch (error) {
    throw new Error(`Error al actualizar último login: ${error.message}`);
  }
};

/**
 * Verifica si un email ya existe
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>} True si el email existe
 */
const emailExists = async (email) => {
  try {
    const [rows] = await db.query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
  } catch (error) {
    throw new Error(`Error al verificar email: ${error.message}`);
  }
};

/**
 * Obtiene el hash de contraseña de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<string|null>} Hash de contraseña o null
 */
const getPasswordHash = async (userId) => {
  try {
    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1', [userId]);
    return rows.length > 0 ? rows[0].password_hash : null;
  } catch (error) {
    throw new Error(`Error al obtener hash de contraseña: ${error.message}`);
  }
};

module.exports = {
  findByEmail,
  findById,
  create,
  updatePassword,
  updateLastLogin,
  emailExists,
  getPasswordHash
};