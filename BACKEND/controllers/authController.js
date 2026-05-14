// ══════════════════════════════════════════════════════
//  ECOMATCH — controllers/authController.js
//  Registro, Login, Logout, Verificar token
// ══════════════════════════════════════════════════════
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');

const JWT_SECRET  = process.env.JWT_SECRET  || 'ecomatch_secret_2024';
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

    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'La contraseña debe tener mínimo 8 caracteres' });

    const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, tipo_usuario, empresa, telefono, estado, ciudad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, email, hash, tipo_usuario, empresa || null, telefono || null, estado || null, ciudad || null]
    );

    const token = signToken({ id: result.insertId, email, tipo_usuario });

    res.status(201).json({
      success: true,
      message: '¡Cuenta creada exitosamente!',
      token,
      user: { id: result.insertId, nombre, email, tipo_usuario }
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

    const [rows] = await db.query(
      'SELECT id, nombre, email, password_hash, tipo_usuario, es_vip, activo FROM usuarios WHERE email = ?',
      [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    const user = rows[0];
    if (!user.activo)
      return res.status(403).json({ success: false, message: 'Cuenta suspendida. Contacta soporte.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });

    await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

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
    const [rows] = await db.query(
      'SELECT id, nombre, email, tipo_usuario, empresa, telefono, estado, ciudad, es_vip, creado_en FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, user: rows[0] });
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
    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });

    if (password_nuevo.length < 8)
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener mínimo 8 caracteres' });

    const hash = await bcrypt.hash(password_nuevo, 12);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};