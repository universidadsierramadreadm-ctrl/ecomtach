// routers/userRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/userController');
const { protect, upload, requireRole } = require('./middleware');

r.get('/inicio',           ctrl.getInicio); // Ruta pública para página de inicio
r.get('/',                 protect, ctrl.adminListUsers);
r.get('/dashboard',        protect, ctrl.getDashboard);
r.get('/profile',           protect, ctrl.getProfile);
r.get('/profile/:id',       protect, ctrl.getProfile);
r.put('/profile',          protect, upload.single('foto'), ctrl.updateProfile);
r.delete('/profile',       protect, ctrl.deleteAccount);
r.get('/admin/list',       protect, requireRole('admin'), ctrl.adminListUsers);
r.post('/admin/create',    protect, requireRole('admin'), ctrl.adminCreateUser);
r.put('/admin/:id',        protect, requireRole('admin'), ctrl.adminUpdateUser);
r.delete('/admin/:id',     protect, requireRole('admin'), ctrl.adminDeleteUser);
r.post('/rate',            protect, ctrl.rateUser);
r.get('/ratings/:id',      protect, ctrl.getUserRatings);

module.exports = r;