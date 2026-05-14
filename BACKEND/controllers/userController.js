// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/userController.js
// ══════════════════════════════════════════════════════
const db     = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.tipo_usuario, u.empresa, u.telefono,
              u.estado, u.ciudad, u.es_vip, u.calificacion_promedio, u.total_ventas,
              u.creado_en, u.verificado,
              (SELECT COUNT(*) FROM publicaciones WHERE vendedor_id = u.id AND activo = 1) AS total_publicaciones
       FROM usuarios u WHERE u.id = ?`,
      [req.params.id || req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { nombre, empresa, telefono, estado, ciudad, descripcion } = req.body;
    const foto_perfil = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updates = [];
    const values  = [];
    const fields  = { nombre, empresa, telefono, estado, ciudad, descripcion };
    if (foto_perfil) fields.foto_perfil = foto_perfil;

    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) { updates.push(`${k} = ?`); values.push(v); }
    });

    if (updates.length === 0)
      return res.status(400).json({ success: false, message: 'Sin datos para actualizar' });

    values.push(req.user.id);
    await db.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ success: true, message: 'Perfil actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    if (req.user.tipo_usuario === 'vendedor' || req.user.tipo_usuario === 'vip') {
      const [[stats]] = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM publicaciones WHERE vendedor_id = ? AND activo = 1) AS total_publicaciones,
          (SELECT COUNT(*) FROM transacciones WHERE vendedor_id = ? AND estado = 'completada') AS total_ventas,
          (SELECT COALESCE(SUM(monto_neto), 0) FROM transacciones WHERE vendedor_id = ? AND estado = 'completada') AS ingresos_totales,
          (SELECT COUNT(*) FROM mensajes WHERE receptor_id = ? AND leido = 0) AS mensajes_nuevos`,
        [req.user.id, req.user.id, req.user.id, req.user.id]
      );
      return res.json({ success: true, data: stats });
    }

    if (req.user.tipo_usuario === 'comprador') {
      const [[stats]] = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM transacciones WHERE comprador_id = ? AND estado = 'completada') AS total_compras,
          (SELECT COALESCE(SUM(monto_total), 0) FROM transacciones WHERE comprador_id = ? AND estado = 'completada') AS gasto_total,
          (SELECT COUNT(*) FROM mensajes WHERE receptor_id = ? AND leido = 0) AS mensajes_nuevos`,
        [req.user.id, req.user.id, req.user.id]
      );
      return res.json({ success: true, data: stats });
    }

    res.status(403).json({ success: false, message: 'Tipo de usuario sin dashboard definido' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: listar todos los usuarios ──
exports.adminListUsers = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const { page = 1, limit = 20, tipo, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = 'WHERE 1=1';
    if (tipo)   { where += ' AND tipo_usuario = ?'; params.push(tipo); }
    if (search) { where += ' AND (nombre LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const [rows] = await db.query(
      `SELECT id, nombre, email, tipo_usuario, empresa, es_vip, verificado, activo, creado_en
       FROM usuarios ${where} ORDER BY creado_en DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};