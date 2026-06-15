// db/reset_passwords.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblia_buscador',
    charset: 'utf8mb4'
  });

  try {
    console.log('⏳ Restableciendo contraseñas de demostración con hashes correctos...');
    
    // Generar hashes dinámicamente con bcryptjs
    const adminHash = await bcrypt.hash('admin123', 10);
    const juanHash = await bcrypt.hash('juan123', 10);
    const mariaHash = await bcrypt.hash('maria123', 10);

    // Limpiar usuarios antiguos
    await connection.query('DELETE FROM users WHERE id IN (1, 2, 3)');
    
    // Insertar usuarios con hashes correctos
    await connection.query(`
      INSERT INTO users (id, name, email, password, role, default_version_id) VALUES
      (1, 'Administrador', 'admin@biblia.com', ?, 'admin', 1),
      (2, 'Juan Lector', 'juan@biblia.com', ?, 'user', 1),
      (3, 'María Lectora', 'maria@biblia.com', ?, 'user', 2)
    `, [adminHash, juanHash, mariaHash]);

    console.log('✅ Contraseñas de demostración restablecidas con éxito.');
  } catch (error) {
    console.error('❌ Error al restablecer contraseñas:', error.message);
  } finally {
    await connection.end();
  }
}

main();
