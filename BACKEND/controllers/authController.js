// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/authController.js
//  Registro, Login, Logout, Verificar token
// ══════════════════════════════════════════════════════
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const authModel = require('../models/authModel');

const JWT_SECRET  = process.env.JWT_SECRET  || 'ecomatch_jwt_secret_2024_secure_key_change_in_production_abcdef123456';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

/* ── Generar JWT ── */
const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

/* ────────────────────────────────
   POST /api/auth/register
──────────────────────────────── */
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, tipo_usuario, empresa, telefono, estado, ciudad } = req.body;

    if (!nombre || !email || !password || !tipo_usuario)
      return res.status(400).json({ success: false, message: 'Campos requeridos: nombre, email, password, tipo_usuario' });

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: 'Formato de email inválido' });

    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'La contraseña debe tener mínimo 8 caracteres' });

    // Validar tipo_usuario contra ENUM
    const tiposValidos = ['vendedor', 'comprador', 'centro', 'admin'];
    if (!tiposValidos.includes(tipo_usuario))
      return res.status(400).json({ success: false, message: 'Tipo de usuario inválido. Debe ser: vendedor, comprador, centro o admin' });

    // Verificar si email ya existe
    const emailExists = await authModel.emailExists(email);
    if (emailExists)
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const userId = await authModel.create({
      nombre,
      email,
      password_hash: hash,
      tipo_usuario,
      empresa,
      telefono,
      estado,
      ciudad
    });

    const token = signToken({ id: userId, email, tipo_usuario });

    res.status(201).json({
      success: true,
      message: '¡Cuenta creada exitosamente!',
      token,
      user: { id: userId, nombre, email, tipo_usuario }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/auth/login
──────────────────────────────── */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });

    const user = await authModel.findByEmail(email);
    if (!user)
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    if (!user.activo)
      return res.status(403).json({ success: false, message: 'Cuenta suspendida. Contacta soporte.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    await authModel.updateLastLogin(user.id);

    const token = signToken({ id: user.id, email: user.email, tipo_usuario: user.tipo_usuario });

    res.json({
      success: true,
      message: `¡Bienvenido de vuelta, ${user.nombre}!`,
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, tipo_usuario: user.tipo_usuario, es_vip: user.es_vip }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   GET /api/auth/me
──────────────────────────────── */
exports.getMe = async (req, res) => {
  try {
    const user = await authModel.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/auth/change-password
──────────────────────────────── */
exports.changePassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;

    if (!password_actual || !password_nuevo)
      return res.status(400).json({ success: false, message: 'Contraseña actual y nueva son requeridas' });

    const currentHash = await authModel.getPasswordHash(req.user.id);
    if (!currentHash)
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, currentHash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });

    if (password_nuevo.length < 8)
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener mínimo 8 caracteres' });

    const newHash = await bcrypt.hash(password_nuevo, 12);
    await authModel.updatePassword(req.user.id, newHash);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ────────────────────────────────
   POST /api/auth/logout
──────────────────────────────── */
exports.logout = async (req, res) => {
  try {
    // En una implementación completa, aquí se agregaría el token a una blacklist
    // Por ahora, solo respondemos con éxito (el cliente debe eliminar el token localmente)
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};