// ══════════════════════════════════════════════════════
//  ECOMATCH — routers/authRoutes.js
// ══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const auth    = require('../controllers/authController');
const { protect } = require('./middleware');

router.post('/register',         auth.register);
router.post('/login',            auth.login);
router.get('/me',                protect, auth.getMe);
router.put('/change-password',   protect, auth.changePassword);

module.exports = router;