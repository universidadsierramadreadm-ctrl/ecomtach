// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/vipController.js
//  Gestión de suscripciones VIP
// ══════════════════════════════════════════════════════
const db = require('../config/database');

const PLANES = {
  mensual:   { precio: 499,  meses: 1,  label: 'VIP Mensual' },
  trimestral:{ precio: 1299, meses: 3,  label: 'VIP Trimestral' },
  anual:     { precio: 4788, meses: 12, label: 'VIP Anual' }
};

/* GET /api/vip/planes */
exports.getPlanes = async (req, res) => {
  res.json({ success: true, data: PLANES });
};

/* GET /api/vip/status */
exports.getStatus = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, p.nombre AS plan_nombre 
       FROM suscripciones s JOIN planes_vip p ON s.plan_id = p.id
       WHERE s.usuario_id = ? AND s.activa = 1 AND s.fecha_fin > NOW()
       ORDER BY s.fecha_fin DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({
      success: true,
      es_vip: rows.length > 0,
      suscripcion: rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/vip/subscribe */
exports.subscribe = async (req, res) => {
  try {
    const { tipo_plan } = req.body;
    const plan = PLANES[tipo_plan];
    if (!plan)
      return res.status(400).json({ success: false, message: 'Tipo de plan inválido' });

    // En producción aquí se integraría la pasarela de pago (Stripe, Conekta, etc.)
    const [planRow] = await db.query('SELECT id FROM planes_vip WHERE tipo = ?', [tipo_plan]);
    if (!planRow.length)
      return res.status(404).json({ success: false, message: 'Plan no configurado en BD' });

    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + plan.meses);

    // Desactivar suscripciones previas
    await db.query('UPDATE suscripciones SET activa = 0 WHERE usuario_id = ?', [req.user.id]);

    await db.query(
      `INSERT INTO suscripciones (usuario_id, plan_id, fecha_inicio, fecha_fin, monto_pagado, activa)
       VALUES (?,?,?,?,?,1)`,
      [req.user.id, planRow[0].id, fechaInicio, fechaFin, plan.precio]
    );

    // Marcar usuario como VIP
    await db.query('UPDATE usuarios SET es_vip = 1, tipo_usuario = "vip" WHERE id = ?', [req.user.id]);

    res.status(201).json({
      success: true,
      message: `¡Suscripción ${plan.label} activada exitosamente!`,
      data: { plan: plan.label, fecha_fin: fechaFin, precio: plan.precio }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/vip/cancel */
exports.cancel = async (req, res) => {
  try {
    await db.query(
      'UPDATE suscripciones SET activa = 0 WHERE usuario_id = ? AND activa = 1',
      [req.user.id]
    );
    await db.query(
      'UPDATE usuarios SET es_vip = 0, tipo_usuario = "vendedor" WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, message: 'Suscripción VIP cancelada. Acceso hasta fin del período.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};