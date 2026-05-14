// ══════════════════════════════════════════════════════
//  ECOMATCH — routers/middleware.js
//  JWT protect + role check + multer upload
// ══════════════════════════════════════════════════════
const jwt     = require('jsonwebtoken');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'ecomatch_secret_2024';

/* ── JWT Middleware ── */
exports.protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'Token requerido. Inicia sesión.' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

/* ── Role Middleware ── */
exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.tipo_usuario))
    return res.status(403).json({ success: false, message: `Acceso restringido a: ${roles.join(', ')}` });
  next();
};

/* ── Multer (upload imágenes) ── */
const uploadDir = path.join(__dirname, '../../FRONTEND/assets/images/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Solo imágenes JPEG, PNG o WebP'), false);
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB