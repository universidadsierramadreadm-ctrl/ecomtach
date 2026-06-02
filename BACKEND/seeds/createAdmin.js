// ══════════════════════════════════════════════════════
//  ECOMATCH — seeds/createAdmin.js
//  Crea el usuario administrador "Shelby"
//
//  Ejecutar desde la carpeta BACKEND/:
//    node seeds/createAdmin.js
// ══════════════════════════════════════════════════════
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const db     = require('../config/database');

async function main() {
  console.log('\n🔐 ECOMATCH — Creación de usuario administrador\n');

  try {
    const hash = await bcrypt.hash('shelby', 12);

    await db.query(
      `INSERT INTO usuarios
         (nombre, email, password_hash, tipo_usuario, empresa, estado, ciudad, verificado, activo, creado_en)
       VALUES (?, ?, ?, 'admin', 'EcoMatch SLP', 'San Luis Potosí', 'Rioverde', 1, 1, NOW())
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         tipo_usuario  = 'admin',
         verificado    = 1,
         activo        = 1,
         empresa       = 'EcoMatch SLP',
         estado        = 'San Luis Potosí',
         ciudad        = 'Rioverde'`,
      ['Shelby', 'shelby@ecomatch.mx', hash]
    );

    console.log('✅ Usuario administrador creado/actualizado exitosamente\n');
    console.log('  ┌─────────────────────────────────────────┐');
    console.log('  │  Nombre:     Shelby                     │');
    console.log('  │  Email:      shelby@ecomatch.mx          │');
    console.log('  │  Contraseña: shelby                     │');
    console.log('  │  Rol:        admin                      │');
    console.log('  │  Ciudad:     Rioverde, SLP              │');
    console.log('  └─────────────────────────────────────────┘\n');
    console.log('  Ahora puedes iniciar sesión en: http://localhost:3000/login.html\n');

  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
    if (err.message.includes('ER_NO_SUCH_TABLE')) {
      console.error('   → La tabla "usuarios" no existe. Ejecuta primero el archivo database_schema.sql\n');
    }
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   → No se pudo conectar a MySQL. Verifica que el servidor de base de datos esté corriendo.\n');
    }
  } finally {
    process.exit(0);
  }
}

main();
