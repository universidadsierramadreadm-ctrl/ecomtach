// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/userController.js
// ══════════════════════════════════════════════════════
const db     = require('../config/database');
const bcrypt = require('bcryptjs');

// ── Página de inicio con estadísticas ──
exports.getInicio = async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE activo = 1) AS total_usuarios,
        (SELECT COUNT(*) FROM publicaciones WHERE activo = 1) AS total_publicaciones
    `);

    res.json({
      success: true,
      mensaje: 'Bienvenido al sistema',
      fecha: new Date().toISOString(),
      módulos: ['publicaciones', 'usuarios', 'pagos', 'vip', 'chat'],
      resumen: {
        total_usuarios: stats.total_usuarios,
        total_publicaciones: stats.total_publicaciones
      },
      sistema: 'ECOMATCH',
      version: '1.0.0'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

// ── Eliminar cuenta propia ──
exports.deleteAccount = async (req, res) => {
  try {
    // Soft delete: marcar como inactivo en lugar de eliminar físicamente
    await db.query('UPDATE usuarios SET activo = 0, actualizado_en = NOW() WHERE id = ?', [req.user.id]);

    // Opcional: eliminar datos relacionados si es necesario
    // await db.query('DELETE FROM publicaciones WHERE vendedor_id = ?', [req.user.id]);
    // await db.query('DELETE FROM mensajes WHERE emisor_id = ? OR destinatario_id = ?', [req.user.id, req.user.id]);

    res.json({ success: true, message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: crear usuario ──
exports.adminCreateUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const { nombre, email, password, tipo_usuario, empresa, telefono, estado, ciudad, verificado = false, activo = true } = req.body;

    if (!nombre || !email || !password || !tipo_usuario)
      return res.status(400).json({ success: false, message: 'Campos requeridos: nombre, email, password, tipo_usuario' });

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: 'Formato de email inválido' });

    // Validar tipo_usuario
    const tiposValidos = ['vendedor', 'comprador', 'centro', 'admin'];
    if (!tiposValidos.includes(tipo_usuario))
      return res.status(400).json({ success: false, message: 'Tipo de usuario inválido' });

    // Verificar email único
    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, telefono, estado, ciudad, verificado, activo, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [nombre, email, hash, tipo_usuario, empresa || null, telefono || null, estado || null, ciudad || null, verificado, activo]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      user: { id: result.insertId, nombre, email, tipo_usuario }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: actualizar usuario ──
exports.adminUpdateUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const { id } = req.params;
    const { nombre, email, tipo_usuario, empresa, telefono, estado, ciudad, verificado, activo, es_vip } = req.body;

    const updates = [];
    const values  = [];
    const fields  = { nombre, email, tipo_usuario, empresa, telefono, estado, ciudad, verificado, activo, es_vip };

    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) { updates.push(`${k} = ?`); values.push(v); }
    });

    if (updates.length === 0)
      return res.status(400).json({ success: false, message: 'Sin datos para actualizar' });

    values.push(id);
    await db.query(`UPDATE usuarios SET ${updates.join(', ')}, actualizado_en = NOW() WHERE id = ?`, values);

    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: eliminar usuario ──
exports.adminDeleteUser = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const { id } = req.params;

    // Verificar que no sea el mismo admin
    if (parseInt(id) === req.user.id)
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });

    // Soft delete
    await db.query('UPDATE usuarios SET activo = 0, actualizado_en = NOW() WHERE id = ?', [id]);

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Calificar usuario ──
exports.rateUser = async (req, res) => {
  try {
    const { calificado_id, transaccion_id, calificacion, comentario } = req.body;

    if (!calificado_id || !transaccion_id || !calificacion)
      return res.status(400).json({ success: false, message: 'Campos requeridos: calificado_id, transaccion_id, calificacion' });

    if (calificacion < 1 || calificacion > 5)
      return res.status(400).json({ success: false, message: 'La calificación debe estar entre 1 y 5' });

    // Verificar que la transacción existe y está completada
    const [transaccion] = await db.query(
      'SELECT id, vendedor_id, comprador_id, estado FROM transacciones WHERE id = ?',
      [transaccion_id]
    );
    if (transaccion.length === 0)
      return res.status(404).json({ success: false, message: 'Transacción no encontrada' });

    if (transaccion[0].estado !== 'completada')
      return res.status(400).json({ success: false, message: 'Solo puedes calificar transacciones completadas' });

    // Verificar que el usuario es parte de la transacción
    const trans = transaccion[0];
    if (req.user.id !== trans.vendedor_id && req.user.id !== trans.comprador_id)
      return res.status(403).json({ success: false, message: 'No tienes permiso para calificar esta transacción' });

    // Verificar que está calificando al otro usuario
    if (parseInt(calificado_id) === req.user.id)
      return res.status(400).json({ success: false, message: 'No puedes calificar tu propia cuenta' });

    if (parseInt(calificado_id) !== trans.vendedor_id && parseInt(calificado_id) !== trans.comprador_id)
      return res.status(400).json({ success: false, message: 'El usuario calificado no es parte de esta transacción' });

    // Verificar que no haya calificado ya
    const [existing] = await db.query(
      'SELECT id FROM calificaciones WHERE calificador_id = ? AND transaccion_id = ?',
      [req.user.id, transaccion_id]
    );
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'Ya has calificado esta transacción' });

    // Insertar calificación
    await db.query(
      `INSERT INTO calificaciones (calificador_id, calificado_id, transaccion_id, calificacion, comentario, fecha_calificacion)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.user.id, calificado_id, transaccion_id, calificacion, comentario || null]
    );

    // Actualizar calificación promedio del usuario calificado
    await db.query(`
      UPDATE usuarios
      SET calificacion_promedio = (
        SELECT AVG(calificacion) FROM calificaciones WHERE calificado_id = ?
      )
      WHERE id = ?`,
      [calificado_id, calificado_id]
    );

    res.json({ success: true, message: 'Calificación enviada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Obtener calificaciones de un usuario ──
exports.getUserRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [ratings] = await db.query(
      `SELECT c.calificacion, c.comentario, c.fecha_calificacion,
              u.nombre AS calificador_nombre, t.id AS transaccion_id
       FROM calificaciones c
       JOIN usuarios u ON c.calificador_id = u.id
       JOIN transacciones t ON c.transaccion_id = t.id
       WHERE c.calificado_id = ?
       ORDER BY c.fecha_calificacion DESC
       LIMIT ? OFFSET ?`,
      [id, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM calificaciones WHERE calificado_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: ratings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};