// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/chatController.js
//  Gestión de chat y conversaciones
// ══════════════════════════════════════════════════════
const chatModel = require('../models/chatModel');
const db = require('../config/database');

/* GET /api/chat/conversations */
exports.getConversations = async (req, res) => {
  try {
    const conversations = await chatModel.getUserConversations(req.user.id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/chat/conversations/:id/messages */
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verificar que el usuario tiene acceso a la conversación
    const conversation = await chatModel.getById(id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversación no encontrada' });

    if (conversation.usuario1_id !== req.user.id && conversation.usuario2_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Sin acceso a esta conversación' });

    const messages = await chatModel.getMessages(id, limit);

    // Marcar mensajes como leídos
    await chatModel.markAsRead(id, req.user.id);

    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/chat/messages */
exports.sendMessage = async (req, res) => {
  try {
    const { conversacion_id, mensaje } = req.body;

    if (!conversacion_id || !mensaje)
      return res.status(400).json({ success: false, message: 'conversacion_id y mensaje son requeridos' });

    // Verificar que el usuario tiene acceso a la conversación
    const conversation = await chatModel.getById(conversacion_id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversación no encontrada' });

    if (conversation.usuario1_id !== req.user.id && conversation.usuario2_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Sin acceso a esta conversación' });

    const messageId = await chatModel.sendMessage({
      conversacion_id,
      remitente_id: req.user.id,
      mensaje
    });

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      data: { id: messageId, conversacion_id, mensaje, fecha_envio: new Date() }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/chat/conversations */
exports.createConversation = async (req, res) => {
  try {
    const { usuario2_id, publicacion_id } = req.body;

    if (!usuario2_id || !publicacion_id)
      return res.status(400).json({ success: false, message: 'usuario2_id y publicacion_id son requeridos' });

    // Verificar que la publicación existe
    const [pub] = await db.query('SELECT id, usuario_id FROM publicaciones WHERE id = ? AND activo = 1', [publicacion_id]);
    if (pub.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    // No permitir conversación consigo mismo
    if (req.user.id === usuario2_id)
      return res.status(400).json({ success: false, message: 'No puedes iniciar una conversación contigo mismo' });

    // Verificar si ya existe una conversación
    const existingConv = await chatModel.getConversationBetweenUsers(req.user.id, usuario2_id, publicacion_id);
    if (existingConv)
      return res.status(400).json({ success: false, message: 'Ya existe una conversación para esta publicación' });

    const conversationId = await chatModel.createConversation({
      usuario1_id: req.user.id,
      usuario2_id,
      publicacion_id
    });

    res.status(201).json({
      success: true,
      message: 'Conversación creada exitosamente',
      data: { id: conversationId }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/chat/conversations/:id/read */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar acceso a la conversación
    const conversation = await chatModel.getById(id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversación no encontrada' });

    if (conversation.usuario1_id !== req.user.id && conversation.usuario2_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Sin acceso a esta conversación' });

    await chatModel.markAsRead(id, req.user.id);

    res.json({ success: true, message: 'Mensajes marcados como leídos' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/chat/unread */
exports.getUnreadMessages = async (req, res) => {
  try {
    const unreadMessages = await chatModel.getUnreadMessages(req.user.id);
    res.json({ success: true, data: unreadMessages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/chat/admin/stats — Solo admin */
exports.adminStats = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const stats = await chatModel.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE /api/chat/conversations/:id — Solo admin o participantes */
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar acceso a la conversación
    const conversation = await chatModel.getById(id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversación no encontrada' });

    // Solo admin o participantes pueden eliminar
    if (req.user.tipo_usuario !== 'admin' &&
        conversation.usuario1_id !== req.user.id &&
        conversation.usuario2_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Sin permisos para eliminar esta conversación' });

    await chatModel.deleteConversation(id);

    res.json({ success: true, message: 'Conversación eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};