// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/paymentController.js
//  Gestión de comisiones y transacciones
// ══════════════════════════════════════════════════════
const paymentModel = require('../models/paymentModel');
const db = require('../config/database');

/* POST /api/payments/transaccion — Registrar venta */
exports.createTransaction = async (req, res) => {
  try {
    const { publicacion_id, cantidad_kg, precio_kg } = req.body;

    if (!publicacion_id || !cantidad_kg || !precio_kg)
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos: publicacion_id, cantidad_kg, precio_kg' });

    // Validar valores numéricos
    const cantidad = parseFloat(cantidad_kg);
    const precio = parseFloat(precio_kg);

    if (cantidad <= 0 || precio <= 0)
      return res.status(400).json({ success: false, message: 'Cantidad y precio deben ser valores positivos' });

    // Obtener publicación y verificar que existe
    const [pubRows] = await db.query(
      'SELECT p.*, u.es_vip FROM publicaciones p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ? AND p.activo = 1',
      [publicacion_id]
    );
    if (pubRows.length === 0)
      return res.status(404).json({ success: false, message: 'Publicación no encontrada o inactiva' });

    const publicacion = pubRows[0];

    // Verificar que el usuario no compre su propia publicación
    if (publicacion.usuario_id === req.user.id)
      return res.status(400).json({ success: false, message: 'No puedes comprar tu propia publicación' });

    // Verificar stock disponible
    if (cantidad > parseFloat(publicacion.cantidad))
      return res.status(400).json({ success: false, message: 'Cantidad solicitada excede el stock disponible' });

    const montoNeto = cantidad * precio;

    // Calcular comisión basada en el plan del vendedor
    const { comision_ecomatch, tasa_comision } = await paymentModel.calculateCommission(publicacion.usuario_id, montoNeto);

    // Crear transacción
    const transactionId = await paymentModel.createTransaction({
      publicacion_id,
      vendedor_id: publicacion.usuario_id,
      comprador_id: req.user.id,
      plan_id: publicacion.es_vip ? 2 : 1, // 1=estándar, 2=VIP
      cantidad_kg: cantidad,
      precio_kg: precio,
      monto_neto: montoNeto,
      comision_ecomatch,
      tasa_comision
    });

    // Actualizar estadísticas del vendedor
    await db.query(
      'UPDATE usuarios SET total_ventas = total_ventas + 1 WHERE id = ?',
      [publicacion.usuario_id]
    );

    // Reducir stock de la publicación
    await db.query(
      'UPDATE publicaciones SET cantidad = cantidad - ? WHERE id = ?',
      [cantidad, publicacion_id]
    );

    res.status(201).json({
      success: true,
      message: 'Transacción registrada exitosamente',
      data: {
        id: transactionId,
        monto_neto: montoNeto.toFixed(2),
        comision_ecomatch: comision_ecomatch.toFixed(2),
        tasa_comision: tasa_comision.toFixed(2) + '%'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payments/history */
exports.getHistory = async (req, res) => {
  try {
    const tipo = req.query.tipo || (req.user.tipo_usuario === 'comprador' ? 'compras' : 'ventas');
    const history = await paymentModel.getHistory(req.user.id, tipo);

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/payments/admin/stats — Solo admin */
exports.adminStats = async (req, res) => {
  try {
    if (req.user.tipo_usuario !== 'admin')
      return res.status(403).json({ success: false, message: 'Acceso denegado' });

    const stats = await paymentModel.getAdminStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/payments/:id/status — Actualizar estado de transacción */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado)
      return res.status(400).json({ success: false, message: 'Campo estado requerido' });

    // Verificar que la transacción existe y pertenece al usuario (solo admin puede cambiar cualquier transacción)
    const transaction = await paymentModel.getById(id);
    if (!transaction)
      return res.status(404).json({ success: false, message: 'Transacción no encontrada' });

    if (req.user.tipo_usuario !== 'admin' && transaction.vendedor_id !== req.user.id && transaction.comprador_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permisos para modificar esta transacción' });

    await paymentModel.updateStatus(id, estado);

    res.json({ success: true, message: 'Estado de transacción actualizado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE /api/payments/:id — Cancelar transacción */
exports.cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la transacción existe y pertenece al usuario
    const transaction = await paymentModel.getById(id);
    if (!transaction)
      return res.status(404).json({ success: false, message: 'Transacción no encontrada' });

    if (req.user.tipo_usuario !== 'admin' && transaction.vendedor_id !== req.user.id && transaction.comprador_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'No tienes permisos para cancelar esta transacción' });

    if (transaction.estado !== 'pendiente')
      return res.status(400).json({ success: false, message: 'Solo se pueden cancelar transacciones pendientes' });

    await paymentModel.cancelTransaction(id);

    // Restaurar stock de la publicación
    await db.query(
      'UPDATE publicaciones SET cantidad = cantidad + ? WHERE id = ?',
      [transaction.cantidad_kg, transaction.publicacion_id]
    );

    res.json({ success: true, message: 'Transacción cancelada exitosamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};