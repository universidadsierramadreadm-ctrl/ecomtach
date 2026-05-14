// ══════════════════════════════════════════════════════
//  ECOMATCH — routers/productRoutes.js
// ══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productController');
const { protect, requireRole, upload } = require('./middleware');

router.get('/',                   ctrl.getAll);
router.get('/my/listings',        protect, ctrl.myListings);
router.get('/:id',                ctrl.getOne);
router.post('/',                  protect, requireRole('vendedor','vip','admin'), upload.single('foto'), ctrl.create);
router.put('/:id',                protect, upload.single('foto'), ctrl.update);
router.delete('/:id',             protect, ctrl.remove);

module.exports = router;

// ══════════════════════════════════════════════════════
//  Exportar también los demás routers desde aquí para simplificar
//  (cada uno en su archivo real en producción)
// ══════════════════════════════════════════════════════