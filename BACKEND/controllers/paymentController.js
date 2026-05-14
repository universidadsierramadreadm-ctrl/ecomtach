// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/paymentController.js
//  Gestión de comisiones y transacciones
// ══════════════════════════════════════════════════════
const db = require('../config/database');

const COMISION_ESTANDAR = 0.10; // 10%
const COMISION_VIP      = 0.06; // 6%

/* Calcular comisión según tipo de usuario */
const calcComision = (monto, esVip) =>
  esVip ? monto * COMISION_VIP : monto * COMISION_ESTANDAR;

/* POST /api/payments/transaccion — Registrar venta */
exports.createTransaction = async (req, res) => {
  try {
    const { publicacion_id, cantidad_kg, precio_kg } = req.body;

    const [pub] = await db.query(
      'SELECT p.*, u.es_vip FROM publicaciones p JOIN usuarios u ON p.vendedor_id = u.id WHERE p.id = ?',
      [publicacion_id]
    );
    if (pub.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });

    const monto_total = parseFloat(cantidad_kg) * parseFloat(precio_kg);
    const comision    = calcComision(monto_total, pub[0].es_vip);
    const monto_neto  = monto_total - comision;
    const tasa        = pub[0].es_vip ? COMISION_VIP : COMISION_ESTANDAR;

    const [result] = await db.query(
      `INSERT INTO transacciones
       (publicacion_id, vendedor_id, comprador_id, cantidad_kg, precio_kg, monto_total, comision_ecomatch, tasa_comision, monto_neto)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [publicacion_id, pub[0].vendedor_id, req.user.id,
       cantidad_kg, precio_kg, monto_total, comision, tasa, monto_neto]
    );

    // Actualizar estadísticas del vendedor
    await db.query(
      'UPDATE usuarios SET total_ventas = total_ventas + 1 WHERE id = ?',
      [pub[0].vendedor_id]
    );

    res.status(201).json({
      success: true,
      message: 'Transacción registrada',
      data: {
        id: result.insertId,
        monto_total: monto_total.toFixed(2),
        comision: comision.toFixed(2),
        tasa_porcentaje: (tasa * 100).toFixed(0) + '%',
        monto_neto: monto_neto.toFixed(2)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payments/history */
exports.getHistory = async (req, res) => {
  try {
    const campo = req.user.tipo_usuario === 'comprador' ? 'comprador_id' : 'vendedor_id';
    const [rows] = await db.query(
      `SELECT t.*, p.titulo AS producto, uc.nombre AS comprador_nombre, uv.nombre AS vendedor_nombre
       FROM transacciones t
       JOIN publicaciones p ON t.publicacion_id = p.id
       JOIN usuarios uc ON t.comprador_id = uc.id
       JOIN usuarios uv ON t.vendedor_id = uv.id
       WHERE t.${campo} = ?
       ORDER BY t.creado_en DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payments/admin/stats — Solo admin */
exports.adminStats = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) AS total_transacciones,
        SUM(monto_total) AS volumen_total,
        SUM(comision_ecomatch) AS comisiones_cobradas,
        AVG(monto_total) AS ticket_promedio,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS completadas
      FROM transacciones
    `);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};