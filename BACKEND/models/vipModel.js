// ══════════════════════════════════════════════════════
//  ECOMATCH — models/vipModel.js
//  Modelo para operaciones de suscripciones VIP
// ══════════════════════════════════════════════════════
const db = require('../config/database');

/**
 * Obtener todos los planes VIP disponibles
 * @returns {Promise<Array>} Lista de planes VIP
 */
const getAllPlans = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM planes_vip ORDER BY precio_mensual ASC');
    return rows;
  } catch (error) {
    throw new Error(`Error al obtener planes VIP: ${error.message}`);
  }
};

/**
 * Obtener plan VIP por ID
 * @param {number} id - ID del plan
 * @returns {Promise<Object|null>} Plan encontrado
 */
const getPlanById = async (id) => {
  try {
    const [rows] = await db.query('SELECT * FROM planes_vip WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al obtener plan VIP: ${error.message}`);
  }
};

/**
 * Crear nueva suscripción VIP
 * @param {Object} subscriptionData - Datos de la suscripción
 * @returns {Promise<number>} ID de la suscripción creada
 */
const createSubscription = async (subscriptionData) => {
  try {
    const { usuario_id, plan_id, metodo_pago } = subscriptionData;

    // Verificar que el plan existe
    const plan = await getPlanById(plan_id);
    if (!plan) {
      throw new Error('Plan VIP no encontrado');
    }

    // Verificar que el usuario no tenga ya una suscripción activa
    const [existing] = await db.query(
      'SELECT id FROM suscripciones_vip WHERE usuario_id = ? AND activo = 1 AND fecha_fin > NOW()',
      [usuario_id]
    );
    if (existing.length > 0) {
      throw new Error('El usuario ya tiene una suscripción VIP activa');
    }

    // Calcular fechas
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setMonth(fechaFin.getMonth() + 1); // 1 mes por defecto

    const [result] = await db.query(
      `INSERT INTO suscripciones_vip (
        usuario_id, plan_id, fecha_inicio, fecha_fin, metodo_pago, activo
      ) VALUES (?, ?, ?, ?, ?, 1)`,
      [usuario_id, plan_id, fechaInicio, fechaFin, metodo_pago]
    );

    // Actualizar estado VIP del usuario
    await db.query('UPDATE usuarios SET es_vip = 1 WHERE id = ?', [usuario_id]);

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al crear suscripción VIP: ${error.message}`);
  }
};

/**
 * Obtener suscripción activa de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object|null>} Suscripción activa
 */
const getActiveSubscription = async (usuarioId) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, p.nombre AS plan_nombre, p.precio_mensual, p.comision_porcentaje
      FROM suscripciones_vip s
      JOIN planes_vip p ON s.plan_id = p.id
      WHERE s.usuario_id = ? AND s.activo = 1 AND s.fecha_fin > NOW()
      ORDER BY s.fecha_fin DESC LIMIT 1`,
      [usuarioId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al obtener suscripción activa: ${error.message}`);
  }
};

/**
 * Obtener historial de suscripciones de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Historial de suscripciones
 */
const getSubscriptionHistory = async (usuarioId) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, p.nombre AS plan_nombre, p.precio_mensual, p.comision_porcentaje
      FROM suscripciones_vip s
      JOIN planes_vip p ON s.plan_id = p.id
      WHERE s.usuario_id = ?
      ORDER BY s.fecha_inicio DESC`,
      [usuarioId]
    );
    return rows;
  } catch (error) {
    throw new Error(`Error al obtener historial de suscripciones: ${error.message}`);
  }
};

/**
 * Renovar suscripción VIP
 * @param {number} subscriptionId - ID de la suscripción
 * @returns {Promise<boolean>} True si se renovó
 */
const renewSubscription = async (subscriptionId) => {
  try {
    // Obtener suscripción actual
    const [rows] = await db.query('SELECT * FROM suscripciones_vip WHERE id = ?', [subscriptionId]);
    if (rows.length === 0) {
      throw new Error('Suscripción no encontrada');
    }

    const subscription = rows[0];
    if (!subscription.activo) {
      throw new Error('La suscripción no está activa');
    }

    // Extender fecha_fin por un mes
    const nuevaFechaFin = new Date(subscription.fecha_fin);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);

    await db.query(
      'UPDATE suscripciones_vip SET fecha_fin = ?, fecha_renovacion = NOW() WHERE id = ?',
      [nuevaFechaFin, subscriptionId]
    );

    return true;
  } catch (error) {
    throw new Error(`Error al renovar suscripción: ${error.message}`);
  }
};

