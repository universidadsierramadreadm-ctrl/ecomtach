// routers/paymentRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/paymentController');
const { protect } = require('./middleware');

r.post('/transaccion',    protect, ctrl.createTransaction);
r.get('/history',         protect, ctrl.getHistory);
r.put('/:id/status',      protect, ctrl.updateStatus);
r.delete('/:id',          protect, ctrl.cancelTransaction);
r.get('/admin/stats',     protect, ctrl.adminStats);

module.exports = r;