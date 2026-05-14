// ══════════════════════════════════════════════════════
//  ECOMATCH — config/database.js
//  Conexión a MySQL con pool de conexiones
// ══════════════════════════════════════════════════════
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || 'mysql',
  database:           process.env.DB_NAME     || 'ecomatch_db',
  port:               process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  timezone:           '-06:00'   // Hora de México (CST)
});

// Verificar conexión al arrancar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL conectado:', process.env.DB_NAME || 'ecomatch_db');
    conn.release();
  } catch (err) {
    console.error('❌ Error MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;