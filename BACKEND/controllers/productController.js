// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/productController.js
//  CRUD completo de publicaciones de materiales
// ══════════════════════════════════════════════════════
const db   = require('../config/database');
const path = require('path');
const fs   = require('fs');

/* ────────────────────────────────
   GET /api/products
   Listar con filtros y paginación
──────────────────────────────── */
exports.getAll = async (req, res) => {
  try {
    const {
      tipo_material, estado, ciudad, precio_min, precio_max,
      calidad, page = 1, limit = 12, search, orden = 'reciente'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE p.activo = 1 AND p.estado_publicacion = "disponible"';

    if (tipo_material) { where += ' AND p.tipo_material = ?'; params.push(tipo_material); }
    if (estado)        { where += ' AND p.estado = ?';        params.push(estado); }
    if (ciudad)        { where += ' AND p.ciudad LIKE ?';     params.push(`%${ciudad}%`); }
    if (precio_min)    { where += ' AND p.precio_kg >= ?';    params.push(precio_min); }
    if (precio_max)    { where += ' AND p.precio_kg <= ?';    params.push(precio_max); }
    if (calidad)       { where += ' AND p.calidad = ?';       params.push(calidad); }
    if (search)        { where += ' AND (p.titulo LIKE ? OR p.descripcion LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const orderMap = {
      reciente:  'p.creado_en DESC',
      precio_asc:'p.precio_kg ASC',
      precio_desc:'p.precio_kg DESC',
      cantidad:  'p.cantidad_kg DESC',
      vip:       'u.es_vip DESC, p.creado_en DESC'
    };
    const orderBy = orderMap[orden] || orderMap.reciente;

    const sql = `
      SELECT p.*, u.nombre AS vendedor_nombre, u.empresa AS vendedor_empresa,
             u.es_vip AS vendedor_vip, u.calificacion_promedio AS vendedor_calif
      FROM publicaciones p
      JOIN usuarios u ON p.vendedor_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), offset);

    const [rows] = await db.query(sql, params);

    const [[{total}]] = await db.query(
      `SELECT COUNT(*) AS total FROM publicaciones p JOIN usuarios u ON p.vendedor_id = u.id ${where}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   GET /api/products/:id
──────────────────────────────── */
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.nombre AS vendedor_nombre, u.empresa AS vendedor_empresa,
              u.es_vip, u.estado AS vendedor_estado, u.calificacion_promedio,
              u.total_ventas
       FROM publicaciones p
       JOIN usuarios u ON p.vendedor_id = u.id
       WHERE p.id = ? AND p.activo = 1`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    // Incrementar vistas
    await db.query('UPDATE publicaciones SET vistas = vistas + 1 WHERE id = ?', [req.params.id]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/products
   Crear publicación (solo vendedores)
──────────────────────────────── */
exports.create = async (req, res) => {
  try {
    const {
      titulo, descripcion, tipo_material, cantidad_kg,
      precio_kg, calidad, estado, ciudad, tipo_entrega, contacto_adicional
    } = req.body;

    if (!titulo || !tipo_material || !cantidad_kg || !precio_kg)
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });

    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO publicaciones
       (vendedor_id, titulo, descripcion, tipo_material, cantidad_kg, precio_kg,
        calidad, estado, ciudad, tipo_entrega, foto_url, contacto_adicional)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, titulo, descripcion, tipo_material, cantidad_kg, precio_kg,
       calidad, estado, ciudad, tipo_entrega || 'a_convenir', foto_url, contacto_adicional || null]
    );

    res.status(201).json({
      success: true,
      message: 'Publicación creada exitosamente',
      data: { id: result.insertId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   PUT /api/products/:id
──────────────────────────────── */
exports.update = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT vendedor_id FROM publicaciones WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    if (rows[0].vendedor_id !== req.user.id && req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Sin permiso para editar esta publicación' });

    const fields = ['titulo','descripcion','tipo_material','cantidad_kg','precio_kg',
                    'calidad','estado','ciudad','tipo_entrega','estado_publicacion','contacto_adicional'];
    const updates = [];
    const values  = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    });

    if (req.file) { updates.push('foto_url = ?'); values.push(`/uploads/${req.file.filename}`); }

    if (updates.length === 0)
      return res.status(400).json({ success: false, message: 'No hay datos para actualizar' });

    values.push(req.params.id);
    await db.query(`UPDATE publicaciones SET ${updates.join(', ')}, actualizado_en = NOW() WHERE id = ?`, values);

    res.json({ success: true, message: 'Publicación actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   DELETE /api/products/:id
──────────────────────────────── */
exports.remove = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT vendedor_id FROM publicaciones WHERE id = ?', [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    if (rows[0].vendedor_id !== req.user.id && req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Sin permiso' });

    // Soft delete
    await db.query('UPDATE publicaciones SET activo = 0, actualizado_en = NOW() WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Publicación eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   GET /api/products/my/listings
   Mis publicaciones
──────────────────────────────── */
exports.myListings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *, (SELECT COUNT(*) FROM solicitudes WHERE publicacion_id = publicaciones.id) AS total_solicitudes
       FROM publicaciones WHERE vendedor_id = ? AND activo = 1 ORDER BY creado_en DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};