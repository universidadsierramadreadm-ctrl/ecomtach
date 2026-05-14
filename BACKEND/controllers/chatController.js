// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/chatController.js
// ══════════════════════════════════════════════════════
const db = require('../config/database');

exports.getConversations = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, 
        u1.nombre AS usuario1_nombre, u2.nombre AS usuario2_nombre,
        p.titulo AS producto_titulo,
        (SELECT contenido FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_mensaje,
        (SELECT creado_en FROM mensajes m WHERE m.conversacion_id = c.id ORDER BY m.creado_en DESC LIMIT 1) AS ultimo_mensaje_fecha,
        (SELECT COUNT(*) FROM mensajes m WHERE m.conversacion_id = c.id AND m.receptor_id = ? AND m.leido = 0) AS no_leidos
       FROM conversaciones c
       JOIN usuarios u1 ON c.usuario1_id = u1.id
       JOIN usuarios u2 ON c.usuario2_id = u2.id
       LEFT JOIN publicaciones p ON c.publicacion_id = p.id
       WHERE c.usuario1_id = ? OR c.usuario2_id = ?
       ORDER BY ultimo_mensaje_fecha DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversacion_id } = req.params;

    const [conv] = await db.query(
      'SELECT * FROM conversaciones WHERE id = ? AND (usuario1_id = ? OR usuario2_id = ?)',
      [conversacion_id, req.user.id, req.user.id]
    );
    if (conv.length === 0)
      return res.status(403).json({ success: false, message: 'Sin acceso a esta conversación' });

    const [msgs] = await db.query(
      `SELECT m.*, u.nombre AS emisor_nombre FROM mensajes m
       JOIN usuarios u ON m.emisor_id = u.id
       WHERE m.conversacion_id = ? ORDER BY m.creado_en ASC`,
      [conversacion_id]
    );

    // Marcar como leídos
    await db.query(
      'UPDATE mensajes SET leido = 1 WHERE conversacion_id = ? AND receptor_id = ? AND leido = 0',
      [conversacion_id, req.user.id]
    );

    res.json({ success: true, data: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { receptor_id, contenido, publicacion_id } = req.body;

    if (!receptor_id || !contenido)
      return res.status(400).json({ success: false, message: 'receptor_id y contenido son requeridos' });

    // Buscar o crear conversación
    let [conv] = await db.query(
      `SELECT id FROM conversaciones 
       WHERE (usuario1_id = ? AND usuario2_id = ?) OR (usuario1_id = ? AND usuario2_id = ?)`,
      [req.user.id, receptor_id, receptor_id, req.user.id]
    );

    let convId;
    if (conv.length === 0) {
      const [res2] = await db.query(
        'INSERT INTO conversaciones (usuario1_id, usuario2_id, publicacion_id) VALUES (?,?,?)',
        [req.user.id, receptor_id, publicacion_id || null]
      );
      convId = res2.insertId;
    } else {
      convId = conv[0].id;
    }

    const [msg] = await db.query(
      'INSERT INTO mensajes (conversacion_id, emisor_id, receptor_id, contenido) VALUES (?,?,?,?)',
      [convId, req.user.id, receptor_id, contenido]
    );

    res.status(201).json({
      success: true,
      data: { id: msg.insertId, conversacion_id: convId, contenido, creado_en: new Date() }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};