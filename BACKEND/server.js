// ══════════════════════════════════════════════════════
//  ECOMATCH — server.js
//  Entry point del backend Node.js + Express
// ══════════════════════════════════════════════════════
const path       = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

// Routers
const authRoutes    = require('./routers/authRoutes');
const userRoutes    = require('./routers/userRoutes');
const productRoutes = require('./routers/productRoutes');
const paymentRoutes = require('./routers/paymentRoutes');
const vipRoutes     = require('./routers/vipRoutes');
const chatRoutes    = require('./routers/chatRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',  // Live Server VS Code
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    process.env.CLIENT_ORIGIN
  ].filter(Boolean),
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../FRONTEND')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' }
});
app.use('/api/', limiter);

// ── Rutas API ──
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vip',      vipRoutes);
app.use('/api/chat',     chatRoutes);

// Ruta de inicio (protegida con JWT)
const { protect } = require('./routers/middleware');
app.get('/api/inicio', protect, require('./controllers/userController').getInicio);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0', platform: 'ECOMATCH', timestamp: new Date() });
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../FRONTEND/index.html'));
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`\n🌱 ECOMATCH corriendo en http://localhost:${PORT}`);
  console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;