// routers/vipRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/vipController');
const { protect } = require('./middleware');

r.get('/planes',      ctrl.getPlanes);
r.get('/status',      protect, ctrl.getStatus);
r.post('/subscribe',  protect, ctrl.subscribe);
r.post('/renew',      protect, ctrl.renew);
r.post('/cancel',     protect, ctrl.cancel);
r.get('/history',     protect, ctrl.getHistory);
r.get('/admin/stats', protect, ctrl.adminStats);

module.exports = r;