/**
 * Cancelar suscripción VIP
 * @param {number} subscriptionId - ID de la suscripción
 * @returns {Promise<boolean>} True si se canceló
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    // Obtener suscripción
    const [rows] = await db.query('SELECT * FROM suscripciones_vip WHERE id = ?', [subscriptionId]);
    if (rows.length === 0) {
      throw new Error('Suscripción no encontrada');
    }

    const subscription = rows[0];
    if (!subscription.activo) {
      throw new Error('La suscripción ya está cancelada');
    }

    // Cancelar suscripción
    await db.query('UPDATE suscripciones_vip SET activo = 0 WHERE id = ?', [subscriptionId]);

    // Verificar si el usuario tiene otras suscripciones activas
    const [activeSubs] = await db.query(
      'SELECT id FROM suscripciones_vip WHERE usuario_id = ? AND activo = 1 AND fecha_fin > NOW()',
      [subscription.usuario_id]
    );

    // Si no tiene suscripciones activas, quitar estado VIP
    if (activeSubs.length === 0) {
      await db.query('UPDATE usuarios SET es_vip = 0 WHERE id = ?', [subscription.usuario_id]);
    }

    return true;
  } catch (error) {
    throw new Error(`Error al cancelar suscripción: ${error.message}`);
  }
};

/**
 * Obtener estadísticas de VIP para admin
 * @returns {Promise<Object>} Estadísticas VIP
 */
const getAdminStats = async () => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(DISTINCT s.usuario_id) AS total_usuarios_vip,
        COUNT(s.id) AS total_suscripciones,
        COUNT(CASE WHEN s.activo = 1 AND s.fecha_fin > NOW() THEN 1 END) AS suscripciones_activas,
        COUNT(CASE WHEN s.activo = 0 THEN 1 END) AS suscripciones_canceladas,
        AVG(p.precio_mensual) AS ingreso_promedio_mensual,
        SUM(p.precio_mensual) AS ingreso_total_mensual
      FROM suscripciones_vip s
      JOIN planes_vip p ON s.plan_id = p.id
      WHERE s.fecha_inicio >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    return stats;
  } catch (error) {
    throw new Error(`Error al obtener estadísticas VIP: ${error.message}`);
  }
};

/**
 * Verificar y actualizar estado VIP de usuarios expirados
 * @returns {Promise<number>} Número de usuarios actualizados
 */
const updateExpiredSubscriptions = async () => {
  try {
    // Obtener usuarios con suscripciones expiradas
    const [expired] = await db.query(`
      SELECT DISTINCT usuario_id
      FROM suscripciones_vip
      WHERE activo = 1 AND fecha_fin <= NOW()
    `);

    if (expired.length > 0) {
      const userIds = expired.map(row => row.usuario_id);

      // Desactivar suscripciones expiradas
      await db.query(
        'UPDATE suscripciones_vip SET activo = 0 WHERE activo = 1 AND fecha_fin <= NOW()'
      );

      // Quitar estado VIP a usuarios sin suscripciones activas
      await db.query(`
        UPDATE usuarios
        SET es_vip = 0
        WHERE id IN (?) AND id NOT IN (
          SELECT DISTINCT usuario_id
          FROM suscripciones_vip
          WHERE activo = 1 AND fecha_fin > NOW()
        )`,
        [userIds]
      );

      return expired.length;
    }

    return 0;
  } catch (error) {
    throw new Error(`Error al actualizar suscripciones expiradas: ${error.message}`);
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createSubscription,
  getActiveSubscription,
  getSubscriptionHistory,
  renewSubscription,
  cancelSubscription,
  getAdminStats,
  updateExpiredSubscriptions
};