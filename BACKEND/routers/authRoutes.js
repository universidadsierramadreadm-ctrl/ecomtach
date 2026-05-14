// ══════════════════════════════════════════════════════
//  ECOMATCH — routers/authRoutes.js
// ══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const auth    = require('../controllers/authController');
const { protect, authLimiter } = require('./middleware');

router.post('/register',         authLimiter, auth.register);
router.post('/login',            authLimiter, auth.login);
router.post('/logout',           protect, auth.logout);
router.get('/me',                protect, auth.getMe);
router.put('/change-password',   protect, auth.changePassword);

module.exports = router;