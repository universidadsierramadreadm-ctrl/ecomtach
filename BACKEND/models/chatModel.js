// ══════════════════════════════════════════════════════
//  ECOMATCH — models/chatModel.js
//  Modelo para operaciones de chat y conversaciones
// ══════════════════════════════════════════════════════
const db = require('../config/database');

/**
 * Crear una nueva conversación
 * @param {Object} conversationData - Datos de la conversación
 * @returns {Promise<number>} ID de la conversación creada
 */
const createConversation = async (conversationData) => {
  try {
    const { usuario1_id, usuario2_id, publicacion_id } = conversationData;

    const [result] = await db.query(
      `INSERT INTO conversaciones (
        usuario1_id, usuario2_id, publicacion_id, fecha_creacion
      ) VALUES (?, ?, ?, NOW())`,
      [usuario1_id, usuario2_id, publicacion_id]
    );

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al crear conversación: ${error.message}`);
  }
};

/**
 * Obtener conversación por ID
 * @param {number} id - ID de la conversación
 * @returns {Promise<Object|null>} Conversación encontrada
 */
const getById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, p.titulo AS publicacion_titulo,
             u1.nombre AS usuario1_nombre, u2.nombre AS usuario2_nombre
      FROM conversaciones c
      JOIN publicaciones p ON c.publicacion_id = p.id
      JOIN usuarios u1 ON c.usuario1_id = u1.id
      JOIN usuarios u2 ON c.usuario2_id = u2.id
      WHERE c.id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al obtener conversación: ${error.message}`);
  }
};

/**
 * Obtener conversación entre dos usuarios para una publicación específica
 * @param {number} user1Id - ID del primer usuario
 * @param {number} user2Id - ID del segundo usuario
 * @param {number} publicacionId - ID de la publicación
 * @returns {Promise<Object|null>} Conversación encontrada
 */
const getConversationBetweenUsers = async (user1Id, user2Id, publicacionId) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM conversaciones
      WHERE ((usuario1_id = ? AND usuario2_id = ?) OR (usuario1_id = ? AND usuario2_id = ?))
      AND publicacion_id = ?`,
      [user1Id, user2Id, user2Id, user1Id, publicacionId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al buscar conversación: ${error.message}`);
  }
};

/**
 * Obtener todas las conversaciones de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Lista de conversaciones
 */
const getUserConversations = async (userId) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*,
             p.titulo AS publicacion_titulo, p.tipo_material,
             CASE
               WHEN c.usuario1_id = ? THEN u2.nombre
               ELSE u1.nombre
             END AS otro_usuario_nombre,
             CASE
               WHEN c.usuario1_id = ? THEN u2.id
               ELSE u1.id
             END AS otro_usuario_id,
             (SELECT mensaje FROM mensajes m WHERE m.conversacion_id = c.id
              ORDER BY m.fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
             (SELECT fecha_envio FROM mensajes m WHERE m.conversacion_id = c.id
              ORDER BY m.fecha_envio DESC LIMIT 1) AS ultima_fecha
      FROM conversaciones c
      JOIN publicaciones p ON c.publicacion_id = p.id
      JOIN usuarios u1 ON c.usuario1_id = u1.id
      JOIN usuarios u2 ON c.usuario2_id = u2.id
      WHERE c.usuario1_id = ? OR c.usuario2_id = ?
      ORDER BY ultima_fecha DESC`,
      [userId, userId, userId, userId]
    );

    return rows;
  } catch (error) {
    throw new Error(`Error al obtener conversaciones: ${error.message}`);
  }
};

/**
 * Enviar un mensaje
 * @param {Object} messageData - Datos del mensaje
 * @returns {Promise<number>} ID del mensaje creado
 */
const sendMessage = async (messageData) => {
  try {
    const { conversacion_id, remitente_id, mensaje } = messageData;

    const [result] = await db.query(
      `INSERT INTO mensajes (
        conversacion_id, remitente_id, mensaje, fecha_envio
      ) VALUES (?, ?, ?, NOW())`,
      [conversacion_id, remitente_id, mensaje]
    );

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }
};

/**
 * Obtener mensajes de una conversación
 * @param {number} conversationId - ID de la conversación
 * @param {number} limit - Número máximo de mensajes (opcional)
 * @returns {Promise<Array>} Lista de mensajes
 */
const getMessages = async (conversationId, limit = 50) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, u.nombre AS remitente_nombre
      FROM mensajes m
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE m.conversacion_id = ?
      ORDER BY m.fecha_envio DESC
      LIMIT ?`,
      [conversationId, limit]
    );

    return rows.reverse(); // Más antiguos primero
  } catch (error) {
    throw new Error(`Error al obtener mensajes: ${error.message}`);
  }
};

/**
 * Marcar mensajes como leídos
 * @param {number} conversationId - ID de la conversación
 * @param {number} userId - ID del usuario que marca como leído
 * @returns {Promise<boolean>} True si se marcaron
 */
const markAsRead = async (conversationId, userId) => {
  try {
    await db.query(
      'UPDATE mensajes SET leido = 1 WHERE conversacion_id = ? AND remitente_id != ? AND leido = 0',
      [conversationId, userId]
    );
    return true;
  } catch (error) {
    throw new Error(`Error al marcar mensajes como leídos: ${error.message}`);
  }
};

/**
 * Obtener mensajes no leídos de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Lista de mensajes no leídos
 */
const getUnreadMessages = async (userId) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, c.id AS conversacion_id, u.nombre AS remitente_nombre
      FROM mensajes m
      JOIN conversaciones c ON m.conversacion_id = c.id
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE (c.usuario1_id = ? OR c.usuario2_id = ?)
      AND m.remitente_id != ? AND m.leido = 0
      ORDER BY m.fecha_envio DESC`,
      [userId, userId, userId]
    );

    return rows;
  } catch (error) {
    throw new Error(`Error al obtener mensajes no leídos: ${error.message}`);
  }
};

/**
 * Obtener estadísticas de chat para admin
 * @returns {Promise<Object>} Estadísticas de chat
 */
const getAdminStats = async () => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(DISTINCT c.id) AS total_conversaciones,
        COUNT(m.id) AS total_mensajes,
        COUNT(CASE WHEN m.leido = 0 THEN 1 END) AS mensajes_no_leidos,
        AVG(CHAR_LENGTH(m.mensaje)) AS longitud_promedio_mensajes,
        COUNT(DISTINCT CASE WHEN DATE(m.fecha_envio) = CURDATE() THEN c.id END) AS conversaciones_hoy
      FROM conversaciones c
      LEFT JOIN mensajes m ON c.id = m.conversacion_id
      WHERE c.fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    return stats;
  } catch (error) {
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
};

/**
 * Eliminar conversación (solo admin o participantes)
 * @param {number} conversationId - ID de la conversación
 * @returns {Promise<boolean>} True si se eliminó
 */
const deleteConversation = async (conversationId) => {
  try {
    // Eliminar mensajes primero (foreign key constraint)
    await db.query('DELETE FROM mensajes WHERE conversacion_id = ?', [conversationId]);
    // Eliminar conversación
    await db.query('DELETE FROM conversaciones WHERE id = ?', [conversationId]);
    return true;
  } catch (error) {
    throw new Error(`Error al eliminar conversación: ${error.message}`);
  }
};

module.exports = {
  createConversation,
  getById,
  getConversationBetweenUsers,
  getUserConversations,
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadMessages,
  getAdminStats,
  deleteConversation
};