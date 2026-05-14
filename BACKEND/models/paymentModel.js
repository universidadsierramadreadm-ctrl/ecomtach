// ══════════════════════════════════════════════════════
//  ECOMATCH — models/paymentModel.js
//  Modelo para operaciones de pagos/transacciones
// ══════════════════════════════════════════════════════
const db = require('../config/database');

/**
 * Crear una nueva transacción
 * @param {Object} transactionData - Datos de la transacción
 * @returns {Promise<number>} ID de la transacción creada
 */
const createTransaction = async (transactionData) => {
  try {
    const {
      publicacion_id, vendedor_id, comprador_id, plan_id,
      cantidad_kg, precio_kg, monto_neto, comision_ecomatch, tasa_comision
    } = transactionData;

    const [result] = await db.query(
      `INSERT INTO transacciones (
        publicacion_id, vendedor_id, comprador_id, plan_id,
        cantidad_kg, precio_kg, monto_neto, comision_ecomatch, tasa_comision,
        fecha_transaccion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [publicacion_id, vendedor_id, comprador_id, plan_id || 1,
       cantidad_kg, precio_kg, monto_neto, comision_ecomatch, tasa_comision]
    );

    return result.insertId;
  } catch (error) {
    throw new Error(`Error al crear transacción: ${error.message}`);
  }
};

/**
 * Obtener transacción por ID
 * @param {number} id - ID de la transacción
 * @returns {Promise<Object|null>} Transacción encontrada
 */
const getById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, p.titulo AS publicacion_titulo, u_v.nombre AS vendedor_nombre, u_c.nombre AS comprador_nombre
      FROM transacciones t
      JOIN publicaciones p ON t.publicacion_id = p.id
      JOIN usuarios u_v ON t.vendedor_id = u_v.id
      JOIN usuarios u_c ON t.comprador_id = u_c.id
      WHERE t.id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    throw new Error(`Error al obtener transacción: ${error.message}`);
  }
};

/**
 * Obtener historial de transacciones de un usuario
 * @param {number} userId - ID del usuario
 * @param {string} tipo - 'compras' o 'ventas'
 * @returns {Promise<Array>} Lista de transacciones
 */
const getHistory = async (userId, tipo = 'compras') => {
  try {
    const field = tipo === 'ventas' ? 'vendedor_id' : 'comprador_id';

    const [rows] = await db.query(`
      SELECT t.*, p.titulo AS publicacion_titulo, p.tipo_material,
             u_v.nombre AS vendedor_nombre, u_c.nombre AS comprador_nombre
      FROM transacciones t
      JOIN publicaciones p ON t.publicacion_id = p.id
      JOIN usuarios u_v ON t.vendedor_id = u_v.id
      JOIN usuarios u_c ON t.comprador_id = u_c.id
      WHERE t.${field} = ? AND t.estado = 'completada'
      ORDER BY t.fecha_transaccion DESC`,
      [userId]
    );

    return rows;
  } catch (error) {
    throw new Error(`Error al obtener historial: ${error.message}`);
  }
};

/**
 * Actualizar estado de transacción
 * @param {number} id - ID de la transacción
 * @param {string} estado - Nuevo estado
 * @returns {Promise<boolean>} True si se actualizó
 */
const updateStatus = async (id, estado) => {
  try {
    const validEstados = ['pendiente', 'completada', 'cancelada'];
    if (!validEstados.includes(estado)) {
      throw new Error('Estado inválido');
    }

    await db.query('UPDATE transacciones SET estado = ? WHERE id = ?', [estado, id]);
    return true;
  } catch (error) {
    throw new Error(`Error al actualizar estado: ${error.message}`);
  }
};

/**
 * Cancelar/reembolsar transacción
 * @param {number} id - ID de la transacción
 * @returns {Promise<boolean>} True si se canceló
 */
const cancelTransaction = async (id) => {
  try {
    await db.query('UPDATE transacciones SET estado = "cancelada" WHERE id = ? AND estado = "pendiente"', [id]);
    return true;
  } catch (error) {
    throw new Error(`Error al cancelar transacción: ${error.message}`);
  }
};

/**
 * Obtener estadísticas de pagos para admin
 * @returns {Promise<Object>} Estadísticas de pagos
 */
const getAdminStats = async () => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total_transacciones,
        SUM(monto_neto) AS volumen_total,
        AVG(monto_neto) AS ticket_promedio,
        SUM(comision_ecomatch) AS comisiones_totales,
        COUNT(CASE WHEN estado = 'completada' THEN 1 END) AS transacciones_completadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) AS transacciones_pendientes,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) AS transacciones_canceladas
      FROM transacciones
      WHERE fecha_transaccion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    return stats;
  } catch (error) {
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }
};

/**
 * Calcular comisión basada en el plan del vendedor
 * @param {number} vendedorId - ID del vendedor
 * @param {number} montoNeto - Monto neto de la transacción
 * @returns {Promise<Object>} Objeto con comision y tasa
 */
const calculateCommission = async (vendedorId, montoNeto) => {
  try {
    // Obtener plan del vendedor
    const [planRows] = await db.query(`
      SELECT p.comision_porcentaje
      FROM suscripciones_vip s
      JOIN planes_vip p ON s.plan_id = p.id
      WHERE s.usuario_id = ? AND s.activo = 1 AND s.fecha_fin > NOW()
      ORDER BY s.fecha_fin DESC LIMIT 1`,
      [vendedorId]
    );

    const tasaComision = planRows.length > 0 ? planRows[0].comision_porcentaje / 100 : 0.10; // 10% por defecto
    const comision = montoNeto * tasaComision;

    return {
      comision_ecomatch: comision,
      tasa_comision: tasaComision * 100 // porcentaje
    };
  } catch (error) {
    throw new Error(`Error al calcular comisión: ${error.message}`);
  }
};

module.exports = {
  createTransaction,
  getById,
  getHistory,
  updateStatus,
  cancelTransaction,
  getAdminStats,
  calculateCommission
};