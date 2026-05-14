// routers/userRoutes.js
const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/userController');
const { protect, upload } = require('./middleware');
r.get('/',                 protect, ctrl.adminListUsers);
r.get('/dashboard',        protect, ctrl.getDashboard);
r.get('/profile',           protect, ctrl.getProfile);
r.get('/profile/:id',       protect, ctrl.getProfile);
r.put('/profile',          protect, upload.single('foto'), ctrl.updateProfile);
r.get('/admin/list',       protect, ctrl.adminListUsers);
module.exports = r;