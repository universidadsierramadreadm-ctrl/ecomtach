// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/vipController.js
//  Gestión de suscripciones VIP
// ══════════════════════════════════════════════════════
const vipModel = require('../models/vipModel');
const db = require('../config/database');

/* GET /api/vip/planes */
exports.getPlanes = async (req, res) => {
  try {
    const planes = await vipModel.getAllPlans();
    res.json({ success: true, data: planes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/vip/status */
exports.getStatus = async (req, res) => {
  try {
    const subscription = await vipModel.getActiveSubscription(req.user.id);
    res.json({
      success: true,
      es_vip: subscription !== null,
      suscripcion: subscription
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/vip/subscribe */
exports.subscribe = async (req, res) => {
  try {
    const { plan_id, metodo_pago } = req.body;

    if (!plan_id)
      return res.status(400).json({ success: false, message: 'Campo plan_id requerido' });

    if (!metodo_pago)
      return res.status(400).json({ success: false, message: 'Campo metodo_pago requerido' });

    // En producción aquí se integraría la pasarela de pago (Conekta, Stripe, etc.)
    // Por ahora, asumimos que el pago fue exitoso

    const subscriptionId = await vipModel.createSubscription({
      usuario_id: req.user.id,
      plan_id,
      metodo_pago
    });

    // Obtener la suscripción creada para devolver información
    const subscription = await vipModel.getActiveSubscription(req.user.id);

    res.status(201).json({
      success: true,
      message: '¡Suscripción VIP activada exitosamente!',
      data: {
        id: subscriptionId,
        plan: subscription.plan_nombre,
        precio_mensual: subscription.precio_mensual,
        fecha_fin: subscription.fecha_fin,
        comision_porcentaje: subscription.comision_porcentaje
      }
    });
  } catch (err) {
    if (err.message.includes('ya tiene una suscripción VIP activa')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/vip/cancel */
exports.cancel = async (req, res) => {
  try {
    const subscription = await vipModel.getActiveSubscription(req.user.id);
    if (!subscription)
      return res.status(404).json({ success: false, message: 'No tienes una suscripción VIP activa' });

    await vipModel.cancelSubscription(subscription.id);

    res.json({
      success: true,
      message: 'Suscripción VIP cancelada. Mantendrás los beneficios hasta el fin del período actual.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/vip/renew */
exports.renew = async (req, res) => {
  try {
    const subscription = await vipModel.getActiveSubscription(req.user.id);
    if (!subscription)
      return res.status(404).json({ success: false, message: 'No tienes una suscripción VIP activa para renovar' });

    // En producción aquí se procesaría el pago de renovación
    await vipModel.renewSubscription(subscription.id);

    // Obtener la suscripción renovada
    const renewedSubscription = await vipModel.getActiveSubscription(req.user.id);

    res.json({
      success: true,
      message: 'Suscripción VIP renovada exitosamente',
      data: {
        fecha_fin: renewedSubscription.fecha_fin,
        precio_mensual: renewedSubscription.precio_mensual
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/vip/history */
exports.getHistory = async (req, res) => {
  try {
    const history = await vipModel.getSubscriptionHistory(req.user.id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/vip/admin/stats — Solo admin */
exports.adminStats = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const stats = await vipModel.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};