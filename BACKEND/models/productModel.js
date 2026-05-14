// ══════════════════════════════════════════════════════
//  ECOMATCH — models/productModel.js
//  Modelo para operaciones de productos/publicaciones
// ══════════════════════════════════════════════════════
const db = require('../config/database');

/**
 * Obtener todas las publicaciones con filtros
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<Array>} Lista de publicaciones
 */
const getAll = async (filters = {}) => {
  try {
    const { tipo_material, precio_min, precio_max, estado, ciudad, search, limit = 20, offset = 0, sort = 'fecha_publicacion', order = 'DESC' } = filters;

    let where = 'WHERE p.activo = 1';
    const params = [];

    if (tipo_material) {
      where += ' AND p.tipo_material = ?';
      params.push(tipo_material);
    }
    if (precio_min) {
      where += ' AND p.precio >= ?';
      params.push(precio_min);
    }
    if (precio_max) {
      where += ' AND p.precio <= ?';
      params.push(precio_max);
    }
    if (estado) {
      where += ' AND p.estado = ?';
      params.push(estado);
    }
    if (ciudad) {
      where += ' AND p.ciudad = ?';
      params.push(ciudad);
    }
    if (search) {
      where += ' AND (p.titulo LIKE ? OR p.descripcion LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const validSorts = ['fecha_publicacion', 'precio', 'cantidad', 'titulo'];
    const sortField = validSorts.includes(sort) ? sort : 'fecha_publicacion';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [rows] = await db.query(`
      SELECT p.*, u.nombre AS vendedor_nombre, u.estado AS vendedor_estado, u.ciudad AS vendedor_ciudad
      FROM publicaciones p
      JOIN usuarios u ON p.usuario_id = u.id
      ${where}
      ORDER BY p.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return rows;
  } catch (error) {
    throw new Error(`Error al obtener publicaciones: ${error.message}`);
  }
};

/**
 * Obtener publicación por ID
 * @param {number} id - ID de la publicación
 * @returns {Promise<Object|null>} Publicación encontrada
 */
const getById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.nombre AS vendedor_nombre, u.email AS vendedor_email,
             u.telefono AS vendedor_telefono, u.estado AS vendedor_estado, u.ciudad AS vendedor_ciudad
      FROM publicaciones p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = ? AND p.activo = 1`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al obtener publicación: ${error.message}`);
  }
};

/**
 * Crear nueva publicación
 * @param {Object} productData - Datos de la publicación
 * @returns {Promise<number>} ID de la publicación creada
 */
const create = async (productData) => {
  try {
    const { usuario_id, titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad, imagenes } = productData;

    const [result] = await db.query(
      `INSERT INTO publicaciones (usuario_id, titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad, imagenes, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [usuario_id, titulo, descripcion || null, tipo_material, cantidad, precio, estado || null, ciudad || null, JSON.stringify(imagenes) || null]
    );

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al crear publicación: ${error.message}`);
  }
};

/**
 * Actualizar publicación
 * @param {number} id - ID de la publicación
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<boolean>} True si se actualizó
 */
const update = async (id, updateData) => {
  try {
    const { titulo, descripcion, tipo_material, cantidad, precio, estado, ciudad, imagenes } = updateData;

    const updates = [];
    const params = [];

    if (titulo !== undefined) { updates.push('titulo = ?'); params.push(titulo); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); params.push(descripcion); }
    if (tipo_material !== undefined) { updates.push('tipo_material = ?'); params.push(tipo_material); }
    if (cantidad !== undefined) { updates.push('cantidad = ?'); params.push(cantidad); }
    if (precio !== undefined) { updates.push('precio = ?'); params.push(precio); }
    if (estado !== undefined) { updates.push('estado = ?'); params.push(estado); }
    if (ciudad !== undefined) { updates.push('ciudad = ?'); params.push(ciudad); }
    if (imagenes !== undefined) { updates.push('imagenes = ?'); params.push(JSON.stringify(imagenes)); }

    if (updates.length === 0) return true;

    params.push(id);
    await db.query(`UPDATE publicaciones SET ${updates.join(', ')}, fecha_actualizacion = NOW() WHERE id = ?`, params);

    return true;
  } catch (error) {
    throw new Error(`Error al actualizar publicación: ${error.message}`);
  }
};

/**
 * Eliminar publicación (soft delete)
 * @param {number} id - ID de la publicación
 * @returns {Promise<boolean>} True si se eliminó
 */
const remove = async (id) => {
  try {
    await db.query('UPDATE publicaciones SET activo = 0, fecha_actualizacion = NOW() WHERE id = ?', [id]);
    return true;
  } catch (error) {
    throw new Error(`Error al eliminar publicación: ${error.message}`);
  }
};

/**
 * Obtener publicaciones del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Lista de publicaciones del usuario
 */
const getByUser = async (userId) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, (SELECT COUNT(*) FROM solicitudes s WHERE s.publicacion_id = p.id AND s.estado = 'pendiente') AS solicitudes_pendientes
      FROM publicaciones p
      WHERE p.usuario_id = ? AND p.activo = 1
      ORDER BY p.fecha_publicacion DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    throw new Error(`Error al obtener publicaciones del usuario: ${error.message}`);
  }
};

/**
 * Incrementar contador de vistas
 * @param {number} id - ID de la publicación
 * @returns {Promise<boolean>} True si se incrementó
 */
const incrementViews = async (id) => {
  try {
    await db.query('UPDATE publicaciones SET vistas = vistas + 1 WHERE id = ?', [id]);
    return true;
  } catch (error) {
    throw new Error(`Error al incrementar vistas: ${error.message}`);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByUser,
  incrementViews
};